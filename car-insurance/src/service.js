// ตรรกะหลักของระบบ (ไม่ผูกกับ Express) — ใช้ร่วมกันทั้งเซิร์ฟเวอร์จริง (server.js)
// และเวอร์ชันเดโมที่รันในเบราว์เซอร์ (demo/)
// ทุกฟังก์ชันคืนค่า { status, body } แบบเดียวกับ HTTP response
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { MockGateway } = require('./payment');
const { validateOrderDetails } = require('./validation');
const premium = require('./premium');
const { CATALOG } = require('./catalog');

const QUOTE_TTL_MS = 30 * 60_000;

const newId = (prefix, bytes = 9) => `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a || ''));
  const y = new TextEncoder().encode(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    amount: order.amount,
    planName: order.plan.name,
    includeCmi: Boolean(order.cmi),
    payment: order.payment
      ? { method: order.payment.method, card: order.payment.card, paidAt: order.payment.paidAt }
      : null,
    policyNumber: order.policy?.number ?? null,
    lastError: order.lastError ?? null,
  };
}

const ok = (body, status = 200) => ({ status, body });
const fail = (status, error, extra = {}) => ({ status, body: { error, ...extra } });

function createService(store) {
  // ออกกรมธรรม์เมื่อได้รับผลชำระเงินสำเร็จ (เรียกจากทั้ง card และ webhook ของ PromptPay)
  // ทำแบบ idempotent: ถ้าออกกรมธรรม์ไปแล้วจะไม่ออกซ้ำ
  function handleChargeResult(charge) {
    const order = store.get('orders', charge.orderId);
    if (!order || order.status === 'paid') return order;
    if (charge.status === 'successful') {
      if (charge.amount !== order.amount) {
        order.lastError = 'ยอดชำระไม่ตรงกับคำสั่งซื้อ';
        return store.put('orders', order.id, order);
      }
      order.status = 'paid';
      order.payment = {
        chargeId: charge.id,
        method: charge.method,
        card: charge.card,
        paidAt: charge.paidAt,
      };
      order.policy = {
        number: store.nextPolicyNumber(),
        issuedAt: new Date().toISOString(),
      };
      order.lastError = null;
    } else if (charge.status === 'failed' || charge.status === 'expired') {
      order.lastError = charge.failureMessage || 'การชำระเงินไม่สำเร็จ';
    }
    return store.put('orders', order.id, order);
  }

  const gateway = new MockGateway(store, { onChargeCompleted: handleChargeResult });

  function findOrder(id, token) {
    const order = store.get('orders', String(id || ''));
    return order && safeEqual(order.accessToken, token) ? order : null;
  }

  return {
    options() {
      const pick = (obj) => Object.entries(obj).map(([value, o]) => ({ value, label: o.label }));
      return ok({
        vehicleTypes: pick(premium.VEHICLE_TYPES),
        regions: pick(premium.REGIONS),
        garages: pick(premium.GARAGES),
        catalog: CATALOG,
        deductibles: Object.keys(premium.DEDUCTIBLES).map(Number),
      });
    },

    // 1) เช็คเบี้ย
    createQuote(body = {}) {
      let result;
      try {
        result = premium.calculatePlans(body);
      } catch (err) {
        if (err instanceof premium.QuoteError) return fail(400, err.message);
        throw err;
      }
      if (!result.plans.length) return fail(400, 'ไม่มีแผนประกันที่รองรับรถคันนี้');
      const quote = {
        id: newId('qt'),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
        ...result,
      };
      store.put('quotes', quote.id, quote);
      return ok({ quoteId: quote.id, expiresAt: quote.expiresAt, plans: quote.plans, cmi: quote.cmi }, 201);
    },

    // 2) สร้างคำสั่งซื้อ — ราคาดึงจาก quote ที่เก็บฝั่งเซิร์ฟเวอร์ ไม่เชื่อราคาจาก client
    createOrder(body = {}) {
      const quote = store.get('quotes', String(body.quoteId || ''));
      if (!quote) return fail(400, 'ไม่พบใบเสนอราคา กรุณาเช็คเบี้ยใหม่');
      if (new Date(quote.expiresAt) < new Date()) return fail(400, 'ใบเสนอราคาหมดอายุ กรุณาเช็คเบี้ยใหม่');
      const plan = quote.plans.find((p) => p.code === body.planCode);
      if (!plan) return fail(400, 'กรุณาเลือกแผนประกัน');

      const { errors, holder, vehicle, startDate } = validateOrderDetails(body);
      if (errors.length) return fail(400, errors.join(', '));

      const cmi = body.includeCmi ? quote.cmi : null;
      const order = {
        id: newId('ord'),
        accessToken: crypto.randomBytes(24).toString('hex'),
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        quoteId: quote.id,
        quoteInput: quote.input,
        plan,
        cmi,
        amount: plan.premium.total + (cmi ? cmi.total : 0),
        holder,
        vehicle,
        startDate,
      };
      store.put('orders', order.id, order);
      return ok({ ...publicOrder(order), accessToken: order.accessToken }, 201);
    },

    getOrder(id, token) {
      const order = findOrder(id, token);
      return order ? ok(publicOrder(order)) : fail(404, 'ไม่พบคำสั่งซื้อ');
    },

    // 3) ชำระเงิน
    async pay(id, token, body = {}) {
      const order = findOrder(id, token);
      if (!order) return fail(404, 'ไม่พบคำสั่งซื้อ');
      if (order.status === 'paid') return fail(409, 'คำสั่งซื้อนี้ชำระเงินแล้ว');

      const { method, cardToken } = body;
      const { charge, error } = gateway.createCharge({
        orderId: order.id,
        amountSatang: order.amount,
        method,
        tokenId: cardToken,
        ref1: order.id.slice(-12).toUpperCase(),
      });
      if (error) return fail(400, error);

      if (method === 'card') {
        const updated = handleChargeResult(charge);
        if (charge.status !== 'successful') {
          return fail(402, charge.failureMessage, { order: publicOrder(updated) });
        }
        return ok({ order: publicOrder(updated) });
      }

      const qrImage = await QRCode.toDataURL(charge.qrPayload, { margin: 1, width: 260 });
      return ok({
        order: publicOrder(order),
        charge: { id: charge.id, status: charge.status, expiresAt: charge.expiresAt, qrPayload: charge.qrPayload, qrImage },
      });
    },

    // 4) ข้อมูลสำหรับสร้าง PDF กรมธรรม์ (เฉพาะคำสั่งซื้อที่ชำระแล้ว)
    paidOrder(id, token) {
      const order = findOrder(id, token);
      if (!order) return fail(404, 'ไม่พบคำสั่งซื้อ');
      if (order.status !== 'paid') return fail(409, 'ยังไม่ได้ชำระเงิน');
      return ok(order);
    },

    // --- gateway จำลอง (ของจริงจะอยู่ที่ผู้ให้บริการชำระเงิน) ---
    gatewayCreateToken(body = {}) {
      const result = gateway.createToken(body);
      return result.error ? fail(400, result.error) : ok(result, 201);
    },

    gatewaySimulatePaid(chargeId) {
      const result = gateway.simulatePromptPayPaid(chargeId);
      return result.error ? fail(404, result.error) : ok({ status: result.charge.status });
    },
  };
}

module.exports = { createService };
