// End-to-end check of the main journeys against the built dist/index.html.
// Usage: npm run build && npm test   (SHOTS=dir to also save screenshots)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

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
// A real (tiny) JPEG for normal uploads; an oversized blob only for the size check.
const sample = await browser.newPage({ viewport: { width: 64, height: 48 } });
await sample.setContent('<body style="margin:0;background:#2a78d6"></body>');
const realJpg = await sample.screenshot({ type: 'jpeg', quality: 70 });
await sample.close();
const jpg = (name, size) => ({ name, mimeType: 'image/jpeg', buffer: size ? Buffer.alloc(size, 0xff) : realJpg });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const errors = [];
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text()) && errors.push(m.text()));
};


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
await customer.getByRole('button', { name: 'คุยกับเจ้าหน้าที่' }).click();
await customer.getByText('@abc-demo').waitFor();
await customer.getByRole('button', { name: 'ปิด', exact: true }).click();

// ---- Path A: choose a package (Class 1) ----
await customer.bringToFront();
const seeBtn = customer.getByRole('button', { name: /ดูแพ็กเกจ/ });
assert.equal(await seeBtn.isDisabled(), true, 'packages locked until car is chosen');
assert.equal(await customer.locator('.si-value').count(), 0, 'no sum insured before brand/model/year');
assert.equal(await customer.getByRole('radio', { name: 'Toyota' }).count(), 0, 'brands are not selectable before a vehicle code');
assert.ok((await customer.locator('.brand-btn.placeholder').count()) > 0, 'brands shown greyed out as a preview');
const cells = await customer.locator('.car-grid > .car-section').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
assert.ok(cells.length === 4 && cells.every((w) => w === cells[0]), `car step uses 4 equal-width cells (${cells})`);
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
await customer.locator('.not-listed').getByRole('button', { name: /ขอเสนอราคา/ }).click();
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
assert.equal(cols, 3, 'packages in 3 columns next to the summary sidebar');
const leadBox = await customer.locator('.lead-box').boundingBox();
assert.ok(leadBox.height < 140, `lead box is a compact horizontal strip (${Math.round(leadBox.height)}px tall)`);
assert.ok(await customer.locator('.pkg-side .quote-side').getByRole('button', { name: 'ขอเสนอราคา' }).isVisible(), 'quote request sits in the sidebar');
await customer.getByText('฿380,000').first().waitFor();
// recommendations, instalments, plain-language cover
assert.equal(await customer.locator('.pkg-card.badge-popular').count(), 1, 'one best seller');
assert.equal(await customer.locator('.pkg-card.badge-value').count(), 1, 'one best value');
assert.ok((await customer.locator('.pkg-card.badge-popular').innerText()).includes('ขายดีที่สุด'));
assert.ok((await customer.locator('.pkg-card.type-T1').first().innerText()).includes('หรือผ่อน 0% 10 เดือน'), 'Class 1 shows monthly instalments');
assert.ok((await customer.locator('.pkg-card.type-T3P').first().locator('.scenarios .no').count()) >= 3, '3+ lists what it does not cover');
log('best seller / best value badges, 0% instalments and plain-language cover shown');
// compare
await customer.locator('.pkg-card.type-T1').first().getByText('เปรียบเทียบ').click();
await customer.locator('.pkg-card.type-T2P').first().getByText('เปรียบเทียบ').click();
await customer.locator('.pkg-card.type-T3P').first().getByText('เปรียบเทียบ').click();
assert.equal(await customer.locator('.pkg-card.type-T3').locator('input[type=checkbox]').isDisabled(), true, 'max 3 to compare');
await customer.getByRole('button', { name: 'เปรียบเทียบเลย' }).click();
const modal = customer.getByRole('dialog', { name: 'เปรียบเทียบแพ็กเกจ' });
await modal.waitFor();
assert.equal(await modal.locator('thead th').count(), 4, 'three packages side by side');
assert.ok((await modal.innerText()).includes('ชนเอง / ไม่มีคู่กรณี'));
if (shots) await customer.screenshot({ path: `${shots}/1b-compare.png` });
const [sh, ch] = await customer.locator('.compare-modal').evaluate((e) => [e.scrollHeight, e.clientHeight]);
assert.ok(sh <= ch, 'comparison fits without a scrollbar');
await modal.getByRole('button', { name: /ปิด/ }).click();
await customer.getByRole('button', { name: 'ล้าง', exact: true }).click();
log('compare up to 3 packages side by side');
// lead capture (same phone as the form, so the later request converts it)
await customer.locator('#lead-contact').fill('12345');
await customer.getByRole('button', { name: 'ส่งราคาให้ฉัน' }).click();
await customer.getByText('กรอกเบอร์มือถือ 10 หลัก หรืออีเมลให้ถูกต้อง').waitFor();
await customer.locator('#lead-contact').fill('081-234-5678');
await customer.getByRole('button', { name: 'ส่งราคาให้ฉัน' }).click();
await customer.getByText(/ส่งราคาไปที่ 0812345678 แล้ว/).waitFor();
await office.locator('.toast', { hasText: 'ผู้สนใจใหม่ 0812345678' }).waitFor({ timeout: 5000 });
log('"send me the price" captures a lead and alerts the back office');
const spill = await customer.locator('.pkg-card').evaluateAll((els) =>
  els.filter((el) => [...el.querySelectorAll('*')].some((c) => c.getBoundingClientRect().right > el.getBoundingClientRect().right + 0.5)).length,
);
assert.equal(spill, 0, 'nothing spills out of a package card (incl. CMI)');
await customer.getByRole('radio', { name: 'ชั้น 1' }).click();
await cards.first().locator('.details-toggle').click();
assert.ok((await cards.first().innerText()).includes('฿380,000'), 'Class 1 own damage uses the chosen sum insured');
if (shots) await customer.screenshot({ path: `${shots}/1-packages.png`, fullPage: true });
await cards.first().getByRole('button', { name: 'เลือกแพ็กเกจนี้', exact: true }).click();
assert.equal(await customer.locator('#f-firstName').inputValue(), 'สมชาย', 'form is prefilled');
await customer.locator('#ocr-id').setInputFiles(jpg('id-card.jpg'));
await customer.getByText('กรอกชื่อ เลขบัตร และที่อยู่จากบัตรแล้ว').waitFor({ timeout: 5000 });
assert.equal(await customer.locator('#f-firstName').inputValue(), 'วิภาวดี', 'name read from the ID photo');
assert.ok((await customer.locator('#f-idCard').getAttribute('class')).includes('ocr-filled'), 'filled fields are highlighted');
log('ID card photo fills name, ID number and address');
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
await office.getByRole('tab', { name: /ผู้สนใจ/ }).click();
await office.locator('.leads-table tr', { hasText: '0812345678' }).first().getByText(refA).waitFor();
await office.getByRole('tab', { name: 'งาน', exact: true }).click();
log('lead marked as converted once the same customer submitted');

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
// Real JPEGs in extreme shapes (tall and wide) must stay inside their tiles.
const shotPage = await browser.newPage({ viewport: { width: 300, height: 1200 } });
await shotPage.setContent('<body style="margin:0;background:linear-gradient(#c33,#33c)"></body>');
const tallJpg = await shotPage.screenshot({ type: 'jpeg', quality: 60 });
await shotPage.setViewportSize({ width: 1600, height: 200 });
const wideJpg = await shotPage.screenshot({ type: 'jpeg', quality: 60 });
await shotPage.close();
assert.ok((await tiles.nth(5).getAttribute('class')).includes('has'), 'ID photo from the form is already attached');
assert.ok((await tiles.nth(2).locator('.angle-guide').count()) === 1, 'empty photo tiles show the angle to shoot');
for (const i of [0, 1]) {
  await inputs.nth(i).setInputFiles({ name: `photo-with-a-very-long-file-name-${i}.jpg`, mimeType: 'image/jpeg', buffer: i === 0 ? tallJpg : wideJpg });
  await tiles.nth(i).locator('.doc-thumb img').waitFor();
}
// left and right taken "on the phone"
await customer.getByRole('button', { name: /ถ่ายด้วยมือถือ/ }).click();
await customer.getByRole('button', { name: /จำลองการเปิดบนมือถือ/ }).click();
await customer.getByRole('button', { name: 'ถ่ายรูป' }).click();
await tiles.nth(2).locator('.doc-thumb img').waitFor();
await customer.getByRole('button', { name: 'ถ่ายรูป' }).click();
await customer.getByText('ถ่ายครบ 4 ด้านแล้ว').waitFor();
if (shots) await customer.screenshot({ path: `${shots}/2b-phone.png` });
await customer.locator('.phone-modal').getByRole('button', { name: 'ปิด', exact: true }).click();
await tiles.nth(3).locator('.doc-thumb img').waitFor();
await inputs.nth(4).setInputFiles(jpg('regbook.jpg'));
await tiles.nth(4).locator('.doc-thumb img').waitFor();
log('left and right photos taken through the simulated phone camera');
for (const i of [0, 1]) {
  const tile = customer.locator('.uploads .doc-tile').nth(i);
  await tile.locator('.doc-thumb img').waitFor();
  const box = await tile.locator('.doc-thumb').boundingBox();
  const img = await tile.locator('.doc-thumb img').boundingBox();
  const t = await tile.boundingBox();
  assert.ok(Math.abs(img.height - box.height) < 1 && Math.abs(img.width - box.width) < 1, `image ${i} fills its frame without overflowing`);
  assert.ok(Math.abs(box.height - (box.width * 3) / 4) < 2, `frame ${i} keeps 4:3`);
  assert.ok(box.x >= t.x && box.x + box.width <= t.x + t.width + 0.5, `frame ${i} inside tile`);
}
await customer.getByText(/แนบเอกสารครบแล้ว ตรวจรูปอีกครั้ง/).waitFor();
if (shots) await customer.screenshot({ path: `${shots}/2-track.png`, fullPage: true });
log('all 6 documents uploaded; tall and wide photos stay inside 4:3 frames');
// Nothing reaches the back office until the customer confirms.
assert.equal(await office.locator('.toast', { hasText: /แนบเอกสารครบ/ }).count(), 0, 'no docs alert before confirming');
await customer.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
const sd = customer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' });
await sd.getByText('รับแจ้งงานแล้ว').waitFor();
await sd.getByText(refA).waitFor();
await sd.getByRole('button', { name: 'ตกลง' }).click();
await customer.getByText('เอกสารครบแล้ว เจ้าหน้าที่กำลังตรวจสอบ').waitFor();
log('Class 1: confirm and send shows "request received"; the back office gets it only then');

