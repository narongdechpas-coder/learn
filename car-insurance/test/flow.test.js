const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/server');

let server;
let baseUrl;

test.before(async () => {
  server = createApp({}).listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-order-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, type, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
}

const quoteBody = {
  brand: 'Honda', model: 'City', year: new Date().getFullYear() - 1, sumInsured: 600000,
  coverageClass: '1', repair: 'dealer', driverAge: 30, addons: ['phyd', 'flood'], withCmi: true,
};

async function createOrder(extra = {}) {
  const q = await call('/api/quotes', { method: 'POST', body: quoteBody });
  assert.equal(q.status, 201, JSON.stringify(q.body));
  const o = await call('/api/orders', {
    method: 'POST',
    body: {
      quoteId: q.body.quoteId,
      startDate: new Date().toISOString().slice(0, 10),
      holder: { title: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', idCard: '1-1017-00230-70-8',
        phone: '081-234-5678', email: 'somchai@example.com', address: '99/1 ถนนสุขุมวิท กรุงเทพฯ 10110' },
      vehicle: { plate: '1กข 1234', plateProvince: 'กรุงเทพมหานคร', chassisNo: 'MRHGM6640LP012345' },
      ...extra,
    },
  });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal(o.body.amount, q.body.price.total);
  return o.body;
}

const card = (number) => ({ number, name: 'SOMCHAI JAIDEE', expMonth: '12', expYear: '30', cvc: '123' });

test('เช็คเบี้ย → ชำระด้วยบัตร → ได้ PDF กรมธรรม์', async () => {
  const order = await createOrder();

  const pdfBefore = await call(`/api/orders/${order.id}/policy.pdf`, { token: order.accessToken });
  assert.equal(pdfBefore.status, 409);

  const tok = await call('/mock-gateway/tokens', { method: 'POST', body: card('4242424242424242') });
  assert.equal(tok.status, 201);
  assert.equal(tok.body.last4, '4242');

  const pay = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'card', cardToken: tok.body.id },
  });
  assert.equal(pay.status, 200);
  assert.equal(pay.body.order.status, 'paid');
  assert.match(pay.body.order.policyNumber, /^VMI-\d{4}-\d{6}$/);

  const pdf = await call(`/api/orders/${order.id}/policy.pdf`, { token: order.accessToken });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.type, 'application/pdf');
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');

  // token ใช้ซ้ำไม่ได้ และจ่ายซ้ำไม่ได้
  const again = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'card', cardToken: tok.body.id },
  });
  assert.equal(again.status, 409);
});

test('บัตรถูกปฏิเสธ → ยังไม่ออกกรมธรรม์ แล้วจ่ายใหม่ได้', async () => {
  const order = await createOrder();
  const bad = await call('/mock-gateway/tokens', { method: 'POST', body: card('4000000000000002') });
  const pay = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'card', cardToken: bad.body.id },
  });
  assert.equal(pay.status, 402);
  assert.equal(pay.body.order.status, 'pending_payment');

  const good = await call('/mock-gateway/tokens', { method: 'POST', body: card('5555555555554444') });
  const retry = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'card', cardToken: good.body.id },
  });
  assert.equal(retry.body.order.status, 'paid');
});

test('ชำระด้วย PromptPay QR → webhook → ออกกรมธรรม์', async () => {
  const order = await createOrder();
  const pay = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'promptpay' },
  });
  assert.equal(pay.status, 200);
  assert.match(pay.body.charge.qrPayload, /^000201010212.*5303764.*5802TH.*6304[0-9A-F]{4}$/);
  assert.match(pay.body.charge.qrImage, /^data:image\/png;base64,/);

  let status = await call(`/api/orders/${order.id}`, { token: order.accessToken });
  assert.equal(status.body.status, 'pending_payment');

  await call(`/mock-gateway/charges/${pay.body.charge.id}/simulate-paid`, { method: 'POST' });
  status = await call(`/api/orders/${order.id}`, { token: order.accessToken });
  assert.equal(status.body.status, 'paid');
  assert.ok(status.body.policyNumber);
});

test('ต้องมี access token ที่ถูกต้องจึงดูคำสั่งซื้อ/PDF ได้', async () => {
  const order = await createOrder();
  assert.equal((await call(`/api/orders/${order.id}`)).status, 404);
  assert.equal((await call(`/api/orders/${order.id}`, { token: 'wrong' })).status, 404);
  assert.equal((await call(`/api/orders/${order.id}/policy.pdf?token=x`)).status, 404);
});

test('ผ่อน 0% จ่ายด้วย QR ไม่ได้', async () => {
  const order = await createOrder({ paymentPlan: 'instal' });
  assert.equal(order.paymentPlan, 'instal');
  const pay = await call(`/api/orders/${order.id}/pay`, {
    method: 'POST', token: order.accessToken, body: { method: 'promptpay' },
  });
  assert.equal(pay.status, 400);
});

test('ปีรถเก่ากว่าปีที่เริ่มขาย → 400', async () => {
  const q = await call('/api/quotes', { method: 'POST', body: { ...quoteBody, brand: 'Toyota', model: 'bZ4X', year: 2024 } });
  assert.equal(q.status, 400);
  assert.match(q.body.error, /2025/);
});

test('ข้อมูลผู้เอาประกันผิด → 400', async () => {
  const q = await call('/api/quotes', { method: 'POST', body: quoteBody });
  const o = await call('/api/orders', {
    method: 'POST',
    body: { quoteId: q.body.quoteId, holder: { idCard: '123' }, vehicle: {} },
  });
  assert.equal(o.status, 400);
  assert.match(o.body.error, /เลขบัตรประชาชน/);
});
