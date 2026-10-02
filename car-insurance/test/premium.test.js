const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePlans, cmiPremium, withTaxes, QuoteError } = require('../src/premium');
const { isValidThaiId, isValidLuhn } = require('../src/validation');
const { crc16 } = require('../src/payment');

const now = new Date('2026-10-02T00:00:00Z');
const base = {
  carBrand: 'Toyota', carModel: 'Yaris', carYear: 2024, carValue: 550000,
  vehicleType: 'sedan', region: 'central', garage: 'garage', deductible: 0, driverAge: 40,
};

test('พ.ร.บ. รถเก๋ง = 645.21 บาท และรถกระบะ = 967.28 บาท', () => {
  assert.equal(cmiPremium('sedan').total, 64521);
  assert.equal(cmiPremium('pickup').total, 96728);
});

test('อากรแสตมป์ปัดเศษขึ้นทุก 250 บาท', () => {
  assert.equal(withTaxes(25000).stamp, 100);
  assert.equal(withTaxes(25100).stamp, 200);
});

test('รถใหม่ได้ครบทุกแผน และราคาชั้น 1 > 2+ > 3+ > 3', () => {
  const { plans } = calculatePlans(base, now);
  assert.deepEqual(plans.map((p) => p.code), ['type1', 'type2plus', 'type3plus', 'type3']);
  const totals = plans.map((p) => p.premium.total);
  assert.deepEqual([...totals].sort((a, b) => b - a), totals);
  for (const p of plans) assert.equal(p.premium.total, p.premium.net + p.premium.stamp + p.premium.vat);
});

test('รถอายุเกิน 12 ปี ซื้อชั้น 1 ไม่ได้', () => {
  const { plans } = calculatePlans({ ...base, carYear: 2010 }, now);
  assert.ok(!plans.some((p) => p.code === 'type1'));
});

test('ซ่อมห้างแพงกว่าซ่อมอู่ และผู้ขับอายุน้อยแพงกว่า', () => {
  const t1 = (o) => calculatePlans({ ...base, ...o }, now).plans[0].premium.total;
  assert.ok(t1({ garage: 'dealer' }) > t1({}));
  assert.ok(t1({ driverAge: 20 }) > t1({}));
});

test('ข้อมูลไม่ถูกต้องโยน QuoteError', () => {
  assert.throws(() => calculatePlans({ ...base, carValue: 10 }, now), QuoteError);
  assert.throws(() => calculatePlans({ ...base, vehicleType: 'boat' }, now), QuoteError);
  assert.throws(() => calculatePlans({ ...base, carModel: 'Civic' }, now), QuoteError); // รุ่นไม่ตรงยี่ห้อ
});

test('ตรวจเลขบัตรประชาชนและ Luhn', () => {
  assert.ok(isValidThaiId('1101700230708'));
  assert.ok(!isValidThaiId('1101700230709'));
  assert.ok(isValidLuhn('4242424242424242'));
  assert.ok(!isValidLuhn('4242424242424241'));
});

test('CRC16 ของ QR ตรงตามมาตรฐาน (CCITT-FALSE)', () => {
  assert.equal(crc16('123456789'), '29B1');
});