// back office: accept → docs review → issue
await office.bringToFront();
await office.locator('#bo-q').fill(refA);
await office.locator('.case-row', { hasText: refA }).click();
await office.getByText(/ลูกค้าปรับ \+2\.7% จากทุนแนะนำ ฿370,000/).waitFor();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ตรวจเอกสาร' }).waitFor();
assert.equal(await office.locator('.case-detail .doc-thumb img').count(), 6, 'staff sees uploaded images');
// Staff asks for the ID card again: the customer re-attaches it and confirms again.
await office.getByRole('button', { name: 'ขอเอกสารใหม่', exact: true }).click();
await office.locator('.inline-confirm').getByText('สำเนาบัตรประชาชน').click();
await office.locator('.inline-confirm').getByRole('button', { name: /ส่ง/ }).click();
await office.locator('.case-detail .pill', { hasText: 'รอเอกสาร' }).waitFor();
await customer.bringToFront();
await customer.locator('.uploads .doc-tile').nth(5).locator('input[type=file]').setInputFiles(jpg('id-again.jpg'));
await customer.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
await customer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' }).getByRole('button', { name: 'ตกลง' }).click();
await office.bringToFront();
await office.locator('.case-detail .pill', { hasText: 'ตรวจเอกสาร' }).waitFor({ timeout: 5000 });
log('re-upload request: the customer replaced the ID card and confirmed again');
await office.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor();
log('back office accepted and issued the policy');
await customer.bringToFront();
await customer.getByText(/ออกกรมธรรม์แล้ว เลขที่/).waitFor({ timeout: 5000 });
log('customer tab updated to issued');
// after issue: digital card, claim, renewal, referral
await customer.locator('.digital-card', { hasText: refA === '' ? 'x' : 'ABC' }).waitFor();
await customer.getByRole('button', { name: 'แจ้งเคลม' }).click();
await customer.getByRole('button', { name: 'ส่งเรื่องแจ้งเคลม' }).click();
await customer.getByText('กรุณาระบุสถานที่เกิดเหตุ').waitFor();
await customer.locator('#claim-place').fill('ถนนวิภาวดีฯ ขาเข้า');
await customer.getByRole('button', { name: 'ส่งเรื่องแจ้งเคลม' }).click();
await customer.getByText(/รับเรื่องแล้ว เลขเคลม CL-\d{6}/).waitFor();
if (shots) await customer.screenshot({ path: `${shots}/2c-claim.png` });
await customer.locator('.claim-modal').getByRole('button', { name: 'ปิด', exact: true }).first().click();
await office.locator('.toast', { hasText: 'แจ้งเคลม' }).waitFor({ timeout: 5000 });
await customer.getByRole('button', { name: /ดูตัวอย่างอีเมลเตือน/ }).click();
await customer.getByText('ส่งตัวอย่างไปที่กล่องอีเมลจำลองแล้ว').waitFor();
assert.match(await customer.locator('.refer-row code').innerText(), /^ABC-/);
if (shots) await customer.screenshot({ path: `${shots}/2d-issued.png`, fullPage: true });
log('digital card, claim report (back office alerted), renewal reminder and referral code');

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
await customer.getByRole('radio', { name: '13:00–17:00' }).click();
await customer.getByRole('button', { name: /ถัดไป/ }).click();
await customer.getByRole('button', { name: 'ส่งคำขอเสนอราคา', exact: true }).click();
const refB = (await customer.locator('.ref-big').innerText()).trim();
await customer.locator('.eta-chip', { hasText: 'เจ้าหน้าที่จะส่งราคาให้ภายใน' }).waitFor();
log(`quote request submitted: ${refB}`);

