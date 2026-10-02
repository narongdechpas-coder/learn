// คำนวณเบี้ยประกันรถยนต์ ตามโมเดลผลิตภัณฑ์ของดีไซน์ ABI (QUOTE_CONFIG / calcPremium)
// อัตราเป็น "ตัวอย่าง" ไม่ใช่พิกัดอัตราเบี้ยจริง ราคาเบี้ยที่แสดงเป็นราคารวมภาษีอากรแล้ว
// ไฟล์นี้ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์ (หน้าแอปใช้แสดงราคาประเมินแบบทันที
// ส่วนราคาที่ใช้ตัดเงินจริง เซิร์ฟเวอร์คำนวณใหม่เสมอ)
const { findModel, yearsFor } = require('./catalog');

const BODY_TYPES = [
  { id: 'eco', label: 'อีโคคาร์', sub: 'รถเล็กประหยัด', factor: 0.9 },
  { id: 'sedan', label: 'รถเก๋ง', sub: 'ซีดาน/แฮทช์แบ็ก', factor: 1.0 },
  { id: 'suv', label: 'รถ SUV', sub: 'อเนกประสงค์', factor: 1.1 },
  { id: 'pickup', label: 'รถกระบะ', sub: 'ปิกอัพ/ส่วนบุคคล', factor: 1.16 },
];

// ทุนประกันบุคคลภายนอก/อุบัติเหตุ ตามตารางกรมธรรม์ของดีไซน์
const THIRD_PARTY = [
  ['บุคคลภายนอก / ชีวิต (ต่อคน)', 1_000_000],
  ['ทรัพย์สินบุคคลภายนอก', 5_000_000],
  ['อุบัติเหตุส่วนบุคคล (ต่อคน)', 200_000],
  ['ค่ารักษาพยาบาล (ต่อคน)', 200_000],
  ['ประกันตัวผู้ขับขี่', 300_000],
];

const CLASSES = [
  {
    id: '1', label: 'ชั้น 1', tagline: 'คุ้มครองครบ ทุกความเสี่ยง', rate: 0.0375, ownDamage: true, theft: true, popular: true,
    perks: ['ชน/คว่ำ มีคู่กรณีและไม่มีคู่กรณี', 'ไฟไหม้ น้ำท่วม รถหาย', 'คู่กรณี + รถของคุณ'],
    coverage: (si) => [['ความเสียหายต่อรถยนต์ (ทุกกรณี)', si], ['รถสูญหาย / ไฟไหม้', si], ['น้ำท่วม / ภัยธรรมชาติ', si], ...THIRD_PARTY],
  },
  {
    id: '2plus', label: 'ชั้น 2+', tagline: 'คุ้มครองชน มีคู่กรณี + รถหาย', rate: 0.0205, ownDamage: true, theft: true, popular: false,
    perks: ['ชนมีคู่กรณี (รถยนต์)', 'ไฟไหม้ น้ำท่วม รถหาย', 'คู่กรณี + รถของคุณ'],
    coverage: (si) => [['ความเสียหายต่อรถยนต์ (ชนมีคู่กรณี)', si], ['รถสูญหาย / ไฟไหม้', si], ...THIRD_PARTY],
  },
  {
    id: '3plus', label: 'ชั้น 3+', tagline: 'คุ้มครองชน มีคู่กรณี', rate: 0.0165, ownDamage: true, theft: false, popular: false,
    perks: ['ชนมีคู่กรณี (รถยนต์)', 'คู่กรณี + รถของคุณ', 'ไม่คุ้มครองรถหาย/ไฟไหม้'],
    coverage: (si) => [['ความเสียหายต่อรถยนต์ (ชนมีคู่กรณี)', si], ...THIRD_PARTY],
  },
  {
    id: '3', label: 'ชั้น 3', tagline: 'คุ้มครองเฉพาะคู่กรณี', rate: 0.0095, ownDamage: false, theft: false, popular: false,
    perks: ['ความรับผิดต่อคู่กรณี', 'ประหยัดที่สุด', 'ไม่คุ้มครองรถของคุณ'],
    coverage: () => THIRD_PARTY,
  },
];

const REPAIR = [
  { id: 'garage', label: 'ซ่อมอู่', sub: 'อู่ในเครือมาตรฐาน', factor: 1.0 },
  { id: 'dealer', label: 'ซ่อมห้าง', sub: 'ศูนย์บริการยี่ห้อรถ', factor: 1.18 },
];

const ADDONS = [
  { id: 'phyd', label: 'PHYD ขับดี ลดให้', sub: 'ติด T Connect ลดเบี้ยสูงสุด 30%', discountPct: 0.12, icon: 'gauge' },
  { id: 'flood', label: 'คุ้มครองน้ำท่วมเพิ่ม', sub: 'วงเงินภัยธรรมชาติ +30,000', price: 900, icon: 'cloud-rain', coverage: ['วงเงินภัยธรรมชาติเพิ่ม', 30_000] },
  { id: 'driver', label: 'อุบัติเหตุผู้ขับขี่เพิ่ม', sub: 'ทุน +300,000 ต่อคน', price: 700, icon: 'user-round', coverage: ['อุบัติเหตุผู้ขับขี่เพิ่ม (ต่อคน)', 300_000] },
  { id: 'roadside', label: 'ช่วยเหลือฉุกเฉิน 24 ชม.', sub: 'รถยก/แบตเตอรี่/ยางอะไหล่', price: 600, icon: 'life-buoy' },
];

