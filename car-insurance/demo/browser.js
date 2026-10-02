// แบ็กเอนด์จำลองในเบราว์เซอร์ สำหรับเวอร์ชันไฟล์เดียว (offline) — ไม่ต้องมีเซิร์ฟเวอร์
// ใช้ตรรกะชุดเดียวกับเซิร์ฟเวอร์จริง (src/service.js) ตอบคำขอของหน้าแอปแทนเซิร์ฟเวอร์
// ข้อมูลอยู่ในหน่วยความจำ ปิดหน้าแล้วหายไป
const { Store } = require('../src/store');
const { createService } = require('../src/service');
const { renderPolicyPdf } = require('../src/policyPdf');
const regular = require('../fonts/Sarabun-Regular.ttf');
const bold = require('../fonts/Sarabun-Bold.ttf');

const service = createService(new Store());

async function handle(path, { method = 'GET', body, token } = {}) {
  const p = path.split('?')[0];
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

// app/api.js เรียกฟังก์ชันนี้โดยตรงแทน fetch — ไม่ต้องพึ่ง URL/origin ของหน้า
// จึงทำงานได้ทุกที่ที่เปิดไฟล์ (file://, หน้าพรีวิวในแอป, iframe แบบ sandbox)
window.ABI_LOCAL_BACKEND = handle;

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
