const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote, estimateClasses, QuoteError, CMI_SATANG } = require('../src/premium');
const { yearsFor, findModel, MAX_CAR_AGE } = require('../src/catalog');
const { isValidThaiId, isValidLuhn } = require('../src/validation');
const { crc16 } = require('../src/payment');

const now = new Date('2026-10-02T00:00:00Z');
const base = {
  brand: 'Toyota', model: 'Corolla Cross', year: 2024, sumInsured: 850000,
  coverageClass: '1', repair: 'garage', driverAge: 38, addons: [], withCmi: false,
};
const quote = (o = {}) => calculateQuote({ ...base, ...o }, now);

test('พ.ร.บ. = 645.21 บาท', () => {
  assert.equal(CMI_SATANG, 64521);
  assert.equal(quote({ withCmi: true }).price.cmi, 64521);
});

test('เบี้ยชั้น 1 = ทุน × อัตรา × ตัวคูณ (สูตรตามดีไซน์)', () => {
  // Corolla Cross = SUV (1.10), รถอายุ 2 ปี (1.00), ซ่อมอู่ (1.00), อายุผู้ขับ 38 (0.97)
  const expected = Math.round(850000 * 0.0375 * 1.1 * 1 * 1 * 0.97);
  assert.equal(quote().price.base, expected * 100);
  assert.equal(quote().price.total, expected * 100);
});

test('ราคาเรียงชั้น 1 > 2+ > 3+ > 3', () => {
  const totals = estimateClasses(base, now).map((c) => c.total);
  assert.deepEqual([...totals].sort((a, b) => b - a), totals);
});

test('ความคุ้มครองเสริม + ส่วนลด PHYD 12% + พ.ร.บ.', () => {
  const p = quote({ addons: ['flood', 'phyd', 'roadside'], withCmi: true }).price;
  assert.equal(p.addonTotal, 150000);
  assert.equal(p.phydDiscount, Math.round((p.base + p.addonTotal) / 100 * 0.12) * 100);
  assert.equal(p.total, p.base + p.addonTotal - p.phydDiscount + 64521);
  assert.equal(p.monthly, Math.round(p.total / 10));
});

test('ซ่อมห้างแพงกว่าซ่อมอู่ และผู้ขับอายุน้อยแพงกว่า', () => {
  assert.ok(quote({ repair: 'dealer' }).price.total > quote().price.total);
  assert.ok(quote({ driverAge: 22 }).price.total > quote().price.total);
});

test('ปีรถต้องไม่เก่ากว่าปีที่เริ่มขายในไทย (bZ4X เริ่มปี 2025)', () => {
  const bz = findModel('Toyota', 'bZ4X');
  assert.deepEqual(yearsFor(bz, 2026), [2026, 2025]);
  assert.throws(() => quote({ model: 'bZ4X', year: 2024 }), /เริ่มขายในไทยปี 2025/);
  assert.equal(quote({ model: 'bZ4X', year: 2025 }).input.body, 'suv');
});

test(`ย้อนหลังได้สูงสุด ${MAX_CAR_AGE} ปี`, () => {
  assert.equal(yearsFor(findModel('Toyota', 'Camry'), 2026).at(-1), 2026 - MAX_CAR_AGE);
  assert.throws(() => quote({ model: 'Camry', year: 2026 - MAX_CAR_AGE - 1 }), QuoteError);
});

test('ข้อมูลไม่ถูกต้องโยน QuoteError', () => {
  assert.throws(() => quote({ model: 'Civic' }), QuoteError); // รุ่นไม่ตรงยี่ห้อ
  assert.throws(() => quote({ sumInsured: 10 }), QuoteError);
  assert.throws(() => quote({ coverageClass: '5' }), QuoteError);
  assert.throws(() => quote({ addons: ['free-money'] }), QuoteError);
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