await office.bringToFront();
await office.locator('#bo-q').fill(refB);
await office.locator('.case-row', { hasText: refB }).click();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.getByText('โทรกลับ 13:00–17:00').waitFor();
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
await customer.getByText(/แนบเอกสารครบแล้ว ตรวจรูปอีกครั้ง/).waitFor();
log('customer accepted quote and uploaded 2 documents');

// Class 2+ quote: confirm, pay in the dialog, issued without waiting for staff.
await customer.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
const sdB = customer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' });
await sdB.getByRole('button', { name: /และออกกรมธรรม์/ }).click();
await sdB.getByRole('heading', { name: 'ออกกรมธรรม์แล้ว', exact: true }).waitFor({ timeout: 5000 });
await sdB.getByRole('button', { name: 'ตกลง' }).click();
await office.bringToFront();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor({ timeout: 5000 });
log('quote case confirmed, paid and issued');

// ---- Dashboard + language ----
await office.getByRole('button', { name: 'Dashboard', exact: true }).click();
await office.getByRole('heading', { name: 'Performance Report' }).waitFor();
const kpi = await office.locator('.kpi-value').first().innerText();
assert.ok(Number(kpi.replace(/\D/g, '')) > 0, 'dashboard shows issued policies');
assert.ok((await office.locator('.chart .bar').count()) > 5, 'production chart has bars');
const processFunnel = office.locator('.funnel').last();
assert.equal(await processFunnel.locator('li:not(.fn-head)').count(), 10, 'funnel starts from page visits');
assert.ok((await processFunnel.locator('li:not(.fn-head)').first().innerText()).includes('เข้าชมหน้าเว็บ'));
const [fw, sw] = await office.locator('.dash-2col > .card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
assert.equal(fw, sw, 'funnel and SLA cards are the same width');
if (shots) await office.screenshot({ path: `${shots}/4-dashboard.png`, fullPage: true });
await office.getByRole('radio', { name: 'EN' }).click();
await office.getByText('Policies issued', { exact: true }).waitFor();
await office.getByRole('button', { name: 'Customer', exact: true }).waitFor();
log('dashboard renders and switches to English');

await office.getByRole('button', { name: 'Mail outbox', exact: true }).click();
await office.locator('.mail-row', { hasText: refB }).first().waitFor();
await office.locator('.mail-row', { hasText: /Time to renew|ใกล้ถึงเวลาต่ออายุ/ }).first().waitFor();
await office.locator('.mail-row', { hasText: /Claim CL-|รับเรื่องแจ้งเคลม/ }).first().waitFor();
await office.locator('.mail-row', { hasText: `แนบเอกสารสำหรับ ${refA}` }).first().waitFor().catch(async () => office.locator('.mail-row', { hasText: `Documents needed for ${refA}` }).first().waitFor());
log('mailbox lists the emails (incl. renewal reminder and claim receipt)');

// ---- Path C: car not in the list → typed in → quote request ----
await customer.bringToFront();
await customer.getByRole('tab', { name: 'ซื้อประกัน' }).click();
await customer.getByRole('button', { name: 'เริ่มคำขอใหม่', exact: true }).click().catch(() => {});
await customer.locator('.not-listed').getByRole('button', { name: /ขอเสนอราคา/ }).click();
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
await customer.getByRole('radio', { name: /ผ่อน 0% 6 เดือน/ }).click();
assert.ok((await customer.locator('.pay-btn').innerText()).includes('/เดือน'), 'pay button shows the monthly amount');
if (shots) await customer.screenshot({ path: `${shots}/8-checkout.png`, fullPage: true });
await customer.locator('.pay-btn').click();
await customer.getByRole('heading', { name: 'ชำระเงินสำเร็จ ออกกรมธรรม์แล้ว' }).waitFor({ timeout: 5000 });
await customer.getByText(/จัดส่งกรมธรรม์ทาง EMS เลขพัสดุ EB\d{9}TH/).waitFor();
await customer.getByText(/ผ่อน 0% 6 เดือน/).waitFor();
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

// ---- Class 3 package: confirm, pay in the dialog, policy issued straight away ----
await customer.bringToFront();
await customer.getByRole('tab', { name: 'ซื้อประกัน' }).click();
await customer.getByRole('radio', { name: /^110/ }).click();
await customer.getByRole('radio', { name: 'Honda' }).click();
await customer.locator('#car-model').selectOption('honda-city');
await customer.locator('#car-year').selectOption('2022');
await customer.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
await customer.locator('.pkg-card.type-T3').first().getByRole('button', { name: 'เลือกแพ็กเกจนี้', exact: true }).click();
await customer.getByRole('button', { name: 'ยืนยันและแจ้งงาน', exact: true }).click();
const refT3 = (await customer.locator('.ref-big').innerText()).trim();
await customer.getByRole('button', { name: 'ติดตามคำขอ / แนบเอกสาร', exact: true }).click();
await customer.getByRole('button', { name: /ใช้ข้อมูลจำลอง/ }).click();
await customer.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
const sd3 = customer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' });
await sd3.getByRole('radio', { name: /กรมธรรม์กระดาษ/ }).click();
await sd3.getByRole('button', { name: /และออกกรมธรรม์/ }).click();
await sd3.getByRole('heading', { name: 'ออกกรมธรรม์แล้ว', exact: true }).waitFor({ timeout: 5000 });
await sd3.getByText(/EMS เลขพัสดุ EB/).waitFor();
await sd3.getByRole('button', { name: 'ตกลง' }).click();
await office.locator('.toast', { hasText: refT3 }).first().waitFor({ timeout: 5000 });
log(`Class 3 ${refT3}: sample documents, confirm, paid in the dialog and the policy is issued at once`);

// ---- Business Partner channel ----
const thai = (p) => p.getByRole('radio', { name: 'TH' }).click();
await thai(office);
const agent = await ctx.newPage();
watch(agent);
await agent.goto(url + '?a=1#customer');
await thai(agent);
// Partners sign in from the customer site: partner code, then OTP to the registered phone.
await agent.getByRole('button', { name: 'สำหรับตัวแทน' }).click();
await agent.locator('#pl-code').fill('AG-9999');
await agent.getByRole('button', { name: 'ส่ง OTP' }).click();
await agent.getByText('ไม่พบรหัสตัวแทนนี้').waitFor();
await agent.locator('#pl-code').fill('ag-1002');
await agent.getByRole('button', { name: 'ส่ง OTP' }).click();
await agent.getByText(/089-xxx-2202/).waitFor();
await agent.locator('#pl-otp').fill('111111');
await agent.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
await agent.getByText('รหัส OTP ไม่ถูกต้อง').waitFor();
await agent.getByRole('button', { name: 'ใส่รหัสตัวอย่าง' }).click();
await agent.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
await agent.getByRole('heading', { name: 'วันเพ็ญ ศรีสวัสดิ์' }).waitFor();
assert.equal(await agent.locator('.mainnav .nav-agent').count(), 0, 'no partner item in the top menu');
log('partner signed in from the customer page with code AG-1002 and OTP to the registered phone');
const direct = await ctx.newPage();
await direct.goto(url + '?d=9#agent');
await direct.locator('#pl-code').waitFor();
assert.equal(await direct.locator('.agent-app').count(), 0, 'partner screen needs sign-in');
await direct.close();
await agent.locator('#ag-brand').selectOption('honda');
await agent.locator('#ag-model').selectOption('honda-city');
await agent.locator('#ag-year').selectOption('2023');
await agent.getByRole('radio', { name: 'ออกใบเสนอราคา' }).click();
const rows = agent.locator('.ag-pkg-table tbody tr');
const types = await rows.locator('.type-tag').allInnerTexts();
const pickIdx = [0, types.findIndex((x) => x.includes('2+')), types.findIndex((x) => x.includes('3+'))];
for (const i of pickIdx) await rows.nth(i).click();
assert.equal(await agent.locator('.ag-pkg-table tbody tr.on').count(), 3, 'three packages picked for the quotation');
await agent.locator('#ag-disc').fill('5');
await agent.getByText(/คอมฯ .* − ส่วนลด .* = เหลือ/).first().waitFor();
await agent.getByRole('button', { name: 'ออกใบเสนอราคา 3 แบบ' }).click();
const quoteId = (await agent.getByRole('heading', { name: /ออกใบเสนอราคา Q-/ }).innerText()).match(/Q-[\w-]+/)[0];
await agent.getByRole('button', { name: 'คัดลอกลิงก์' }).click();
await agent.getByRole('button', { name: '✓ ส่งแล้ว' }).waitFor();
await agent.getByRole('button', { name: 'LINE' }).click();
await agent.locator('.line-bubble', { hasText: quoteId }).waitFor();
await agent.getByRole('button', { name: 'ส่งทาง LINE (จำลอง)' }).click();
log(`agent quotation ${quoteId}: 3 packages, 5% discount out of commission, sent by link and LINE`);

// Renewal report: 1/2/3-month summary, priority list, premium received vs expected.
await agent.getByRole('tab', { name: /รายงานต่ออายุ/ }).click();
assert.equal(await agent.locator('#rr-months').inputValue(), '1', 'renewal report defaults to 1 month');
const due1 = await agent.locator('.rr-count .rr-money-v').innerText();
await agent.getByText('เบี้ยที่ได้รับจากงานต่ออายุแล้ว').waitFor();
await agent.getByText('เบี้ยที่คาดว่าจะได้รับ').waitFor();
const expiries = await agent.locator('.rr-table tbody tr').evaluateAll((rows) => rows.map((r) => r.querySelector('.pill')?.textContent ?? ''));
const toDays = (x) => (x.startsWith('เลยมา') ? -1 : 1) * Number(x.replace(/\D/g, ''));
const ds = expiries.map(toDays);
assert.ok(ds.length > 0 && ds.every((d, i) => i === 0 || d >= ds[i - 1]), 'not-renewed list sorted by nearest expiry');
await agent.locator('#rr-months').selectOption('3');
const due3 = await agent.locator('.rr-count .rr-money-v').innerText();
assert.ok(Number(due3.replace(/\D/g, '')) >= Number(due1.replace(/\D/g, '')), '3 months covers at least as many as 1 month');
const firstRow = agent.locator('.rr-table tbody tr', { has: agent.getByRole('button', { name: 'ออกใบเสนอต่ออายุ' }) }).first();
const renewName = await firstRow.locator('td b').first().innerText();
await firstRow.getByRole('button', { name: 'ออกใบเสนอต่ออายุ' }).click();
await agent.getByText(/กรอกข้อมูลจากกรมธรรม์เดิมให้แล้ว/).waitFor();
assert.equal(await agent.locator('#ag-c-firstName').inputValue(), renewName.split(' ')[0], 'renewal prefills the customer');
await agent.getByRole('tab', { name: /ขาย/ }).click();
log('renewal report: 1/2/3-month summary, list by priority, premium received and expected; renewal prefills a quotation');
// Renewing with ABC: no documents, payment issues the new policy.
await agent.getByRole('radio', { name: 'ซื้อเลย' }).click();
await agent.locator('.ag-pkg-table tbody tr').first().click();
await agent.getByText('ตัวแทนเก็บเงินแล้วนำส่ง ABC ภายใน 15 วัน').first().click();
await agent.getByText(/ลูกค้ารับทราบความคุ้มครอง/).click();
await agent.getByRole('button', { name: 'ยืนยันซื้อแทนลูกค้า' }).click();
await agent.getByText(/ต่ออายุกับ ABC ไม่ต้องแนบเอกสาร/).waitFor();
assert.equal(await agent.locator('.ag-case-detail .uploads').count(), 0, 'renewal asks for no documents');
await agent.getByRole('button', { name: /เก็บเงินจากลูกค้าแล้ว/ }).click();
await agent.locator('.ag-case-detail .pill', { hasText: 'ออกกรมธรรม์' }).first().waitFor({ timeout: 5000 });
log('renewal with ABC: no documents, the partner collected the money and the new policy was issued');

const buyer = await ctx.newPage();
watch(buyer);
await buyer.goto(url + `?c=1#offer/${quoteId}`);
await thai(buyer);
await buyer.getByText('หน้าที่ลูกค้าเห็นเมื่อเปิดลิงก์').waitFor();
assert.equal(await buyer.locator('.offer-opt').count(), 3);
assert.ok((await buyer.locator('.offer-opt s').count()) >= 2, 'full price shown struck through next to the discounted price');
assert.equal(await buyer.getByText(/คอมมิชชัน|คอมฯ/).count(), 0, 'customer never sees commission');
await agent.bringToFront();
await agent.getByRole('tab', { name: /ใบเสนอราคา/ }).click();
await agent.locator('tr', { hasText: quoteId }).getByText('ลูกค้าเปิดดูแล้ว').waitFor({ timeout: 5000 });
log('customer opened the link; the agent sees it opened');

await buyer.bringToFront();
await buyer.locator('.offer-opt').nth(1).click();
await buyer.getByRole('button', { name: 'เลือกแบบนี้และยืนยัน' }).click();
await buyer.getByRole('button', { name: /ยืนยันซื้อ/ }).click();
await buyer.getByText('กรอกรหัส OTP 6 หลัก').waitFor();
await buyer.getByRole('button', { name: 'ใส่รหัสตัวอย่าง' }).click();
await buyer.getByRole('button', { name: /ยืนยันซื้อ/ }).click();
const refD = (await buyer.locator('.ok-note').first().innerText()).match(/ABC-[\d-]+/)[0];
await buyer.getByRole('button', { name: 'ชำระเงิน (จำลอง)' }).click();
await buyer.getByText(/ชำระเงินแล้ว/).waitFor();
const inputsD = buyer.locator('.uploads input[type=file]');
await inputsD.nth(0).setInputFiles(jpg('reg.jpg'));
await buyer.locator('.uploads .doc-tile.has').first().waitFor();
await inputsD.nth(1).setInputFiles(jpg('id.jpg'));
await buyer.getByText(/แนบเอกสารครบแล้ว ตรวจรูปอีกครั้ง/).waitFor();
await buyer.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
await buyer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' }).getByText('รับแจ้งงานแล้ว').waitFor();
await buyer.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' }).getByRole('button', { name: 'ตกลง' }).click();
log(`customer chose option 2 with OTP, paid through the link and attached documents: ${refD}`);

await office.bringToFront();
await office.locator('.nav-backoffice').click();
await office.locator('#bo-channel').selectOption('a3');
await office.locator('#bo-q').fill(refD);
await office.locator('.case-row', { hasText: refD }).locator('.src-agent').waitFor();
await office.locator('.case-row', { hasText: refD }).click();
await office.locator('.agent-box', { hasText: 'วันเพ็ญ ศรีสวัสดิ์' }).waitFor();
await office.locator('.agent-box').getByText('ตามเกณฑ์').waitFor();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor();
log('back office sees the agent, discount and payment; issued the policy');

// Buy on the spot: agent confirms with consent and collects the money.
await agent.bringToFront();
await agent.getByRole('tab', { name: /ขาย/ }).click();
await agent.locator('#ag-code').selectOption('110');
await agent.getByRole('radio', { name: 'ซื้อเลย' }).click();
await agent.locator('#ag-brand').selectOption('toyota');
await agent.locator('#ag-model').selectOption('toyota-yaris-ativ');
await agent.locator('#ag-year').selectOption('2024');
const rows2 = agent.locator('.ag-pkg-table tbody tr');
const types2 = await rows2.locator('.type-tag').allInnerTexts();
await rows2.nth(types2.findIndex((x) => x.includes('3+'))).click();
await agent.getByText('ตัวแทนเก็บเงินแล้วนำส่ง ABC ภายใน 15 วัน').first().click();
await agent.getByRole('button', { name: 'ยืนยันซื้อแทนลูกค้า' }).click();
await agent.getByText('ติ๊กยืนยันว่าลูกค้ายินยอมก่อน').waitFor();
await agent.getByText(/ลูกค้ารับทราบความคุ้มครอง/).click();
await agent.getByRole('button', { name: 'ยืนยันซื้อแทนลูกค้า' }).click();
const refE = (await agent.locator('.ag-case-detail .eyebrow').first().innerText()).match(/ABC-[\d-]+/)[0];
await agent.locator('.ag-case-detail .uploads').getByRole('button', { name: /ใช้ข้อมูลจำลอง/ }).click();
await agent.getByText(/แนบเอกสารครบแล้ว ตรวจรูปอีกครั้ง/).waitFor({ timeout: 15000 });
await agent.getByRole('button', { name: 'ยืนยันการส่งข้อมูล' }).click();
await agent.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' }).getByText('รับแจ้งงานแล้ว').waitFor();
await agent.getByRole('dialog', { name: 'ยืนยันการส่งข้อมูล' }).getByRole('button', { name: 'ตกลง' }).click();
assert.equal(await agent.locator('.ag-case-detail .doc-tile.has').count(), 2, 'sample files attached for every missing document');
await agent.getByRole('button', { name: /เก็บเงินจากลูกค้าแล้ว/ }).click();
log(`agent sold 3+ on the spot with consent, attached sample documents in one click and collected the money: ${refE}`);

await office.bringToFront();
await office.locator('#bo-channel').selectOption('agent');
await office.locator('#bo-q').fill(refE);
await office.locator('.case-row', { hasText: refE }).click();
await office.getByRole('button', { name: 'รับเรื่อง', exact: true }).click();
await office.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์', exact: true }).click();
await office.locator('.case-detail .pill', { hasText: 'ออกกรมธรรม์' }).waitFor();
await agent.bringToFront();
await agent.getByRole('button', { name: 'แจ้งว่านำส่งเบี้ยแล้ว' }).click();
await office.bringToFront();
await office.locator('.toast', { hasText: /แจ้งนำส่งเบี้ยงาน/ }).first().waitFor({ timeout: 5000 });
await office.getByRole('tab', { name: /นำส่งเบี้ย/ }).click();
await office.locator('tr', { hasText: refE }).getByText('ตัวแทนแจ้งว่าโอนแล้ว').waitFor();
await office.locator('tr', { hasText: refE }).getByRole('button', { name: 'บันทึกรับเงินนำส่ง' }).click();
await office.locator('#bo-remit-show').selectOption('all');
await office.locator('tr', { hasText: refE }).getByText('ตามเกณฑ์').waitFor();
await agent.bringToFront();
await agent.getByText(/ABC ได้รับเงินนำส่งแล้ว/).waitFor({ timeout: 5000 });
log('agent reported the remittance; back office was alerted and recorded it');

// Marketing: performance, targets, suspension, reminders.
const mkt = await ctx.newPage();
watch(mkt);
await mkt.goto(url + '?m=1#marketing');
await thai(mkt);
await mkt.locator('#mkt-as').selectOption('m2');
await mkt.locator('.agent-table tr', { hasText: 'วันเพ็ญ ศรีสวัสดิ์' }).waitFor();
assert.equal(await mkt.locator('.agent-table tbody tr').count(), 2, 'marketing sees only their two agents');
await mkt.getByRole('tab', { name: /ตั้งเป้า/ }).click();
const target = mkt.getByRole('spinbutton', { name: /AG-1002/ });
await target.fill('40000');
await target.blur();
assert.equal(await mkt.locator('.agent-manage select').count(), 0, 'marketing cannot reassign partners');
await mkt.locator('.agent-manage tr', { hasText: 'AG-1002' }).getByText('%').first().waitFor();
await mkt.locator('tr', { hasText: 'อดิศร ทองมา' }).getByRole('button', { name: 'ระงับ' }).click();
await agent.bringToFront();
const probe = await ctx.newPage();
await probe.goto(url + '?p=1#customer');
await thai(probe);
await probe.getByRole('button', { name: 'สำหรับตัวแทน' }).click();
await probe.locator('#pl-code').fill('AG-1003');
await probe.getByRole('button', { name: 'ส่ง OTP' }).click();
await probe.getByText(/บัญชีนี้ถูกระงับชั่วคราว/).waitFor();
await probe.close();
await agent.getByRole('tab', { name: /ผลงานของฉัน/ }).click();
await agent.getByText(/เป้า ฿40,000/).waitFor({ timeout: 5000 });
await mkt.bringToFront();
await mkt.locator('tr', { hasText: 'อดิศร ทองมา' }).getByRole('button', { name: 'เปิดใช้' }).click();
await mkt.getByRole('tab', { name: 'การต่ออายุ' }).click();
await mkt.getByRole('heading', { name: 'อัตราการต่ออายุราย Business Partner' }).waitFor();
assert.equal(await mkt.locator('.rr-agents tbody tr').count(), 2, 'renewal rate per partner in the group');
assert.ok((await mkt.locator('.rr-table thead th', { hasText: 'ตัวแทน' }).count()) > 0, 'renewal list shows the partner');
await mkt.locator('.rr-table tbody tr').getByRole('button', { name: 'ทวงถาม' }).first().click();
await mkt.locator('.rr-table').getByText('✓ ทวงแล้ว').first().waitFor();
await mkt.getByRole('tab', { name: /ติดตามงาน/ }).click();
await mkt.getByRole('button', { name: 'ทวงถาม' }).first().click();
await mkt.getByText('✓ ทวงแล้ว').first().waitFor();
log('marketing sees own partners, renewal rate overall and per partner, changed a target, suspended/reactivated a partner, sent reminders');

await office.bringToFront();
await office.getByRole('button', { name: 'Dashboard', exact: true }).click();
await office.getByRole('heading', { name: 'อันดับ Business Partner' }).waitFor();
await office.getByRole('heading', { name: 'Funnel ตัวแทน' }).waitFor();
await office.getByRole('heading', { name: 'Performance งานต่ออายุ' }).waitFor();
assert.equal(await office.locator('.ren-table tbody tr').count(), 4, 'renewals in four expiry buckets');
await office.locator('#d-channel').selectOption('direct');
assert.equal(await office.getByRole('heading', { name: 'อันดับ Business Partner' }).count(), 0, 'direct channel hides agent ranking');
await office.locator('#d-mkt').selectOption('m2');
assert.equal(await office.locator('.agent-table tbody tr').count(), 2, 'marketing filter narrows the ranking');
await office.locator('#d-mkt').selectOption('all');
await office.locator('#d-channel').selectOption('all');
await office.getByRole('button', { name: 'อีเมลจำลอง', exact: true }).click();
await office.getByRole('radio', { name: 'ถึงตัวแทน' }).click();
await office.locator('.mail-row').first().waitFor();
await office.getByRole('radio', { name: 'ทั้งหมด' }).click();
await office.locator('.mail-row', { hasText: quoteId }).first().waitFor();
log('dashboard shows agent ranking, funnel, payments and renewals; emails to agents and the quotation email');

// VP: marketing targets, ranking, rolling 12 months, partner performance.
await office.locator('.nav-vp').click();
await office.getByRole('heading', { name: 'ภาพรวมช่องทาง Business Partner' }).waitFor();
assert.equal(await office.locator('.vp-mkt').count(), 3, 'three marketing officers under the VP');
assert.equal(await office.locator('.vp-agents tbody tr').count(), 6, 'all six partners');
assert.equal(await office.locator('.cluster-legend span').count(), 6, 'one bar per partner in each month');
assert.ok((await office.locator('.cluster-chart path').count()) > 60, 'clustered bars for 12 months');
await office.locator('#vp-group').getByRole('radio', { name: 'Marketing' }).click();
assert.equal(await office.locator('.cluster-legend span').count(), 3, 'group by marketing officer');
await office.locator('#vp-group').getByRole('radio', { name: 'Partner' }).click();
await office.getByRole('button', { name: 'ดูเป็นตาราง' }).last().click();
assert.equal(await office.locator('.vp-app table.data').first().locator('tbody tr').count(), 12, '12 monthly rows');
await office.locator('#vp-mkt').selectOption('m1');
assert.equal(await office.locator('.vp-agents tbody tr').count(), 2, 'marketing filter narrows partners');
await office.locator('#vp-mkt').selectOption('all');
await office.getByRole('combobox', { name: /AG-1004/ }).selectOption('m1');
await office.locator('#vp-mkt').selectOption('m1');
assert.equal(await office.locator('.vp-agents tbody tr').count(), 3, 'VP reassigned a partner to another officer');
await office.getByRole('combobox', { name: /AG-1004/ }).selectOption('m3');
await office.locator('#vp-mkt').selectOption('m1');
await office.getByRole('radio', { name: 'เดือนนี้' }).click();
await office.getByText(/ยอดถึงวันนี้/).first().waitFor();
assert.ok((await office.locator('.vp-agents .pill').first().innerText()).match(/%/), 'loss ratio shown per partner');
log('VP sees marketing targets and ranking, rolling 12 months, partner GWP, renewal and loss ratio, and assigns partners to officers');

// ---- Products: edit, versions, commission, end date, Excel round trip ----
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('abc-motor-demo-v1')));
const prod = (st, id) => st.products.find((p) => p.id === id);
await office.locator('.nav-backoffice').click();
await office.getByRole('tab', { name: 'ผลิตภัณฑ์' }).click();
assert.equal(await office.locator('.pd-table tbody tr').count(), 11, 'catalogue starts with 11 products');
const offered = (await state(office)).proposals.find((p) => p.id === quoteId).options.find((o) => o.pkg.id === 'T2P-200000');
assert.ok(offered, 'the earlier quotation offered Class 2+ 200,000');
const pdRow = (id) => office.locator('.pd-table tbody tr').filter({ has: office.locator('.pd-name + .hint', { hasText: new RegExp(`^${id}$`) }) });
const editRow = async (id) => {
  await pdRow(id).getByRole('button', { name: 'แก้ไข' }).click();
  await office.getByRole('button', { name: 'บันทึกเป็นเวอร์ชันใหม่' }).waitFor();
};
const saveEdit = async (note) => {
  if (note) await office.locator('#pd-note').fill(note);
  await office.getByRole('button', { name: 'บันทึกเป็นเวอร์ชันใหม่' }).click();
  await office.locator('.pd-save .ok-note').waitFor();
};
const backToList = () => office.getByRole('button', { name: /กลับไปรายการ/ }).click();
await editRow('T2P-200000');
await office.locator('#pd-r0-110').fill('9200');
await saveEdit('ปรับเบี้ยทดสอบ');
await office.getByText('บันทึกแล้ว (v2)').waitFor();
assert.equal(await office.locator('.pd-history li').count(), 2, 'history lists both versions');
let st = await state(office);
assert.equal(prod(st, 'T2P-200000').rates[0].prices['110'], 9200);
assert.equal(st.proposals.find((p) => p.id === quoteId).options.find((o) => o.pkg.id === 'T2P-200000').pkg.premium, offered.pkg.premium, 'quotation already sent keeps its price');
const shop = await ctx.newPage();
watch(shop);
await shop.goto(url + '?s=1#customer');
await thai(shop);
await shop.getByRole('radio', { name: /^110/ }).click();
await shop.getByRole('radio', { name: 'Toyota' }).click();
await shop.locator('#car-model').selectOption('toyota-yaris-ativ');
await shop.locator('#car-year').selectOption('2020');
await shop.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
await shop.locator('.pkg-card', { hasText: 'ชั้น 2+ ทุน 200,000' }).getByText('฿9,200').waitFor();
log('product edit saved as v2: new price on the customer site, the quotation already sent keeps its price');
office.once('dialog', (d) => d.accept());
await office.locator('.pd-history li', { hasText: 'v1' }).getByRole('button', { name: /ย้อนกลับ/ }).click();
await office.getByText('ย้อนกลับจาก v1').waitFor();
st = await state(office);
assert.equal(prod(st, 'T2P-200000').ver, 3);
assert.equal(prod(st, 'T2P-200000').rates[0].prices['110'], 8900, 'rollback restores the v1 price as v3');
await backToList();
log('rolled back to v1, saved as v3; history kept');

