// End-to-end check of the main journeys against the built dist/index.html.
// Usage: npm run build && npm test   (SHOTS=dir to also save screenshots)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync('dist/index.html');
const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH || undefined; // e.g. /opt/pw-browsers/chromium
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const errors = [];
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text()) && errors.push(m.text()));
};

const jpg = (name, size = 2048) => ({ name, mimeType: 'image/jpeg', buffer: Buffer.alloc(size, 0xff) });
let step = 0;
const log = (s) => console.log(`  ${++step}. ${s}`);

const customer = await ctx.newPage();
watch(customer);
await customer.goto(url + '#customer');
const office = await ctx.newPage();
watch(office);
await office.goto(url + '#backoffice');
await office.getByRole('heading', { name: 'งานเข้า' }).waitFor();
log('customer and back-office tabs open');

// ---- Path A: choose a package (Class 1) ----
await customer.bringToFront();
const seeBtn = customer.getByRole('button', { name: /ดูแพ็กเกจ/ });
assert.equal(await seeBtn.isDisabled(), true, 'packages locked until car is chosen');
assert.equal(await customer.locator('.si-value').count(), 0, 'no sum insured before brand/model/year');
assert.equal(await customer.locator('.brand-btn').count(), 0, 'brands appear only after a vehicle code');
await customer.getByRole('radio', { name: /^320/ }).click();
assert.ok(!(await customer.locator('.brand-btn', { hasText: 'Honda' }).count()), 'no Honda pickup under 320');
await customer.getByRole('radio', { name: 'Toyota' }).click();
let opts = await customer.locator('#car-model option').allInnerTexts();
assert.ok(opts.includes('Hilux Revo') && !opts.includes('Camry'), '320 lists Revo, not Camry');
await customer.getByRole('radio', { name: /^110/ }).click();
opts = await customer.locator('#car-model option').allInnerTexts();
assert.ok(opts.includes('Hilux Revo') && opts.includes('Camry'), '110 lists Camry and Revo');
await customer.getByRole('radio', { name: /^210/ }).click();
assert.ok((await customer.locator('.brand-btn svg').count()) >= 3, 'brand buttons carry an SVG icon');
await customer.getByRole('radio', { name: 'Toyota' }).click();
opts = await customer.locator('#car-model option').allInnerTexts();
assert.ok(opts.includes('Hiace Commuter') && !opts.includes('Camry'), '210 lists vans only');
await customer.getByRole('radio', { name: /^110/ }).click();
log('vehicle code filters brands and models (Revo under 110 and 320, Camry 110 only)');
await customer.getByRole('radio', { name: 'Toyota' }).click();
await customer.locator('#car-model').selectOption('toyota-camry');
await customer.locator('#car-year').selectOption('2019');
await customer.locator('.quote-cta.subtle').getByRole('button', { name: 'ขอเสนอราคา', exact: true }).click();
assert.equal(await customer.locator('#c-code').inputValue(), '110');
assert.equal(await customer.locator('#c-brand').inputValue(), 'Toyota');
assert.equal(await customer.locator('#c-model').inputValue(), 'Camry');
assert.equal(await customer.locator('#c-year').inputValue(), '2019');
assert.ok(Number(await customer.locator('#q-si').inputValue()) > 0, 'sum insured carried over');
await customer.getByRole('button', { name: /ย้อนกลับ/ }).click();
log('quote request keeps the code, brand, model, year and sum insured already chosen');
await customer.getByRole('radio', { name: 'Toyota' }).click();
await customer.locator('#car-model').selectOption('toyota-yaris-ativ');
await customer.locator('#car-year').selectOption('');
assert.equal(await customer.locator('.si-value').count(), 0, 'still hidden without a year');
await customer.locator('#car-year').selectOption('2022');
await customer.locator('.si-value').waitFor();
log('sum insured appears only after brand, model and year');
const slider = customer.locator('#si-slider');
assert.equal(await slider.getAttribute('min'), '352000', 'min is suggested 370,000 − 5%');
assert.equal(await slider.getAttribute('max'), '388000', 'max is suggested 370,000 + 5%');
await customer.getByRole('button', { name: 'เพิ่มทุน 5,000 บาท' }).click();
await customer.getByRole('button', { name: 'เพิ่มทุน 5,000 บาท' }).click();
await customer.locator('.si-diff', { hasText: '+2.7%' }).waitFor();
await slider.fill('388000');
assert.equal(await customer.getByRole('button', { name: 'เพิ่มทุน 5,000 บาท' }).isDisabled(), true, 'cannot go past +5%');
await slider.fill('380000');
await customer.locator('.si-diff', { hasText: '+2.7%' }).waitFor();
log('sum insured adjustable within ±5% (352,000–388,000), chosen 380,000');
await seeBtn.click();
await customer.getByRole('heading', { name: /แพ็กเกจสำหรับ Toyota Yaris Ativ 2022/ }).waitFor();
const cards = customer.locator('.pkg-card');
assert.ok((await cards.count()) >= 6, 'expected several packages');
const cols = await customer.locator('.pkg-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
assert.equal(cols, 4, 'packages in 4 columns on desktop');
const ctaY = (await customer.locator('.quote-cta.top').boundingBox()).y;
assert.ok(ctaY < (await cards.first().boundingBox()).y, 'quote bar sits above the packages');
await customer.getByText('฿380,000').first().waitFor();
await customer.getByRole('radio', { name: 'ชั้น 1' }).click();
assert.ok((await cards.first().innerText()).includes('฿380,000'), 'Class 1 own damage uses the chosen sum insured');
if (shots) await customer.screenshot({ path: `${shots}/1-packages.png`, fullPage: true });
await cards.first().getByRole('button', { name: 'เลือกแพ็กเกจนี้', exact: true }).click();
assert.equal(await customer.locator('#f-firstName').inputValue(), 'สมชาย', 'form is prefilled');
// validation
await customer.locator('#f-phone').fill('123');
await customer.getByRole('button', { name: 'ยืนยันและแจ้งงาน', exact: true }).click();
await customer.getByText('เบอร์มือถือต้องมี 10 หลัก').waitFor();
await customer.locator('#f-phone').fill('0812345678');
await customer.getByRole('button', { name: 'ยืนยันและแจ้งงาน', exact: true }).click();
const refA = (await customer.locator('.ref-big').innerText()).trim();
assert.match(refA, /^ABC-\d{4}-\d{4}$/);
log(`package case submitted: ${refA}`);

// back office tab gets a realtime toast + bell
await office.locator('.toast', { hasText: refA }).waitFor({ timeout: 5000 });
log('back office received realtime toast');

// email to customer and staff
const emails = await customer.evaluate(() => JSON.parse(localStorage.getItem('abc-motor-demo-v1')).emails.map((e) => e.template));
assert.ok(emails.includes('custReceived') && emails.includes('staffNewCase'));
log('confirmation + staff emails generated');

// customer uploads documents: 6 required for Class 1
await customer.getByRole('button', { name: 'ติดตามคำขอ / แนบเอกสาร', exact: true }).click();
const tiles = customer.locator('.uploads .doc-tile');
assert.equal(await tiles.count(), 6, 'Class 1 asks for 6 documents');
const inputs = customer.locator('.uploads input[type=file]');
await inputs.nth(0).setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: Buffer.alloc(100) });
await customer.getByText('รับเฉพาะไฟล์ .jpg').waitFor();
await inputs.nth(0).setInputFiles(jpg('big.jpg', 3 * 1024 * 1024 + 10));
await customer.getByRole('alert').filter({ hasText: 'big.jpg' }).waitFor();
log('rejects .png and files over 3MB');
for (let i = 0; i < 6; i++) {
  await inputs.nth(i).setInputFiles(jpg(`doc${i}.jpg`));
  await customer.locator('.uploads .doc-tile.has').nth(i).waitFor();
}
await customer.getByText('เอกสารครบแล้ว').waitFor();
if (shots) await customer.screenshot({ path: `${shots}/2-track.png`, fullPage: true });
log('all 6 documents uploaded');

