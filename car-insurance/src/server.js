const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const QRCode = require('qrcode');
const { Store } = require('./store');
const { MockGateway } = require('./payment');
const { renderPolicyPdf } = require('./policyPdf');
const { validateOrderDetails } = require('./validation');
const premium = require('./premium');

const QUOTE_TTL_MS = 30 * 60_000;

const newId = (prefix, bytes = 9) => `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
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

function createApp({ dataFile, enableMockGateway = true } = {}) {
  const store = new Store(dataFile);
  const app = express();
  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

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

  function loadOrder(req, res) {
    const order = store.get('orders', req.params.id);
    const token = req.get('x-order-token') || req.query.token;
    if (!order || !safeEqual(order.accessToken, token)) {
      res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
      return null;
    }
    return order;
  }

  app.get('/api/options', (req, res) => {
    const pick = (obj) => Object.entries(obj).map(([value, o]) => ({ value, label: o.label }));
    res.json({
      vehicleTypes: pick(premium.VEHICLE_TYPES),
      regions: pick(premium.REGIONS),
      garages: pick(premium.GARAGES),
      deductibles: Object.keys(premium.DEDUCTIBLES).map(Number),
    });
  });

  // 1) เช็คเบี้ย
  app.post('/api/quotes', (req, res) => {
    let result;
    try {
      result = premium.calculatePlans(req.body || {});
    } catch (err) {
      if (err instanceof premium.QuoteError) return res.status(400).json({ error: err.message });
      throw err;
    }
    if (!result.plans.length) {
      return res.status(400).json({ error: 'ไม่มีแผนประกันที่รองรับรถคันนี้' });
    }
    const quote = {
      id: newId('qt'),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
      ...result,
    };
    store.put('quotes', quote.id, quote);
    res.status(201).json({ quoteId: quote.id, expiresAt: quote.expiresAt, plans: quote.plans, cmi: quote.cmi });
  });

  // 2) สร้างคำสั่งซื้อ — ราคาดึงจาก quote ที่เก็บฝั่งเซิร์ฟเวอร์ ไม่เชื่อราคาจาก client
  app.post('/api/orders', (req, res) => {
    const body = req.body || {};
    const quote = store.get('quotes', String(body.quoteId || ''));
    if (!quote) return res.status(400).json({ error: 'ไม่พบใบเสนอราคา กรุณาเช็คเบี้ยใหม่' });
    if (new Date(quote.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'ใบเสนอราคาหมดอายุ กรุณาเช็คเบี้ยใหม่' });
    }
    const plan = quote.plans.find((p) => p.code === body.planCode);
    if (!plan) return res.status(400).json({ error: 'กรุณาเลือกแผนประกัน' });

    const { errors, holder, vehicle, startDate } = validateOrderDetails(body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

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
    res.status(201).json({ ...publicOrder(order), accessToken: order.accessToken });
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = loadOrder(req, res);
    if (order) res.json(publicOrder(order));
  });

  // 3) ชำระเงิน
  app.post('/api/orders/:id/pay', async (req, res) => {
    const order = loadOrder(req, res);
    if (!order) return;
    if (order.status === 'paid') return res.status(409).json({ error: 'คำสั่งซื้อนี้ชำระเงินแล้ว' });

    const { method, cardToken } = req.body || {};
    const { charge, error } = gateway.createCharge({
      orderId: order.id,
      amountSatang: order.amount,
      method,
      tokenId: cardToken,
      ref1: order.id.slice(-12).toUpperCase(),
    });
    if (error) return res.status(400).json({ error });

    if (method === 'card') {
      const updated = handleChargeResult(charge);
      if (charge.status !== 'successful') {
        return res.status(402).json({ error: charge.failureMessage, order: publicOrder(updated) });
      }
      return res.json({ order: publicOrder(updated) });
    }

    const qrImage = await QRCode.toDataURL(charge.qrPayload, { margin: 1, width: 260 });
    res.json({
      order: publicOrder(order),
      charge: { id: charge.id, status: charge.status, expiresAt: charge.expiresAt, qrPayload: charge.qrPayload, qrImage },
    });
  });

  // 4) ดาวน์โหลดกรมธรรม์ PDF
  app.get('/api/orders/:id/policy.pdf', (req, res) => {
    const order = loadOrder(req, res);
    if (!order) return;
    if (order.status !== 'paid') return res.status(409).json({ error: 'ยังไม่ได้ชำระเงิน' });
    res.setHeader('Content-Type', 'application/pdf');
    const download = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${download}; filename="${order.policy.number}.pdf"`);
    renderPolicyPdf(order).pipe(res);
  });

  // --- endpoints ของ gateway จำลอง (ของจริงจะอยู่ที่ผู้ให้บริการชำระเงิน) ---
  if (enableMockGateway) {
    app.post('/mock-gateway/tokens', (req, res) => {
      const result = gateway.createToken(req.body || {});
      if (result.error) return res.status(400).json(result);
      res.status(201).json(result);
    });

    app.post('/mock-gateway/charges/:id/simulate-paid', (req, res) => {
      const result = gateway.simulatePromptPayPaid(req.params.id);
      if (result.error) return res.status(404).json(result);
      res.json({ status: result.charge.status });
    });
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ endpoint' }));

  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON ไม่ถูกต้อง' });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp({
    dataFile: process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json'),
    enableMockGateway: process.env.ENABLE_MOCK_GATEWAY !== 'false',
  });
  app.listen(port, () => console.log(`ระบบประกันรถยนต์พร้อมใช้งานที่ http://localhost:${port}`));
}

module.exports = { createApp };
