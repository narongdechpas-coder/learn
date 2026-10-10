import type { Lang, OccClass, Package, PaCover, PaProduct } from '../types';
import { ageOn } from './travel';
import { vehicleText } from './vehicles';

const DAY = 86_400_000;

/** Standard commission for personal accident, in % of net premium (editable per plan and per partner). */
export const PA_COMMISSION = 18;

export const PA_COVER_KEYS: (keyof PaCover)[] = ['death', 'medical', 'hospitalDaily', 'funeral'];

/** Occupations the customer picks from; class 4 jobs are too dangerous to insure online. */
export interface Occupation {
  id: string;
  th: string;
  en: string;
  cls: OccClass | 4;
  /** "Other (please specify)": priced as class 2 for now, the back office reviews it before issue. */
  other?: boolean;
}

export const OCCUPATIONS: Occupation[] = [
  { id: 'office', th: 'พนักงานออฟฟิศ / ธุรการ', en: 'Office worker', cls: 1 },
  { id: 'it', th: 'โปรแกรมเมอร์ / งานไอที', en: 'IT / software', cls: 1 },
  { id: 'teacher', th: 'ครู / อาจารย์', en: 'Teacher / lecturer', cls: 1 },
  { id: 'medical', th: 'แพทย์ / พยาบาล / เภสัชกร', en: 'Doctor / nurse / pharmacist', cls: 1 },
  { id: 'shop', th: 'เจ้าของร้านค้า / ค้าขาย', en: 'Shop owner / trader', cls: 1 },
  { id: 'student', th: 'นักเรียน / นักศึกษา', en: 'Student', cls: 1 },
  { id: 'home', th: 'แม่บ้าน / พ่อบ้าน', en: 'Homemaker', cls: 1 },
  { id: 'sales', th: 'พนักงานขายภาคสนาม', en: 'Field sales', cls: 2 },
  { id: 'driver', th: 'พนักงานขับรถยนต์ / แท็กซี่', en: 'Car driver / taxi', cls: 2 },
  { id: 'engineer', th: 'วิศวกรคุมงานหน้างาน', en: 'Site engineer', cls: 2 },
  { id: 'technician', th: 'ช่างไฟฟ้า / ช่างแอร์', en: 'Electrician / AC technician', cls: 2 },
  { id: 'farmer', th: 'เกษตรกร', en: 'Farmer', cls: 2 },
  { id: 'chef', th: 'พ่อครัว / แม่ครัว', en: 'Cook / chef', cls: 2 },
  { id: 'builder', th: 'คนงานก่อสร้าง', en: 'Construction worker', cls: 3 },
  { id: 'factory', th: 'พนักงานคุมเครื่องจักรในโรงงาน', en: 'Factory machine operator', cls: 3 },
  { id: 'mechanic', th: 'ช่างซ่อมรถยนต์ / จักรยานยนต์', en: 'Car / motorcycle mechanic', cls: 3 },
  { id: 'rider', th: 'ไรเดอร์ส่งของ / วินมอเตอร์ไซค์', en: 'Delivery rider / motorcycle taxi', cls: 3 },
  { id: 'miner', th: 'คนงานเหมือง / ขุดเจาะ', en: 'Miner / driller', cls: 4 },
  { id: 'offshore', th: 'คนงานแท่นขุดเจาะนอกชายฝั่ง', en: 'Offshore rig worker', cls: 4 },
  { id: 'explosives', th: 'งานเกี่ยวกับวัตถุระเบิด', en: 'Explosives handler', cls: 4 },
  { id: 'stunt', th: 'สตันท์แมน / นักแสดงผาดโผน', en: 'Stunt performer', cls: 4 },
  { id: 'boxer', th: 'นักมวย / นักกีฬาต่อสู้อาชีพ', en: 'Professional boxer / fighter', cls: 4 },
  { id: 'other', th: 'อื่นๆ (ระบุ)', en: 'Other (please specify)', cls: 2, other: true },
];
export const occupationById = (id: string) => OCCUPATIONS.find((o) => o.id === id);
export const occName = (id: string, lang: Lang, text?: string) => {
  const o = occupationById(id);
  if (o?.other && text?.trim()) return `${lang === 'th' ? 'อื่นๆ' : 'Other'}: ${text.trim()}`;
  return o ? o[lang] : id;
};

/** Health questions asked when buying; any "yes" sends the application to the back office. */
export const HEALTH_QUESTIONS = 3;

