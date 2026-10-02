// คำนวณเบี้ยประกันรถยนต์
// อัตราและตัวคูณทั้งหมดเป็น "ตัวอย่าง" สำหรับเดโม ไม่ใช่พิกัดอัตราเบี้ยจริงของ คปภ.
// คำนวณเป็นหน่วยสตางค์ (จำนวนเต็ม) เพื่อเลี่ยงปัญหาทศนิยมของ float
const { findModel } = require('./catalog');

const VEHICLE_TYPES = {
  sedan: { label: 'รถเก๋ง', factor: 1.0, cmiNet: 600 },
  suv: { label: 'รถ SUV / PPV (ไม่เกิน 7 ที่นั่ง)', factor: 1.05, cmiNet: 600 },
  pickup: { label: 'รถกระบะ (ส่วนบุคคล)', factor: 1.1, cmiNet: 900 },
  ev: { label: 'รถยนต์ไฟฟ้า (EV)', factor: 1.15, cmiNet: 600 },
};

const REGIONS = {
  bangkok: { label: 'กรุงเทพฯ และปริมณฑล', factor: 1.1 },
  central: { label: 'ภาคกลาง / ตะวันออก', factor: 1.0 },
  north: { label: 'ภาคเหนือ', factor: 0.95 },
  northeast: { label: 'ภาคตะวันออกเฉียงเหนือ', factor: 0.95 },
  south: { label: 'ภาคใต้', factor: 1.0 },
};

const GARAGES = {
  garage: { label: 'ซ่อมอู่', factor: 1.0 },
  dealer: { label: 'ซ่อมห้าง', factor: 1.15 },
};

const DEDUCTIBLES = { 0: 1.0, 3000: 0.95, 5000: 0.92 };

const PLANS = {
  type1: {
    name: 'ประกันชั้น 1',
    maxCarAge: 12,
    rate: 0.02,
    fixed: 0,
    minNet: 9000,
    usesGarage: true,
    usesDeductible: true,
    sumInsured: (carValue) => carValue,
    coverage: (si) => [
      ['ความเสียหายต่อตัวรถ (ทุกกรณี)', si],
      ['รถสูญหาย / ไฟไหม้', si],
      ['น้ำท่วม / ภัยธรรมชาติ', si],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อคน)', 1_000_000],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อครั้ง)', 10_000_000],
      ['ความรับผิดต่อทรัพย์สินบุคคลภายนอก', 1_000_000],
      ['อุบัติเหตุส่วนบุคคล (ต่อคน)', 100_000],
      ['ค่ารักษาพยาบาล (ต่อคน)', 100_000],
      ['ประกันตัวผู้ขับขี่', 300_000],
    ],
  },
  type2plus: {
    name: 'ประกันชั้น 2+',
    maxCarAge: 20,
    rate: 0.01,
    fixed: 5500,
    minNet: 0,
    usesGarage: false,
    usesDeductible: true,
    sumInsured: (carValue) => Math.min(carValue, 300_000),
    coverage: (si) => [
      ['ความเสียหายต่อตัวรถ (ชนกับยานพาหนะทางบก)', si],
      ['รถสูญหาย / ไฟไหม้', si],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อคน)', 500_000],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อครั้ง)', 10_000_000],
      ['ความรับผิดต่อทรัพย์สินบุคคลภายนอก', 1_000_000],
      ['อุบัติเหตุส่วนบุคคล (ต่อคน)', 50_000],
      ['ค่ารักษาพยาบาล (ต่อคน)', 50_000],
      ['ประกันตัวผู้ขับขี่', 200_000],
    ],
  },
  type3plus: {
    name: 'ประกันชั้น 3+',
    maxCarAge: 20,
    rate: 0.01,
    fixed: 4200,
    minNet: 0,
    usesGarage: false,
    usesDeductible: true,
    sumInsured: (carValue) => Math.min(carValue, 150_000),
    coverage: (si) => [
      ['ความเสียหายต่อตัวรถ (ชนกับยานพาหนะทางบก)', si],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อคน)', 500_000],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อครั้ง)', 10_000_000],
      ['ความรับผิดต่อทรัพย์สินบุคคลภายนอก', 1_000_000],
      ['อุบัติเหตุส่วนบุคคล (ต่อคน)', 50_000],
      ['ค่ารักษาพยาบาล (ต่อคน)', 50_000],
      ['ประกันตัวผู้ขับขี่', 200_000],
    ],
  },
  type3: {
    name: 'ประกันชั้น 3',
    maxCarAge: Infinity,
    rate: 0,
    fixed: 2200,
    minNet: 0,
    usesGarage: false,
    usesDeductible: false,
    sumInsured: () => 0,
    coverage: () => [
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อคน)', 300_000],
      ['ความรับผิดต่อชีวิตบุคคลภายนอก (ต่อครั้ง)', 10_000_000],
      ['ความรับผิดต่อทรัพย์สินบุคคลภายนอก', 600_000],
      ['อุบัติเหตุส่วนบุคคล (ต่อคน)', 50_000],
      ['ค่ารักษาพยาบาล (ต่อคน)', 50_000],
      ['ประกันตัวผู้ขับขี่', 200_000],
    ],
  },
};