const CMI_SATANG = 64521; // พ.ร.บ. รถยนต์นั่งส่วนบุคคล รวมภาษีอากร 645.21 บาท
const CMI_COVERAGE = [
  ['เสียชีวิต / ทุพพลภาพถาวร', 500_000],
  ['ค่ารักษาพยาบาล (ตามจริง)', 80_000],
];
const INSTALLMENTS = 10; // ผ่อน 0% 10 เดือน
const SUM_INSURED_MIN = 100_000;
const SUM_INSURED_MAX = 10_000_000;

const ageFactor = (carAge) => 1 + Math.max(0, carAge - 4) * 0.025;
const driverFactor = (age) => (age < 25 ? 1.15 : age >= 55 ? 1.05 : age < 30 ? 1.05 : 0.97);

class QuoteError extends Error {}

function validateInput(raw, now = new Date()) {
  const errors = [];
  const thisYear = now.getFullYear();
  const model = findModel(raw.brand, raw.model);
  if (!model) errors.push('กรุณาเลือกยี่ห้อและรุ่นรถจากรายการ');
  const year = Number(raw.year);
  if (model && !yearsFor(model, thisYear).includes(year)) {
    errors.push(`ปีรถไม่ถูกต้อง ${raw.brand} ${raw.model} เริ่มขายในไทยปี ${model.since}`);
  }
  const sumInsured = Math.round(Number(raw.sumInsured));
  if (!(sumInsured >= SUM_INSURED_MIN && sumInsured <= SUM_INSURED_MAX)) {
    errors.push('ทุนประกันต้องอยู่ระหว่าง 100,000 – 10,000,000 บาท');
  }
  const cls = CLASSES.find((c) => c.id === raw.coverageClass);
  if (!cls) errors.push('กรุณาเลือกระดับความคุ้มครอง');
  const repair = REPAIR.find((r) => r.id === (raw.repair ?? 'garage'));
  if (!repair) errors.push('ประเภทการซ่อมไม่ถูกต้อง');
  const driverAge = Number(raw.driverAge);
  if (!Number.isInteger(driverAge) || driverAge < 18 || driverAge > 80) errors.push('อายุผู้ขับขี่ต้องอยู่ระหว่าง 18 – 80 ปี');
  const addons = Array.isArray(raw.addons) ? [...new Set(raw.addons)] : [];
  if (addons.some((id) => !ADDONS.some((a) => a.id === id))) errors.push('ความคุ้มครองเสริมไม่ถูกต้อง');
  if (errors.length) throw new QuoteError(errors.join(', '));
  return {
    brand: raw.brand,
    model: raw.model,
    body: model.body,
    year,
    carAge: Math.max(0, thisYear - year),
    sumInsured,
    coverageClass: cls.id,
    repair: repair.id,
    driverAge,
    addons: ADDONS.filter((a) => addons.includes(a.id)).map((a) => a.id), // เรียงตามลำดับในรายการ
    withCmi: Boolean(raw.withCmi),
  };
}

// คำนวณเบี้ยจากข้อมูลที่ตรวจแล้ว — คืนค่าเป็นสตางค์
function priceOf(input) {
  const cls = CLASSES.find((c) => c.id === input.coverageClass);
  const body = BODY_TYPES.find((b) => b.id === input.body);
  const repair = REPAIR.find((r) => r.id === input.repair);

  const base = Math.round(
    input.sumInsured * cls.rate * body.factor * ageFactor(input.carAge) * repair.factor * driverFactor(input.driverAge),
  );
  const flat = ADDONS.filter((a) => a.price && input.addons.includes(a.id));
  const addonTotal = flat.reduce((t, a) => t + a.price, 0);
  const phyd = input.addons.includes('phyd') ? ADDONS.find((a) => a.id === 'phyd').discountPct : 0;
  const phydDiscount = Math.round((base + addonTotal) * phyd);
  const voluntary = base + addonTotal - phydDiscount;
  const cmi = input.withCmi ? CMI_SATANG : 0;
  const total = voluntary * 100 + cmi;

  return {
    classLabel: cls.label,
    base: base * 100,
    addons: flat.map((a) => ({ id: a.id, label: a.label, price: a.price * 100 })),
    addonTotal: addonTotal * 100,
    phydPct: phyd,
    phydDiscount: phydDiscount * 100,
    voluntary: voluntary * 100,
    cmi,
    total,
    monthly: Math.round(total / INSTALLMENTS),
  };
}

function calculateQuote(raw, now = new Date()) {
  const input = validateInput(raw, now);
  const cls = CLASSES.find((c) => c.id === input.coverageClass);
  const coverage = cls.coverage(input.sumInsured).map(([label, amount]) => ({ label, amount }));
  for (const a of ADDONS) {
    if (a.coverage && input.addons.includes(a.id)) coverage.push({ label: a.coverage[0], amount: a.coverage[1] });
  }
  return { input, price: priceOf(input), coverage };
}

// ราคาประเมินของทุกชั้น (ใช้แสดงในหน้าเลือกความคุ้มครอง: ซ่อมอู่ ไม่มีความคุ้มครองเสริม ไม่รวม พ.ร.บ.)
function estimateClasses(raw, now = new Date()) {
  const input = validateInput({ ...raw, coverageClass: '1', repair: 'garage', addons: [], withCmi: false }, now);
  return CLASSES.map((c) => ({ id: c.id, total: priceOf({ ...input, coverageClass: c.id }).total }));
}

module.exports = {
  BODY_TYPES,
  CLASSES,
  REPAIR,
  ADDONS,
  CMI_SATANG,
  CMI_COVERAGE,
  INSTALLMENTS,
  SUM_INSURED_MIN,
  SUM_INSURED_MAX,
  QuoteError,
  validateInput,
  priceOf,
  calculateQuote,
  estimateClasses,
};
