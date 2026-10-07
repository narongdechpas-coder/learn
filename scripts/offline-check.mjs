// Opens the offline build straight from disk with every network request blocked and checks
// that fonts, sample data, the customer flow and the cross-tab alert all still work.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const file = 'file://' + resolve('dist/offline/abc-motor-insurance-demo.html');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const blocked = [];
await ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
  blocked.push(u);
  return route.abort();
});
const errors = [];

const office = await ctx.newPage();
office.on('pageerror', (e) => errors.push(e.message));
await office.goto(file + '#backoffice');
await office.getByRole('heading', { name: 'งานเข้า' }).waitFor();
const fontsOk = await office.evaluate(async () => {
  await document.fonts.ready;
  return ['600 16px "Bai Jamjuree"', '400 16px "IBM Plex Sans Thai"'].every((f) => document.fonts.check(f, 'ทดสอบ'));
});
assert.ok(fontsOk, 'embedded Thai fonts are available offline');
const seeded = await office.locator('.case-row').count();
assert.ok(seeded > 5, 'sample cases generated offline');
console.log('  fonts embedded and sample data loaded');

const customer = await ctx.newPage();
customer.on('pageerror', (e) => errors.push(e.message));
await customer.goto(file + '#customer');
await customer.getByRole('radio', { name: /^110/ }).click();
await customer.getByRole('radio', { name: 'Honda' }).click();
await customer.locator('#car-model').selectOption('honda-city');
await customer.locator('#car-year').selectOption('2023');
await customer.getByRole('button', { name: /ดูแพ็กเกจ/ }).click();
await customer.getByRole('radio', { name: 'ชั้น 1' }).click();
await customer.locator('.pkg-card').first().getByRole('button', { name: 'เลือกแพ็กเกจนี้' }).click();
await customer.getByRole('button', { name: 'ยืนยันและแจ้งงาน' }).click();
const ref = (await customer.locator('.ref-big').innerText()).trim();
console.log(`  customer submitted ${ref} offline`);

await office.bringToFront();
await office.locator('.toast', { hasText: ref }).waitFor({ timeout: 5000 });
console.log('  back-office tab got the real-time alert');

await office.locator('.mainnav .nav-dashboard').click();
await office.getByRole('heading', { name: 'Performance Report' }).waitFor();
assert.ok((await office.locator('.chart .bar').count()) > 5, 'dashboard charts render');
console.log('  dashboard renders');

assert.deepEqual(errors, [], 'no page errors');
assert.deepEqual(blocked, [], 'page made no network requests');
console.log('\nOffline check passed (no network requests)');
await browser.close();
