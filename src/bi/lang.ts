import { createContext, useContext } from 'react';
import { FIRST_YEAR, type Channel, type Product, type Region } from './data';
import type { Proc } from './ops';

export type Lang = 'th' | 'en';
export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'th', setLang: () => {} });

/** `L('ไทย', 'English')` picks the active language inline. */
export function useL() {
  const { lang, setLang } = useContext(LangContext);
  const L = (th: string, en: string) => (lang === 'th' ? th : en);
  return { lang, setLang, L };
}

const loc = (lang: Lang) => (lang === 'th' ? 'th-TH' : 'en-US');
export const fmtNum = (n: number, lang: Lang, digits = 0) => new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
/** THB millions → "฿1,234.5 ล้าน" / "฿1,234.5M"; ≥ 1,000M switches to billions in English. */
export const fmtM = (m: number, lang: Lang, digits = 1) => {
  const neg = m < 0 ? '-' : '';
  const v = Math.abs(m);
  if (lang === 'en' && v >= 1000) return `${neg}฿${fmtNum(v / 1000, lang, 2)}B`;
  return lang === 'th' ? `${neg}฿${fmtNum(v, lang, digits)} ล้าน` : `${neg}฿${fmtNum(v, lang, digits)}M`;
};
export const fmtMAxis = (m: number, lang: Lang) => (Math.abs(m) >= 1000 ? `${fmtNum(m / 1000, lang, 1)}${lang === 'th' ? 'พันล.' : 'B'}` : `${fmtNum(m, lang, 0)}${lang === 'th' ? 'ล.' : 'M'}`);
export const fmtPct = (r: number, lang: Lang, digits = 1) => `${fmtNum(r * 100, lang, digits)}%`;
export const fmtPp = (d: number, lang: Lang) => `${d >= 0 ? '+' : ''}${fmtNum(d * 100, lang, 1)} pp`;
export const fmtBaht = (n: number, lang: Lang) => `฿${fmtNum(n, lang, 0)}`;

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthShort = (mo: number, lang: Lang) => (lang === 'th' ? MONTH_TH : MONTH_EN)[mo];
export const monthLabel = (m: number, lang: Lang) => {
  const y = FIRST_YEAR + Math.floor(m / 12);
  return lang === 'th' ? `${MONTH_TH[m % 12]} ${String(y + 543).slice(2)}` : `${MONTH_EN[m % 12]} ${String(y).slice(2)}`;
};

/** Duration in minutes of the given clock: business minutes use 9-hour days. */
export function fmtDur(min: number, clock: 'work' | 'cal', lang: Lang) {
  const a = Math.abs(min);
  const th = lang === 'th';
  if (a < 60) return th ? `${fmtNum(a, lang)} นาที` : `${fmtNum(a, lang)} min`;
  const day = clock === 'work' ? 540 : 1440;
  if (a < day) return th ? `${fmtNum(a / 60, lang, 1)} ชม.` : `${fmtNum(a / 60, lang, 1)} h`;
  return clock === 'work' ? (th ? `${fmtNum(a / day, lang, 1)} วันทำการ` : `${fmtNum(a / day, lang, 1)} bus. days`) : th ? `${fmtNum(a / day, lang, 1)} วัน` : `${fmtNum(a / day, lang, 1)} days`;
}

export const PRODUCT_NAME: Record<Product, [string, string]> = {
  motor: ['รถยนต์', 'Motor'],
  fire: ['อัคคีภัย/ทรัพย์สิน', 'Fire / Property'],
  marine: ['ขนส่งทางทะเล', 'Marine'],
  health: ['สุขภาพ/อุบัติเหตุ', 'Health / PA'],
  misc: ['เบ็ดเตล็ด', 'Miscellaneous'],
};
export const CHANNEL_NAME: Record<Channel, [string, string]> = {
  agency: ['ตัวแทน (Agency)', 'Agency'],
  broker: ['นายหน้า (Broker)', 'Broker'],
  banca: ['ธนาคาร/ลีสซิ่ง (Banca)', 'Bancassurance'],
  direct: ['ขายตรง/ดิจิทัล', 'Direct / Digital'],
};
export const REGION_NAME: Record<Region, [string, string]> = {
  bkk: ['กรุงเทพฯ และปริมณฑล', 'Bangkok & Metro'],
  central: ['ภาคกลาง/ตะวันออก', 'Central / East'],
  north: ['ภาคเหนือ', 'North'],
  northeast: ['ภาคตะวันออกเฉียงเหนือ', 'Northeast'],
  south: ['ภาคใต้', 'South'],
};
export const PROC_NAME: Record<Proc, [string, string]> = {
  quote: ['เสนอราคา', 'Quotation'],
  issue: ['ออกกรมธรรม์', 'Policy issuance'],
  endorse: ['สลักหลัง', 'Endorsement'],
  survey: ['รับแจ้ง → ถึงที่เกิดเหตุ', 'FNOL → surveyor on site'],
  approve: ['อนุมัติซ่อม/พิจารณาสินไหม', 'Repair approval / assessment'],
  settle: ['จ่ายค่าสินไหม', 'Claim settlement'],
};
export const PROC_SLA_TEXT: Record<Proc, [string, string]> = {
  quote: ['รถยนต์ 2 ชม. · อื่นๆ 2 วันทำการ', 'Motor 2 h · others 2 bus. days'],
  issue: ['1 วันทำการ หลังเอกสารครบ', '1 bus. day after complete docs'],
  endorse: ['2 วันทำการ', '2 bus. days'],
  survey: ['รถยนต์ 45 นาที · อื่นๆ 24 ชม.', 'Motor 45 min · others 24 h'],
  approve: ['รถยนต์ 1 วันทำการ · อื่นๆ 5 วันทำการ', 'Motor 1 bus. day · others 5 bus. days'],
  settle: ['15 วัน หลังเอกสารครบ (เกณฑ์ คปภ.)', '15 days after complete docs (OIC rule)'],
};
export const name = (pair: [string, string], lang: Lang) => (lang === 'th' ? pair[0] : pair[1]);