// Commission: product special rate for everyone, a partner's own rate wins over it.
await editRow('T3');
await office.locator('#pd-pc-a3').fill('17');
await saveEdit();
await backToList();
await agent.getByRole('tab', { name: 'ผลิตภัณฑ์' }).click();
await agent.locator('.ct-card', { hasText: 'ชั้น 1 EV Plus' }).getByText('ค่าคอม 20%').waitFor();
await agent.locator('.ct-card', { hasText: 'ชั้น 1 ซ่อมอู่' }).getByText('ค่าคอม 18%').waitFor();
await agent.locator('.ct-card', { hasText: 'ชั้น 3' }).filter({ hasNotText: '3+' }).getByText('ค่าคอม 17%').waitFor();
log('partner catalogue shows standard 18%, product special 20% and the partner\'s own 17% on Class 3');

// Closing a channel and the end date.
await office.locator('label.switch', { has: office.locator('#pd-partner-T3P-100000') }).click();
await editRow('T1-EV-PLUS');
const yesterday = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
await office.locator('#pd-until').fill(yesterday);
await saveEdit();
await backToList();
await pdRow('T1-EV-PLUS').getByText('หมดเวลาขาย').waitFor();
await agent.getByRole('tab', { name: 'ขาย' }).click();
await agent.getByRole('tab', { name: 'ผลิตภัณฑ์' }).click();
await agent.locator('.ct-card').first().waitFor();
assert.equal(await agent.locator('.ct-card', { hasText: 'ชั้น 1 EV Plus' }).count(), 0, 'ended product hidden from partners');
assert.equal(await agent.locator('.ct-card', { hasText: 'ทุน 100,000' }).count(), 0, 'product closed to partners');
await shop.getByRole('tab', { name: 'ผลิตภัณฑ์' }).click();
await shop.locator('.ct-card', { hasText: 'ชั้น 3+ ทุน 100,000' }).waitFor();
assert.equal(await shop.locator('.ct-card', { hasText: 'ชั้น 1 EV Plus' }).count(), 0, 'ended product hidden from customers');
await shop.locator('.ct-card', { hasText: 'ชั้น 2+ ทุน 300,000' }).getByRole('button', { name: 'รายละเอียด' }).click();
await shop.getByRole('dialog').getByText('รถอายุไม่เกิน 15 ปี').waitFor();
await shop.getByRole('dialog').getByRole('button', { name: 'เช็คเบี้ยรถคุณ' }).click();
await shop.locator('.type-opt.on', { hasText: '2+' }).waitFor();
log('closed to partners and past its end date: hidden from partner and customer catalogues; "check your price" opens the class');

