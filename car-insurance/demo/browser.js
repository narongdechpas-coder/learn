// เวอร์ชันเดโมที่รันทั้งหมดในเบราว์เซอร์ — ไม่ต้องติดตั้ง Node.js
// ใช้ตรรกะชุดเดียวกับเซิร์ฟเวอร์จริง (src/service.js) โดยดัก fetch ของหน้าเว็บ
// แล้วตอบแทนเซิร์ฟเวอร์ ข้อมูลอยู่ในหน่วยความจำ ปิดหน้าแล้วหายไป
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

async function saveFile(filename, blob) {
  const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
  if (downloads) return downloads.save({ filename, data: blob });
  // นอก claude.ai (เช่นเปิดไฟล์ในเครื่อง) ใช้ลิงก์ดาวน์โหลดธรรมดา
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const errorBox = document.getElementById('error');
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

// หน้าเดโมเปิด PDF ในแท็บใหม่ไม่ได้ จึงเหลือปุ่มดาวน์โหลดอย่างเดียว
document.getElementById('viewPdf').hidden = true;
document.getElementById('downloadPdf').addEventListener('click', async (e) => {
  e.preventDefault();
  const btn = e.currentTarget;
  const url = new URL(btn.href, location.href);
  const id = url.pathname.split('/')[3];
  const result = service.paidOrder(id, url.searchParams.get('token'));
  if (result.status !== 200) return showError(result.body.error);
  btn.setAttribute('aria-busy', 'true');
  try {
    const blob = await buildPdf(result.body);
    await saveFile(`${result.body.policy.number}.pdf`, blob);
  } catch (err) {
    if (err?.code !== 'declined') showError('ดาวน์โหลดไม่สำเร็จ ลองกดอีกครั้ง');
  } finally {
    btn.removeAttribute('aria-busy');
  }
});

// โหลดหน้าเว็บหลักหลังจากดัก fetch แล้ว
require('../public/app.js');