const TERMS_TH = 'คุ้มครองการบาดเจ็บจากอุบัติเหตุทั่วโลก ตลอด 24 ชั่วโมง เป็นเวลา 1 ปี ค่ารักษาพยาบาลจ่ายตามจริงไม่เกินวงเงินต่ออุบัติเหตุแต่ละครั้ง ค่าชดเชยรายวันจ่ายเมื่อนอนโรงพยาบาลเป็นผู้ป่วยใน สูงสุด 365 วัน';
const TERMS_EN = 'Covers injuries from accidents worldwide, 24 hours a day, for one year. Medical expenses are paid as incurred up to the limit per accident; hospital cash is paid for each day as an in-patient, up to 365 days.';
const EXCL_TH = ['การขับขี่หรือโดยสารรถจักรยานยนต์ (เว้นแต่ซื้อความคุ้มครองเพิ่ม)', 'การฆ่าตัวตาย หรือทำร้ายร่างกายตนเอง', 'ขณะอยู่ภายใต้ฤทธิ์สุรา (แอลกอฮอล์ในเลือดเกิน 150 มก.%) หรือยาเสพติด', 'การแข่งรถ แข่งเรือ แข่งม้า หรือกีฬาอันตราย', 'สงคราม การจลาจล การก่อการร้าย'];
const EXCL_EN = ['Riding or riding pillion on a motorcycle (unless the add-on is bought)', 'Suicide or self-inflicted injury', 'Under the influence of alcohol (blood alcohol over 150 mg%) or drugs', 'Racing of any kind, or dangerous sports', 'War, riots and terrorism'];

export function defaultPaProducts(now = Date.now()): PaProduct[] {
  const at = now - 90 * DAY;
  const plan = (id: string, si: number, cover: Omit<PaCover, 'death'>, prices: [number, number, number], tagTh: string, tagEn: string, badge?: PaProduct['badge']): PaProduct => ({
    id,
    ver: 1,
    updatedAt: at,
    updatedBy: 'system',
    nameTh: `PA ${si.toLocaleString('en-US')}`,
    nameEn: `PA ${si.toLocaleString('en-US')}`,
    tagTh,
    tagEn,
    highlightsTh: [`เสียชีวิต / ทุพพลภาพ ${si.toLocaleString('en-US')} บาท`, `ค่ารักษา ${cover.medical.toLocaleString('en-US')} บาท ต่ออุบัติเหตุ`],
    highlightsEn: [`Death / disability ${si.toLocaleString('en-US')} THB`, `Medical ${cover.medical.toLocaleString('en-US')} THB per accident`],
    ...(badge ? { badge } : {}),
    channels: { self: true, partner: true },
    partners: 'all',
    cover: { death: si, ...cover },
    prices: { 1: prices[0], 2: prices[1], 3: prices[2] },
    motorcyclePct: 30,
    minAge: 15,
    maxAge: 65,
    renewAge: 70,
    partnerCommission: {},
    termsTh: TERMS_TH,
    termsEn: TERMS_EN,
    exclusionsTh: EXCL_TH,
    exclusionsEn: EXCL_EN,
  });
  return [
    plan('PA-100', 100_000, { medical: 10_000, hospitalDaily: 300, funeral: 10_000 }, [690, 890, 1190], 'คุ้มครองพื้นฐาน ราคาประหยัด', 'Basic cover at a low price'),
    plan('PA-300', 300_000, { medical: 30_000, hospitalDaily: 500, funeral: 20_000 }, [1590, 2050, 2750], 'คุ้มค่าที่สุด สำหรับคนทำงาน', 'Best value for working people', 'recommended'),
    plan('PA-500', 500_000, { medical: 50_000, hospitalDaily: 1000, funeral: 30_000 }, [2490, 3190, 4290], 'วงเงินสูง ค่ารักษาและชดเชยรายวันเต็มที่', 'High limits for medical and hospital cash'),
  ];
}

let products: PaProduct[] = defaultPaProducts();

/** The store hands the current PA catalogue over whenever it changes. */
export function setPaCatalog(list: PaProduct[]) {
  products = list;
}
export const getPaProducts = () => products;

const endOfDay = (d: string) => new Date(`${d}T23:59:59+07:00`).getTime();
export const paExpired = (p: PaProduct, now = Date.now()) => !!p.saleUntil && endOfDay(p.saleUntil) < now;

export function paOnSale(p: PaProduct, channel: 'self' | 'partner', agentId?: string, now = Date.now()) {
  if (p.archived || !p.channels[channel] || paExpired(p, now)) return false;
  return channel !== 'partner' || !agentId || p.partners === 'all' || p.partners.includes(agentId);
}

export function paCommission(p: PaProduct, agentId?: string) {
  const own = agentId ? p.partnerCommission[agentId] : undefined;
  return (own ?? p.commission ?? PA_COMMISSION) / 100;
}

