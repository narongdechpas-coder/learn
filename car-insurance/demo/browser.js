// แบ็กเอนด์จำลองในเบราว์เซอร์ สำหรับเวอร์ชันไฟล์เดียว (offline) — ไม่ต้องมีเซิร์ฟเวอร์
// ใช้ตรรกะชุดเดียวกับเซิร์ฟเวอร์จริง (src/service.js) โดยดัก fetch ของหน้าแอปแล้วตอบแทน
// ข้อมูลอยู่ในหน่วยความจำ ปิดหน้าแล้วหายไป
const { Store } = require('../src/store');
const { createService } = require('../src/service');
const { renderPolicyPdf } = require('../src/policyPdf');
const regular = require('../fonts/Sarabun-Regular.ttf');
const bold = require('../fonts/Sarabun-Bold.ttf');

const service = createService(new Store());

const json = ({ status, body }) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function handle(url, init) {
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};
  const token = new Headers(init.headers).get('x-order-token');
  const p = url.pathname;
  let m;
  if (method === 'GET' && p === '/api/options') return service.options();
  if (method === 'POST' && p === '/api/quotes') return service.createQuote(body);
  if (method === 'POST' && p === '/api/orders') return service.createOrder(body);
  if (method === 'GET' && (m = p.match(/^\/api\/orders\/([\w-]+)$/))) return service.getOrder(m[1], token);
  if (method === 'POST' && (m = p.match(/^\/api\/orders\/([\w-]+)\/pay$/))) return service.pay(m[1], token, body);
  if (method === 'POST' && p === '/mock-gateway/tokens') return service.gatewayCreateToken(body);
  if (method === 'POST' && (m = p.match(/^\/mock-gateway\/charges\/([\w-]+)\/simulate-paid$/))) {
    return service.gatewaySimulatePaid(m[1]);
  }
  return { status: 404, body: { error: 'ไม่พบ endpoint' } };
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin === location.origin && /^\/(api|mock-gateway)\//.test(url.pathname)) {
    return json(await handle(url, init));
  }
  return realFetch(input, init);
};

function buildPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = renderPolicyPdf(order, { regular, bold });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(new Blob(chunks, { type: 'application/pdf' })));
    doc.on('error', reject);
  });
}

// ดาวน์โหลดกรมธรรม์: สร้าง PDF ในเบราว์เซอร์ แล้วบันทึก
// (บน claude.ai ใช้ความสามารถ downloads ของหน้า, ที่อื่นใช้ลิงก์ดาวน์โหลดธรรมดา)
window.ABI_downloadPolicy = async (ref) => {
  const result = service.paidOrder(ref.id, ref.accessToken);
  if (result.status !== 200) throw new Error(result.body.error);
  const blob = await buildPdf(result.body);
  const filename = `${result.body.policy.number}.pdf`;
  const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
  if (downloads) return downloads.save({ filename, data: blob });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
};