// back office: accept → docs review → issue
await office.bringToFront();
await office.locator('#bo-q').fill(refA);
await office.locator('.case-row', { hasText: refA }).click();
await office.getByText(/ลูกค้าปรับ \+2\.7% จากทุนแนะนำ ฿370,000/).waitFor();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ตรวจเอกสาร' }).waitFor();
assert.equal(await office.locator('.case-detail .doc-thumb img').count(), 6, 'staff sees uploaded images');
await office.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor();
log('back office accepted and issued the policy');
await customer.bringToFront();
await customer.getByText(/ออกกรมธรรม์แล้ว เลขที่/).waitFor({ timeout: 5000 });
log('customer tab updated to issued');

// ---- Path B: no package → quote request (Class 2+, 2 docs) ----
await customer.getByRole('tab', { name: 'ซื้อประกัน' }).click();
await customer.getByRole('button', { name: 'เริ่มคำขอใหม่', exact: true }).click().catch(() => {});
await customer.getByRole('radio', { name: /^110/ }).click();
await customer.getByRole('radio', { name: 'Mazda' }).click();
await customer.locator('#car-model').selectOption('mazda-mx-5');
await customer.locator('#car-year').selectOption('2024');
await customer.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
await customer.getByText('ยังไม่มีแพ็กเกจสำเร็จรูปสำหรับรถคันนี้').waitFor();
await customer.getByRole('button', { name: 'ขอเสนอราคา', exact: true }).click();
await customer.locator('#q-type').selectOption('T2P');
await customer.getByRole('button', { name: /ถัดไป/ }).click();
await customer.getByRole('button', { name: 'ส่งคำขอเสนอราคา', exact: true }).click();
const refB = (await customer.locator('.ref-big').innerText()).trim();
log(`quote request submitted: ${refB}`);

