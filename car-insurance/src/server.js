const path = require('node:path');
const express = require('express');
const { Store } = require('./store');
const { createService } = require('./service');
const { renderPolicyPdf } = require('./policyPdf');

function createApp({ dataFile, enableMockGateway = true } = {}) {
  const service = createService(new Store(dataFile));
  const app = express();
  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const send = (res, { status, body }) => res.status(status).json(body);
  const orderToken = (req) => req.get('x-order-token') || req.query.token;

  app.get('/api/options', (req, res) => send(res, service.options()));
  app.post('/api/quotes', (req, res) => send(res, service.createQuote(req.body)));
  app.post('/api/orders', (req, res) => send(res, service.createOrder(req.body)));
  app.get('/api/orders/:id', (req, res) => send(res, service.getOrder(req.params.id, orderToken(req))));
  app.post('/api/orders/:id/pay', async (req, res) =>
    send(res, await service.pay(req.params.id, orderToken(req), req.body)),
  );

  app.get('/api/orders/:id/policy.pdf', (req, res) => {
    const result = service.paidOrder(req.params.id, orderToken(req));
    if (result.status !== 200) return send(res, result);
    const order = result.body;
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${order.policy.number}.pdf"`);
    renderPolicyPdf(order).pipe(res);
  });

  // endpoints ของ gateway จำลอง (ของจริงจะอยู่ที่ผู้ให้บริการชำระเงิน)
  if (enableMockGateway) {
    app.post('/mock-gateway/tokens', (req, res) => send(res, service.gatewayCreateToken(req.body)));
    app.post('/mock-gateway/charges/:id/simulate-paid', (req, res) =>
      send(res, service.gatewaySimulatePaid(req.params.id)),
    );
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