// New product from the standard cover button.
await office.locator('#pd-new-type').selectOption('T2P');
await office.getByRole('button', { name: '+ สร้างแพ็กเกจ' }).click();
await office.locator('#pd-ownDamage-mode').selectOption('none');
await office.locator('#pd-doc-regbook').uncheck();
await office.getByRole('button', { name: /ใส่ความคุ้มครองมาตรฐานชั้น 2\+/ }).click();
assert.equal(await office.locator('#pd-ownDamage-mode').inputValue(), 'fixed', 'standard cover restored');
assert.equal(await office.locator('#pd-ownDamage-val').inputValue(), '200000');
assert.equal(await office.locator('#pd-doc-regbook').isChecked(), true, 'standard documents restored');
await office.locator('#pd-ownDamage-val').fill('250000');
await office.locator('#pd-nameTh').fill('ชั้น 2+ ทดสอบ');
await saveEdit();
await backToList();
assert.equal(await office.locator('.pd-table tbody tr').count(), 12);
st = await state(office);
const created = st.products.find((p) => p.nameTh === 'ชั้น 2+ ทดสอบ');
assert.ok(created && created.ownDamage.value === 250000 && !created.channels.self && !created.channels.partner, 'new product saved, closed for sale');
log('new product: standard 2+ cover filled in by the button, then adjusted; saved closed for sale');