await office.bringToFront();
await office.locator('#bo-q').fill(refB);
await office.locator('.case-row', { hasText: refB }).click();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.locator(`#qp-${refB}`).fill('9990');
await office.getByRole('button', { name: 'ส่งใบเสนอราคา', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'เสนอราคาแล้ว' }).waitFor();
if (shots) await office.screenshot({ path: `${shots}/3-backoffice.png` });
log('back office sent quote');

await customer.bringToFront();
await customer.getByRole('button', { name: 'ติดตามคำขอ / แนบเอกสาร', exact: true }).click();
await customer.getByText('ใบเสนอราคาพร้อมแล้ว').waitFor({ timeout: 5000 });
await customer.getByRole('button', { name: 'ยืนยันซื้อ', exact: true }).click();
const inputsB = customer.locator('.uploads input[type=file]');
assert.equal(await inputsB.count(), 2, 'Class 2+ asks for 2 documents, no car photos');
await inputsB.nth(0).setInputFiles(jpg('reg.jpg'));
await customer.locator('.uploads .doc-tile.has').first().waitFor();
await inputsB.nth(1).setInputFiles(jpg('id.jpg'));
await customer.getByText('เอกสารครบแล้ว').waitFor();
log('customer accepted quote and uploaded 2 documents');

await office.bringToFront();
await office.locator('.case-detail .pill', { hasText: 'ตรวจเอกสาร' }).waitFor({ timeout: 5000 });
await office.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor();
log('quote case issued');

// ---- Dashboard + language ----
await office.getByRole('button', { name: 'Dashboard', exact: true }).click();
await office.getByRole('heading', { name: 'Performance Report' }).waitFor();
const kpi = await office.locator('.kpi-value').first().innerText();
assert.ok(Number(kpi.replace(/\D/g, '')) > 0, 'dashboard shows issued policies');
assert.ok((await office.locator('.chart .bar').count()) > 5, 'production chart has bars');
assert.equal(await office.locator('.funnel li').count(), 6);
if (shots) await office.screenshot({ path: `${shots}/4-dashboard.png`, fullPage: true });
await office.getByRole('radio', { name: 'EN' }).click();
await office.getByText('Policies issued', { exact: true }).waitFor();
await office.getByRole('button', { name: 'Customer', exact: true }).waitFor();
log('dashboard renders and switches to English');

await office.getByRole('button', { name: 'Mail outbox', exact: true }).click();
await office.locator('.mail-row', { hasText: refB }).first().waitFor();
log('mailbox lists the emails');

// ---- Path C: car not in the list → typed in → quote request ----
await customer.bringToFront();
await customer.getByRole('tab', { name: 'ซื้อประกัน' }).click();
await customer.getByRole('button', { name: 'เริ่มคำขอใหม่', exact: true }).click().catch(() => {});
await customer.locator('.quote-cta.subtle').getByRole('button', { name: 'ขอเสนอราคา', exact: true }).click();
await customer.getByRole('button', { name: /ถัดไป/ }).click();
await customer.getByText('กรุณากรอกยี่ห้อ รุ่น และปีรถให้ครบ').waitFor();
await customer.locator('#c-brand').fill('Volvo');
await customer.locator('#c-model').fill('XC60');
await customer.locator('#c-year').selectOption('2021');
await customer.locator('#c-code').selectOption('110');
await customer.getByRole('button', { name: /ถัดไป/ }).click();
await customer.getByText('กรุณาระบุทุนประกันที่ต้องการ').waitFor();
await customer.locator('#q-si').fill('1500000');
await customer.getByRole('button', { name: /ถัดไป/ }).click();
await customer.getByText('Volvo XC60 2021').waitFor();
await customer.getByRole('button', { name: 'ส่งคำขอเสนอราคา', exact: true }).click();
const refC = (await customer.locator('.ref-big').innerText()).trim();
await office.bringToFront();
await office.locator('.mainnav .nav-backoffice').click();
await office.locator('#bo-q').fill(refC);
await office.locator('.case-row', { hasText: 'Volvo XC60 2021' }).click();
await office.getByText('Not in catalogue').waitFor();
log(`car not in catalogue sent as quote request: ${refC}`);