/** One year of cover: the last day is the day before the same date next year. */
export function paEnd(start: string) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Who is being insured and how: everything that changes the price or the underwriting. */
export interface PaApplicant {
  birth: string;
  start: string;
  occupation: string;
  /** Description of an "other" occupation. */
  occupationText?: string;
  motorcycle: boolean;
  health: boolean[];
  /** A renewal may run up to the plan's renewal age and skips the entry checks. */
  renewal?: boolean;
}

/** Why an applicant cannot buy a plan online, if they cannot. */
export function paRefusal(p: PaProduct, a: PaApplicant): 'occupation' | 'age' | null {
  const occ = occupationById(a.occupation);
  if (!occ || occ.cls === 4) return 'occupation';
  const age = ageOn(a.birth, a.start);
  if (!Number.isFinite(age) || age < p.minAge || age > (a.renewal ? p.renewAge : p.maxAge)) return 'age';
  return null;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Premium for an occupation class, with the motorcycle add-on when chosen. */
export const paPremium = (p: PaProduct, cls: OccClass, motorcycle: boolean) => (motorcycle && p.motorcyclePct ? round10(p.prices[cls] * (1 + p.motorcyclePct / 100)) : p.prices[cls]);

/** A plan priced for one person, as a package (type PA) the usual sales flow can carry. */
export function paPackage(p: PaProduct, a: PaApplicant, agentId?: string): Package | null {
  if (paRefusal(p, a)) return null;
  const occ = occupationById(a.occupation)!;
  const occClass = occ.cls as OccClass;
  const motorcycle = a.motorcycle && p.motorcyclePct > 0;
  // A renewal continues the cover it already has; new business with a "yes", heavy manual work or an
  // occupation not on the list is checked first.
  const referral = !a.renewal && (occClass === 3 || !!occ.other || a.health.some(Boolean));
  return {
    id: p.id,
    type: 'PA',
    repair: null,
    deductible: 0,
    ownDamage: 0,
    fireTheft: 0,
    flood: false,
    tpbiPerson: 0,
    tpbiAccident: 0,
    tppd: 0,
    pa: 0,
    paPassenger: 0,
    tempDriver: 0,
    tempPassenger: 0,
    medical: 0,
    bail: 0,
    passengers: 0,
    premium: paPremium(p, occClass, motorcycle),
    nameTh: p.nameTh,
    nameEn: p.nameEn,
    ver: p.ver,
    docs: [],
    ...(p.badge ? { badge: p.badge } : {}),
    comRate: paCommission(p, agentId),
    accident: { productId: p.id, occClass, occupation: a.occupation, ...(occ.other && a.occupationText?.trim() ? { occupationText: a.occupationText.trim() } : {}), motorcycle, cover: { ...p.cover }, health: [...a.health], referral, start: a.start, end: paEnd(a.start) },
  };
}

/** Plans on offer for an applicant, cheapest first. */
export function paPackages(a: PaApplicant, opts: { channel?: 'self' | 'partner'; agentId?: string } = {}): Package[] {
  return products
    .filter((p) => !p.archived && (!opts.channel || paOnSale(p, opts.channel, opts.agentId)))
    .map((p) => paPackage(p, a, opts.agentId))
    .filter((x): x is Package => !!x)
    .sort((a, b) => a.premium - b.premium);
}

/** Blank plan for "create new". */
export function blankPaProduct(id: string, by: string, now = Date.now()): PaProduct {
  const std = defaultPaProducts(now)[0];
  return { ...structuredClone(std), id, ver: 0, updatedAt: now, updatedBy: by, nameTh: '', nameEn: '', tagTh: '', tagEn: '', highlightsTh: [], highlightsEn: [], badge: undefined, channels: { self: false, partner: false }, commission: undefined, partnerCommission: {} };
}

export function paPriceRange(p: PaProduct): [number, number] | null {
  const all = Object.values(p.prices).filter((v) => v > 0);
  return all.length ? [Math.min(...all), Math.max(...all)] : null;
}

/** What a renewal is for: the car, or the PA plan and the insured's occupation. */
export function renewalText(r: { vehicle?: import('../types').Vehicle; pa?: { productId: string; occupation: string; occupationText?: string } }, lang: Lang) {
  if (r.vehicle) return vehicleText(r.vehicle);
  const p = r.pa ? products.find((x) => x.id === r.pa!.productId) : undefined;
  return `${lang === 'th' ? 'ประกันอุบัติเหตุ' : 'Personal accident'}${p ? ` · ${lang === 'th' ? p.nameTh : p.nameEn || p.nameTh}` : ''}${r.pa ? ` · ${occName(r.pa.occupation, lang, r.pa.occupationText)}` : ''}`;
}