// Excel: export, edit (as Excel would, deflated), import with a review of changes and errors.
const unzip = (buf) => {
  const out = new Map();
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(end + 16);
  for (let n = buf.readUInt16LE(end + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString();
    const local = buf.readUInt32LE(p + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
};
const zipDeflated = (files) => {
  const parts = [], central = [];
  let off = 0;
  for (const [name, data] of files) {
    const nb = Buffer.from(name), comp = deflateRawSync(data), crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26);
    parts.push(h, nb, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nb);
    off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.size, 8); e.writeUInt16LE(files.size, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
};
const [download] = await Promise.all([office.waitForEvent('download'), office.getByRole('button', { name: /Export Excel/ }).click()]);
assert.match(download.suggestedFilename(), /^abc-products-.*\.xlsx$/);
const files = unzip(readFileSync(await download.path()));
const sheetsXml = [...files.keys()].filter((k) => k.startsWith('xl/worksheets/'));
assert.equal(sheetsXml.length, 13, 'guide sheet + 12 product sheets');
const sheetOf = (id) => sheetsXml.find((k) => files.get(k).toString().includes(`<t xml:space="preserve">${id}</t></is></c></row>`));
const t3 = sheetOf('T3'), t2 = sheetOf('T2');
files.set(t3, Buffer.from(files.get(t3).toString().replace('<v>2290</v>', '<v>2390</v>')));
files.set(t2, Buffer.from(files.get(t2).toString().replace('<t xml:space="preserve">Y</t>', '<t xml:space="preserve">X</t>')));
await office.locator('#pd-import').setInputFiles({ name: 'edited.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: zipDeflated(files) });
const review = office.getByRole('dialog', { name: 'ตรวจก่อนนำเข้า' });
await review.waitFor();
assert.equal(await review.locator('.pd-imp-changed').count(), 1, 'one product changed');
assert.equal(await review.locator('.pd-imp-error').count(), 1, 'one sheet with an error');
await review.locator('.pd-imp-error').getByText(/ใส่ Y หรือ N/).waitFor();
await review.locator('.pd-imp-changed').getByText(/฿2,290 → ฿2,390/).waitFor();
await review.getByRole('button', { name: 'ยืนยันนำเข้า 1 แพ็กเกจ' }).click();
await office.getByText('นำเข้าแล้ว 1 แพ็กเกจ').waitFor();
st = await state(office);
assert.equal(prod(st, 'T3').rates[0].prices['110'], 2390, 'imported price saved');
assert.equal(prod(st, 'T3').partnerCommission.a3, 17, 'import keeps settings the sheet does not carry');
assert.equal(prod(st, 'T2').channels.self, true, 'sheet with an error skipped');
assert.equal(st.productLog[0].note, 'import');
log('Excel export (13 sheets) edited and re-imported: review shows the price change and the bad sheet; only the good one saved');

await office.getByRole('button', { name: 'Dashboard', exact: true }).click();
assert.ok((await office.locator('.dash-products tbody tr').count()) > 3, 'dashboard sales by product');
log('dashboard shows sales by product with partner share, commission and win rate');

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