// ---- Path D: Class 2+ for a 320 pickup is self service: docs, delivery, payment ----
await customer.bringToFront();
await customer.getByRole('button', { name: 'เริ่มคำขอใหม่', exact: true }).click().catch(() => {});
await customer.getByRole('radio', { name: /^320/ }).click();
await customer.getByRole('radio', { name: 'Toyota' }).click();
await customer.locator('#car-model').selectOption('toyota-hilux-revo');
await customer.locator('#car-year').selectOption('2020');
await customer.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
await customer.getByText('ซื้อ พ.ร.บ. ด้วย (+฿967.28)').waitFor();
await customer.getByRole('radio', { name: 'ชั้น 2+' }).click();
await customer.locator('.pkg-card .self-badge').first().waitFor();
await customer.locator('.pkg-card').first().getByRole('button', { name: 'เลือกแพ็กเกจนี้' }).click();
await customer.locator('#f-plate').fill('2ขค 5678');
await customer.getByRole('button', { name: /ไปขั้นตอนชำระเงิน/ }).click();
await customer.getByRole('heading', { name: 'แนบเอกสารและชำระเงิน' }).waitFor();
await customer.locator('.pay-btn').click();
await customer.locator('.order-summary .error', { hasText: 'แนบเอกสารให้ครบก่อนชำระเงิน' }).waitFor();
const coInputs = customer.locator('.checkout input[type=file]');
assert.equal(await coInputs.count(), 2, '2+ needs registration book and ID only');
await coInputs.nth(0).setInputFiles(jpg('reg.jpg'));
await customer.locator('.checkout .doc-tile.has').first().waitFor();
await coInputs.nth(1).setInputFiles(jpg('id.jpg'));
await customer.locator('.checkout .ok-note').waitFor();
await customer.getByRole('radio', { name: /กรมธรรม์กระดาษ/ }).click();
await customer.getByRole('radio', { name: /บัตรเครดิต/ }).click();
if (shots) await customer.screenshot({ path: `${shots}/8-checkout.png`, fullPage: true });
await customer.locator('.pay-btn').click();
await customer.getByRole('heading', { name: 'ชำระเงินสำเร็จ ออกกรมธรรม์แล้ว' }).waitFor({ timeout: 5000 });
await customer.getByText(/จัดส่งกรมธรรม์ทาง EMS เลขพัสดุ EB\d{9}TH/).waitFor();
await customer.getByRole('button', { name: 'ดู e-Policy' }).click();
await customer.locator('.policy-doc').getByText('320 รถกระบะส่วนบุคคล').waitFor();
if (shots) await customer.screenshot({ path: `${shots}/9-self-done.png`, fullPage: true });
await office.bringToFront();
await office.locator('.toast', { hasText: 'self-service' }).or(office.locator('.toast', { hasText: 'bought online' })).first().waitFor({ timeout: 5000 });
log('self-service 2+ paid by card, paper policy by EMS, back office notified');

// ---- Tracking by plate ----
await customer.bringToFront();
await customer.getByRole('tab', { name: 'ติดตามคำขอ' }).click();
await customer.locator('#track-ref').fill('2ขค-5678');
await customer.getByRole('button', { name: 'ค้นหา', exact: true }).click();
await customer.getByText('ผลการค้นหา 1 รายการ').waitFor();
await customer.locator('#track-ref').fill('1กข1234');
await customer.getByRole('button', { name: 'ค้นหา', exact: true }).click();
await customer.getByText(/ผลการค้นหา [3-9] รายการ/).waitFor();
await customer.locator('#track-ref').fill(refB.toLowerCase());
await customer.getByRole('button', { name: 'ค้นหา', exact: true }).click();
await customer.getByText('ผลการค้นหา 1 รายการ').waitFor();
await customer.locator('#track-ref').fill('9zz 0000');
await customer.getByRole('button', { name: 'ค้นหา', exact: true }).click();
await customer.getByText('ไม่พบคำขอที่ตรงกับ').waitFor();
log('tracking finds requests by plate (spaces/dashes ignored) or request number');

if (shots) {
  await office.emulateMedia({ colorScheme: 'dark' });
  await office.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await office.screenshot({ path: `${shots}/5-dashboard-dark.png`, fullPage: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(url + '#customer');
  await phone.getByRole('radio', { name: /^110/ }).click();
  await phone.getByRole('radio', { name: 'Honda' }).click();
  await phone.locator('#car-model').selectOption('honda-city');
  await phone.locator('#car-year').selectOption('2023');
  await phone.waitForTimeout(900);
  await phone.screenshot({ path: `${shots}/6a-phone-car.png`, fullPage: true });
  await phone.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
  await phone.screenshot({ path: `${shots}/6-phone.png`, fullPage: true });
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, 'no horizontal scroll on phone');
  await phone.goto(url + '#dashboard');
  await phone.screenshot({ path: `${shots}/7-phone-dash.png`, fullPage: true });
}

assert.deepEqual(errors, [], 'no console errors');
console.log('\nAll checks passed');
await browser.close();
server.close();