function carAgeFactor(carAge) {
  if (carAge <= 1) return 1.0;
  if (carAge <= 3) return 1.05;
  if (carAge <= 6) return 1.12;
  if (carAge <= 10) return 1.25;
  return 1.35;
}

function driverAgeFactor(driverAge) {
  if (driverAge == null) return 1.15; // ไม่ระบุผู้ขับขี่
  if (driverAge < 25) return 1.35;
  if (driverAge <= 35) return 1.1;
  if (driverAge <= 50) return 1.0;
  if (driverAge <= 65) return 1.05;
  return 1.2;
}

// อากรแสตมป์: 1 บาท ต่อทุก 250 บาท หรือเศษของ 250 บาท
// ภาษีมูลค่าเพิ่ม 7% คิดจาก (เบี้ยสุทธิ + อากร)
function withTaxes(netSatang) {
  const stampSatang = Math.ceil(netSatang / 25_000) * 100;
  const vatSatang = Math.round(((netSatang + stampSatang) * 7) / 100);
  return {
    net: netSatang,
    stamp: stampSatang,
    vat: vatSatang,
    total: netSatang + stampSatang + vatSatang,
  };
}

// พ.ร.บ. (ประกันภัยรถยนต์ภาคบังคับ) — เบี้ยสุทธิตามประเภทรถ เช่น รถเก๋ง 600 บาท → รวม 645.21 บาท
function cmiPremium(vehicleType) {
  return withTaxes(VEHICLE_TYPES[vehicleType].cmiNet * 100);
}

class QuoteError extends Error {}

function validateInput(input, now = new Date()) {
  const errors = [];
  const year = Number(input.carYear);
  const thisYear = now.getFullYear();
  if (!Number.isInteger(year) || year < thisYear - 40 || year > thisYear + 1) {
    errors.push('ปีรถไม่ถูกต้อง');
  }
  const carValue = Number(input.carValue);
  if (!Number.isFinite(carValue) || carValue < 50_000 || carValue > 10_000_000) {
    errors.push('ราคารถต้องอยู่ระหว่าง 50,000 – 10,000,000 บาท');
  }
  if (!VEHICLE_TYPES[input.vehicleType]) errors.push('ประเภทรถไม่ถูกต้อง');
  if (!REGIONS[input.region]) errors.push('พื้นที่ใช้รถไม่ถูกต้อง');
  const garage = input.garage ?? 'garage';
  if (!GARAGES[garage]) errors.push('ประเภทการซ่อมไม่ถูกต้อง');
  const deductible = Number(input.deductible ?? 0);
  if (!(deductible in DEDUCTIBLES)) errors.push('ค่าเสียหายส่วนแรกไม่ถูกต้อง');
  let driverAge = null;
  if (input.driverAge !== undefined && input.driverAge !== null && input.driverAge !== '') {
    driverAge = Number(input.driverAge);
    if (!Number.isInteger(driverAge) || driverAge < 18 || driverAge > 90) {
      errors.push('อายุผู้ขับขี่ต้องอยู่ระหว่าง 18 – 90 ปี');
    }
  }
  if (!findModel(input.carBrand, input.carModel)) errors.push('กรุณาเลือกยี่ห้อและรุ่นรถจากรายการ');
  if (errors.length) throw new QuoteError(errors.join(', '));
  return {
    carBrand: input.carBrand,
    carModel: input.carModel,
    carYear: year,
    carAge: Math.max(0, thisYear - year),
    carValue: Math.round(carValue),
    vehicleType: input.vehicleType,
    region: input.region,
    garage,
    deductible,
    driverAge,
  };
}

function calculatePlans(rawInput, now = new Date()) {
  const input = validateInput(rawInput, now);
  const common =
    VEHICLE_TYPES[input.vehicleType].factor *
    REGIONS[input.region].factor *
    driverAgeFactor(input.driverAge) *
    carAgeFactor(input.carAge);

  const plans = [];
  for (const [code, plan] of Object.entries(PLANS)) {
    if (input.carAge > plan.maxCarAge) continue;
    const sumInsured = plan.sumInsured(input.carValue);
    let net = (plan.fixed + sumInsured * plan.rate) * common;
    if (plan.usesGarage) net *= GARAGES[input.garage].factor;
    if (plan.usesDeductible) net *= DEDUCTIBLES[input.deductible];
    net = Math.max(net, plan.minNet);
    const netSatang = Math.round(net) * 100; // ปัดเบี้ยสุทธิเป็นบาทเต็ม
    plans.push({
      code,
      name: plan.name,
      sumInsured,
      garage: plan.usesGarage ? input.garage : 'garage',
      deductible: plan.usesDeductible ? input.deductible : 0,
      coverage: plan.coverage(sumInsured).map(([label, amount]) => ({ label, amount })),
      premium: withTaxes(netSatang),
    });
  }
  return { input, plans, cmi: cmiPremium(input.vehicleType) };
}

module.exports = {
  VEHICLE_TYPES,
  REGIONS,
  GARAGES,
  DEDUCTIBLES,
  PLANS,
  QuoteError,
  calculatePlans,
  cmiPremium,
  withTaxes,
};
