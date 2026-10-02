// สร้างกรมธรรม์ประกันภัยรถยนต์เป็น PDF (ภาษาไทย ฟอนต์ Sarabun)
const PDFDocument = require('pdfkit');
const { BODY_TYPES, REPAIR, CMI_COVERAGE, INSTALLMENTS } = require('./premium');

// ค่าเริ่มต้นฝั่งเซิร์ฟเวอร์: อ่านฟอนต์จากโฟลเดอร์ fonts/
// (เวอร์ชันเบราว์เซอร์ใน demo/ ส่งข้อมูลฟอนต์เข้ามาเองเป็น ArrayBuffer)
function defaultFonts() {
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'fonts');
  return { regular: path.join(dir, 'Sarabun-Regular.ttf'), bold: path.join(dir, 'Sarabun-Bold.ttf') };
}
const COMPANY = {
  name: 'บริษัท เดโม ประกันภัย จำกัด (มหาชน)',
  nameEn: 'Demo Insurance Public Company Limited',
  address: '999 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10000',
  phone: 'โทร 02-000-0000',
};

const baht = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const satang = (s) => baht(s / 100);
const thaiDate = (iso) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

function addYear(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function renderPolicyPdf(order, fonts = defaultFonts()) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, left: 40, right: 40, bottom: 20 },
    info: { Title: `กรมธรรม์ ${order.policy.number}`, Author: COMPANY.nameEn },
  });
  doc.registerFont('th', fonts.regular);
  doc.registerFont('th-bold', fonts.bold);

  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const primary = '#15357D';

  // หัวกระดาษ
  doc.rect(0, 0, doc.page.width, 90).fill(primary);
  doc.fillColor('#fff').font('th-bold').fontSize(18).text(COMPANY.name, L, 22, { width: W });
  doc.font('th').fontSize(10).text(`${COMPANY.address}  ${COMPANY.phone}`, L, 50, { width: W });

  doc.fillColor('#000').font('th-bold').fontSize(16).text('ตารางกรมธรรม์ประกันภัยรถยนต์', L, 100, {
    width: W,
    align: 'center',
  });
  doc.font('th').fontSize(11).text(`(${order.quote.price.classLabel})`, { width: W, align: 'center' });

  let y = doc.y + 10;
  const row = (label, value, x, width, labelWidth = 110) => {
    doc.font('th').fontSize(10).fillColor('#555').text(label, x, y, { width: labelWidth, lineBreak: false });
    doc.font('th-bold').fillColor('#000').text(value, x + labelWidth, y, { width: width - labelWidth });
  };
  const section = (title) => {
    y += 8;
    doc.rect(L, y, W, 20).fill('#e8f0fa');
    doc.fillColor(primary).font('th-bold').fontSize(11).text(title, L + 8, y + 3);
    y += 26;
  };

  const half = W / 2;
  const startDate = order.startDate;
  const endDate = addYear(startDate);

  section('ข้อมูลกรมธรรม์');
  row('เลขที่กรมธรรม์', order.policy.number, L, half);
  row('วันที่ออกกรมธรรม์', thaiDate(order.policy.issuedAt), L + half, half);
  y += 16;
  row('ระยะเวลาประกันภัย', `${thaiDate(startDate)} เวลา 16.30 น. ถึง ${thaiDate(endDate)} เวลา 16.30 น.`, L, W);
  y += 16;

  const h = order.holder;
  section('ผู้เอาประกันภัย');
  row('ชื่อ - นามสกุล', `${h.title} ${h.firstName} ${h.lastName}`.trim(), L, half);
  row('เลขบัตรประชาชน', `${h.idCard.slice(0, 1)}-XXXX-XXXXX-${h.idCard.slice(10, 12)}-${h.idCard.slice(12)}`, L + half, half);
  y += 16;
  row('โทรศัพท์', h.phone, L, half);
  row('อีเมล', h.email, L + half, half);
  y += 16;
  row('ที่อยู่', h.address, L, W);
  y = doc.y + 4;

  const q = order.quote.input;
  const price = order.quote.price;
  const v = order.vehicle;
  section('รายการรถยนต์ที่เอาประกันภัย');
  row('ยี่ห้อ / รุ่น', `${q.brand} ${q.model}`, L, half);
  row('ปีรถ', `${q.year + 543} (ค.ศ. ${q.year})`, L + half, half);
  y += 16;
  row('ทะเบียนรถ', `${v.plate} ${v.plateProvince}`, L, half);
  row('เลขตัวถัง', v.chassisNo, L + half, half);
  y += 16;
  row('ประเภทรถ', BODY_TYPES.find((b) => b.id === q.body).label, L, half);
  row('การซ่อม', REPAIR.find((r) => r.id === q.repair).label, L + half, half);
  y += 16;
  row('ผู้ขับขี่หลัก', `อายุ ${q.driverAge} ปี`, L, half);
  row('ทุนประกัน', q.sumInsured ? `${baht(q.sumInsured)} บาท` : '-', L + half, half);
  y += 16;

  const coverage = order.quote.coverage.map((c) => [c.label, `${baht(c.amount)} บาท`]);
  if (q.addons.includes('roadside')) coverage.push(['ช่วยเหลือฉุกเฉิน 24 ชม.', 'รวมในแผน']);
  if (q.withCmi) for (const [label, amount] of CMI_COVERAGE) coverage.push([`พ.ร.บ. · ${label}`, `${baht(amount)} บาท`]);
  section(`ความคุ้มครอง ${price.classLabel} (จำนวนเงินเอาประกันภัย)`);
  for (const [i, [label, value]] of coverage.entries()) {
    if (i % 2 === 0) doc.rect(L, y - 1, W, 15).fill('#f4f6fb');
    doc.fillColor('#000').font('th').fontSize(10).text(label, L + 8, y, { width: W - 160, lineBreak: false });
    doc.font('th-bold').text(value, L + W - 160, y, { width: 152, align: 'right' });
    y += 15;
  }

  section('เบี้ยประกันภัย (รวมภาษีและอากรแสตมป์แล้ว)');
  const lines = [[`เบี้ยประกันภาคสมัครใจ ${price.classLabel}`, price.base]];
  for (const a of price.addons) lines.push([a.label, a.price]);
  if (price.phydDiscount) lines.push([`ส่วนลด PHYD ขับดี ลดให้ (−${Math.round(price.phydPct * 100)}%)`, -price.phydDiscount]);
  if (price.cmi) lines.push(['พ.ร.บ. (ภาคบังคับ)', price.cmi]);
  for (const [label, amt] of lines) {
    doc.font('th').fontSize(10).fillColor(amt < 0 ? '#248040' : '#000').text(label, L + 8, y, { width: W - 160, lineBreak: false });
    doc.text(`${amt < 0 ? '−' : ''}${satang(Math.abs(amt))} บาท`, L + W - 160, y, { width: 152, align: 'right' });
    y += 14;
  }
  doc.moveTo(L + W - 260, y).lineTo(L + W, y).strokeColor('#999').stroke();
  y += 4;
  doc.font('th-bold').fontSize(12).fillColor('#000').text('ยอดชำระทั้งสิ้น', L + 8, y, { width: W - 160, lineBreak: false });
  doc.text(`${satang(order.amount)} บาท`, L + W - 200, y, { width: 192, align: 'right' });
  y += 20;
  if (order.paymentPlan === 'instal') {
    doc.font('th').fontSize(10).fillColor('#000')
      .text(`ผ่อนชำระ 0% ${INSTALLMENTS} เดือน ผ่านบัตรเครดิต เดือนละประมาณ ${satang(price.monthly)} บาท`, L + 8, y, { width: W - 16 });
    y += 16;
  }

  const pay = order.payment;
  const payLabel = pay.method === 'card' ? `บัตร ${pay.card.brand} **** ${pay.card.last4}` : 'Thai QR / พร้อมเพย์';
  doc.font('th').fontSize(9).fillColor('#555')
    .text(`ชำระเงินแล้วเมื่อ ${new Date(pay.paidAt).toLocaleString('th-TH')} ผ่าน ${payLabel}  เลขอ้างอิง ${pay.chargeId}`, L, y, { width: W });

  // ลายมือชื่อ (ชิดท้ายหน้า)
  const sigY = doc.page.height - 85;
  if (doc.y > sigY - 20) doc.addPage();
  doc.moveTo(L + W - 200, sigY).lineTo(L + W, sigY).strokeColor('#000').stroke();
  doc.font('th').fontSize(10).fillColor('#000').text('ผู้มีอำนาจลงนาม', L + W - 200, sigY + 4, { width: 200, align: 'center' });

  // ท้ายกระดาษ
  doc.font('th').fontSize(8).fillColor('#888').text(
    'เอกสารนี้สร้างโดยระบบเดโมเพื่อการเรียนรู้ ไม่ใช่กรมธรรม์ประกันภัยจริง และไม่มีผลผูกพันทางกฎหมาย',
    L,
    doc.page.height - 40,
    { width: W, align: 'center', lineBreak: false },
  );

  doc.end();
  return doc;
}

module.exports = { renderPolicyPdf, addYear };
