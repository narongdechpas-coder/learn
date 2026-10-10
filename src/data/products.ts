import type { CarModel, CoverRule, CoverageType, DocKey, Package, Product, ProductExtra, RateRow, UsageCode } from '../types';
import { ADJ, CMI_STANDARD, PASSENGERS_BY_CODE, COVERAGE_TYPES, REQUIRED_DOCS, class1Premium, cmiPremium, round10, setCmiTable, thirdParty } from './packages';
import { COMMISSION_RATE } from './agents';
import { CATALOGUE_CODES, CURRENT_YEAR } from './vehicles';

export const EXTRAS: ProductExtra[] = ['flood', 'roadside', 'towing', 'courtesyCar', 'evBattery', 'glass'];
/** Rate tables run to this sum insured; the last band is open-ended in practice. */
export const SI_TOP = 99_000_000;
const DAY = 86_400_000;

/** Standard cover for each class: what "fill in standard cover" puts in the editor. */
export function standardCover(type: CoverageType): Pick<
  Product,
  'repair' | 'deductible' | 'ownDamage' | 'fireTheft' | 'tpbiPerson' | 'tpbiAccident' | 'tppd' | 'pa' | 'paPassenger' | 'tempDriver' | 'tempPassenger' | 'medical' | 'bail' | 'extras' | 'docs'
> {
  const none: CoverRule = { mode: 'none', value: 0 };
  const docs = [...REQUIRED_DOCS[type]];
  switch (type) {
    case 'T1':
      return { ...thirdParty(true), repair: 'garage', deductible: 0, ownDamage: { mode: 'si', value: 0 }, fireTheft: { mode: 'si', value: 0 }, extras: ['flood'], docs };
    case 'T2P':
      return { ...thirdParty(false), repair: 'garage', deductible: 0, ownDamage: { mode: 'fixed', value: 200_000 }, fireTheft: { mode: 'fixed', value: 200_000 }, extras: [], docs };
    case 'T3P':
      return { ...thirdParty(false), repair: 'garage', deductible: 0, ownDamage: { mode: 'fixed', value: 100_000 }, fireTheft: none, extras: [], docs };
    case 'T2':
      return { ...thirdParty(false), repair: null, deductible: 0, ownDamage: none, fireTheft: { mode: 'pct', value: 70, cap: 500_000 }, extras: [], docs };
    case 'T3':
      return { ...thirdParty(false), repair: null, deductible: 0, ownDamage: none, fireTheft: none, extras: [], docs };
    default:
      return { repair: null, deductible: 0, ownDamage: none, fireTheft: none, tpbiPerson: 80_000, tpbiAccident: 0, tppd: 0, pa: 500_000, paPassenger: 500_000, tempDriver: 0, tempPassenger: 0, medical: 80_000, bail: 0, extras: [], docs };
  }
}

/** Standard commission for a class, in %. */
export const standardCommission = (type: CoverageType) => Math.round(COMMISSION_RATE[type] * 100);

const flat = (prices: Partial<Record<UsageCode, number>>, siFrom = 0): RateRow[] => [{ siFrom, siTo: SI_TOP, prices }];
const byCode = (fn: (code: UsageCode) => number | undefined) => {
  const out: Partial<Record<UsageCode, number>> = {};
  for (const c of CATALOGUE_CODES) {
    const v = fn(c);
    if (v !== undefined) out[c] = v;
  }
  return out;
};
const sedan = { body: 'sedan' } as CarModel;

/** Class 1 rate table in 100,000 THB bands, priced at the middle of each band. */
function class1Rates(repair: 'dealer' | 'garage', deductible: number): RateRow[] {
  const rows: RateRow[] = [];
  for (let from = 100_000; from < 3_000_000; from += 100_000) {
    const mid = from + 50_000;
    rows.push({ siFrom: from, siTo: from + 99_999, prices: byCode((c) => class1Premium(sedan, c, mid, repair, deductible)) });
  }
  rows.push({ siFrom: 3_000_000, siTo: SI_TOP, prices: byCode((c) => class1Premium(sedan, c, 3_000_000, repair, deductible)) });
  return rows;
}

function base(id: string, type: CoverageType, at: number): Omit<Product, 'nameTh' | 'nameEn' | 'tagTh' | 'tagEn' | 'highlightsTh' | 'highlightsEn' | 'rates'> {
  return {
    id,
    type,
    ver: 1,
    updatedAt: at,
    updatedBy: 'system',
    channels: { self: true, partner: true },
    partners: 'all',
    ...standardCover(type),
    codes: 'all',
    ev: type === 'T1' || type === 'T3' || type === 'CMI' ? 'allow' : 'deny',
    evLoading: type === 'T1' ? 25 : 0,
    excludeModels: [],
    partnerCommission: {},
    termsTh: '',
    termsEn: '',
    exclusionsTh: [],
    exclusionsEn: [],
  };
}

const T1_TERMS_TH = 'คุ้มครองตัวรถจากอุบัติเหตุทุกกรณี รวมชนแบบไม่มีคู่กรณี รถหาย ไฟไหม้ และน้ำท่วม ตามทุนประกันที่ระบุในหน้าตาราง';
const T1_TERMS_EN = 'Covers the car in any accident, including with no other party, theft, fire and flood, up to the sum insured in the schedule.';
const EXCL_TH = ['ผู้ขับขี่ไม่มีใบอนุญาตขับขี่หรือเมาสุรา', 'ใช้รถผิดประเภทจากที่ระบุในกรมธรรม์', 'ความเสียหายจากการสึกหรอตามปกติ'];
const EXCL_EN = ['Driver without a licence or under the influence', 'Car used other than as stated in the policy', 'Normal wear and tear'];

/** The catalogue the demo starts with: the same packages and prices the earlier versions sold. */
export function defaultProducts(now = Date.now()): Product[] {
  const at = now - 120 * DAY;
  const a = (c: UsageCode) => ADJ[c]!;
  const t1 = (id: string, repair: 'dealer' | 'garage', deductible: number, maxAge: number, th: string, en: string, tagTh: string, tagEn: string): Product => ({
    ...base(id, 'T1', at),
    repair,
    deductible,
    maxAge,
    nameTh: th,
    nameEn: en,
    tagTh,
    tagEn,
    highlightsTh: [repair === 'dealer' ? 'ซ่อมศูนย์บริการตัวแทนจำหน่าย' : 'ซ่อมอู่ในเครือกว่า 1,000 แห่ง', 'คุ้มครองน้ำท่วม', 'ชนแบบไม่มีคู่กรณีก็เคลมได้'],
    highlightsEn: [repair === 'dealer' ? 'Repairs at the dealer' : '1,000+ partner garages', 'Flood cover', 'Claim even with no other party'],
    termsTh: T1_TERMS_TH,
    termsEn: T1_TERMS_EN,
    exclusionsTh: EXCL_TH,
    exclusionsEn: EXCL_EN,
    rates: class1Rates(repair, deductible),
  });
  const plus = (type: 'T2P' | 'T3P', cover: number, price: (c: UsageCode) => number, siFrom = 0): Product => {
    const label = type === 'T2P' ? '2+' : '3+';
    return {
      ...base(`${type}-${cover}`, type, at),
      ownDamage: { mode: 'fixed', value: cover },
      fireTheft: type === 'T2P' ? { mode: 'fixed', value: cover } : { mode: 'none', value: 0 },
      maxAge: 15,
      nameTh: `ชั้น ${label} ทุน ${cover.toLocaleString('en-US')}`,
      nameEn: `Class ${label} ${cover.toLocaleString('en-US')} cover`,
      tagTh: type === 'T2P' ? 'ชนกับยานพาหนะ + รถหาย/ไฟไหม้ ในราคาที่จับต้องได้' : 'คุ้มครองรถเราเมื่อชนกับยานพาหนะ ราคาประหยัด',
      tagEn: type === 'T2P' ? 'Vehicle collisions plus theft and fire at a fair price' : 'Your car covered in vehicle collisions, for less',
      highlightsTh: type === 'T2P' ? ['ชนกับยานพาหนะคุ้มครองตัวรถ', 'รถหาย / ไฟไหม้', 'ซื้อและรับกรมธรรม์ได้ทันที'] : ['ชนกับยานพาหนะคุ้มครองตัวรถ', 'ซื้อและรับกรมธรรม์ได้ทันที'],
      highlightsEn: type === 'T2P' ? ['Own damage in vehicle collisions', 'Theft and fire', 'Buy and get the policy instantly'] : ['Own damage in vehicle collisions', 'Buy and get the policy instantly'],
      exclusionsTh: EXCL_TH,
      exclusionsEn: EXCL_EN,
      rates: flat(byCode(price), siFrom),
    };
  };
  const out: Product[] = [
    t1('T1-dealer-0', 'dealer', 0, 5, 'ชั้น 1 ซ่อมห้าง', 'Class 1 Dealer', 'คุ้มครองครบที่สุด ซ่อมศูนย์บริการ สำหรับรถอายุไม่เกิน 5 ปี', 'Fullest cover with dealer repairs, for cars up to 5 years old'),
    { ...t1('T1-garage-0', 'garage', 0, 10, 'ชั้น 1 ซ่อมอู่', 'Class 1 Garage', 'คุ้มครองครบ ซ่อมอู่ในเครือ ไม่มีค่าเสียหายส่วนแรก', 'Full cover, partner garages, no excess'), badge: 'recommended' },
    t1('T1-garage-3000', 'garage', 3000, 10, 'ชั้น 1 ประหยัด', 'Class 1 Saver', 'คุ้มครองครบในราคาที่ถูกลง มีค่าเสียหายส่วนแรก 3,000 บาท', 'Full cover for less, with a 3,000 THB excess'),
    plus('T2P', 200_000, (c) => 8900 + a(c).plus),
    plus('T2P', 300_000, (c) => 9900 + a(c).plus, 300_000),
    plus('T3P', 100_000, (c) => 6900 + Math.round(a(c).plus * 0.8)),
    plus('T3P', 200_000, (c) => 7900 + Math.round(a(c).plus * 0.8)),
    {
      ...base('T2', 'T2', at),
      nameTh: 'ชั้น 2',
      nameEn: 'Class 2',
      tagTh: 'รถหาย / ไฟไหม้ และคู่กรณี',
      tagEn: 'Theft, fire and third party',
      highlightsTh: ['รถหาย / ไฟไหม้ สูงสุด 70% ของทุน', 'คุ้มครองคู่กรณี'],
      highlightsEn: ['Theft and fire up to 70% of the sum insured', 'Third-party cover'],
      exclusionsTh: EXCL_TH,
      exclusionsEn: EXCL_EN,
      rates: flat(byCode((c) => a(c).t2)),
    },
    {
      ...base('T3', 'T3', at),
      nameTh: 'ชั้น 3',
      nameEn: 'Class 3',
      tagTh: 'คุ้มครองคู่กรณี ราคาเบาที่สุด',
      tagEn: 'Third party only, the lightest price',
      highlightsTh: ['คุ้มครองคู่กรณีทั้งคนและทรัพย์สิน'],
      highlightsEn: ['Third-party injury and property'],
      exclusionsTh: EXCL_TH,
      exclusionsEn: EXCL_EN,
      rates: flat(byCode((c) => a(c).t3)),
    },
    {
      ...base('CMI', 'CMI', at),
      nameTh: 'พ.ร.บ.',
      nameEn: 'CMI (compulsory)',
      tagTh: 'ประกันภาคบังคับตามกฎหมาย',
      tagEn: 'Compulsory motor insurance',
      highlightsTh: ['ค่ารักษาพยาบาล 80,000 บาท/คน', 'เสียชีวิต / ทุพพลภาพ 500,000 บาท/คน'],
      highlightsEn: ['Medical 80,000 THB per person', 'Death / disability 500,000 THB per person'],
      rates: flat({ ...CMI_STANDARD }),
    },
  ];
  // A promotion to show the product features: EV only, special commission, a partner rate and an end date.
  const ev = t1('T1-EV-PLUS', 'dealer', 0, 5, 'ชั้น 1 EV Plus', 'Class 1 EV Plus', 'ชั้น 1 สำหรับรถไฟฟ้า คุ้มครองแบตเตอรี่และมีรถใช้ระหว่างซ่อม', 'Class 1 for electric cars, with battery cover and a courtesy car');
  out.splice(3, 0, {
    ...ev,
    updatedAt: now - 20 * DAY,
    ev: 'only',
    evLoading: 30,
    badge: 'new',
    extras: ['flood', 'roadside', 'evBattery', 'courtesyCar'],
    highlightsTh: ['คุ้มครองแบตเตอรี่ EV ตามทุน', 'รถใช้ระหว่างซ่อม 7 วัน', 'ช่วยเหลือฉุกเฉิน 24 ชม.'],
    highlightsEn: ['EV battery covered up to the sum insured', '7-day courtesy car', '24-hour roadside assistance'],
    saleUntil: new Date(now + 75 * DAY).toISOString().slice(0, 10),
    commission: 20,
    partnerCommission: { a2: 22 },
  });
  return out;
}

let catalog: Product[] = defaultProducts();
const cmiOf = (list: Product[]) => list.find((p) => p.type === 'CMI' && !p.archived)?.rates[0]?.prices;

/** The store hands the current catalogue over whenever it changes. */
export function setCatalog(list: Product[]) {
  catalog = list;
  setCmiTable(cmiOf(list) ?? CMI_STANDARD);
}
export const getCatalog = () => catalog;
export const productById = (id: string) => catalog.find((p) => p.id === id);

/** Commission (fraction of net premium) for a product, for a given partner if any. */
export function commissionFor(p: Product, agentId?: string): number {
  const own = agentId ? p.partnerCommission[agentId] : undefined;
  return (own ?? p.commission ?? standardCommission(p.type)) / 100;
}

const endOfDay = (d: string) => new Date(`${d}T23:59:59+07:00`).getTime();
export const isExpired = (p: Product, now = Date.now()) => !!p.saleUntil && endOfDay(p.saleUntil) < now;

/** On sale through a channel right now (open, not expired, and the partner is allowed). */
export function onSale(p: Product, channel: 'self' | 'partner', agentId?: string, now = Date.now()) {
  if (p.archived || !p.channels[channel] || isExpired(p, now)) return false;
  return channel !== 'partner' || !agentId || p.partners === 'all' || p.partners.includes(agentId);
}

export const rateRow = (p: Product, si: number) => p.rates.find((r) => si >= r.siFrom && si <= r.siTo);

export function coverAmount(rule: CoverRule, si: number) {
  switch (rule.mode) {
    case 'si':
      return si;
    case 'fixed':
      return rule.value;
    case 'pct':
      return Math.min(rule.cap ?? Infinity, Math.floor((si * rule.value) / 100 / 10000) * 10000);
    default:
      return 0;
  }
}

/** Why a product is not offered for a car, or null when it is. */
export function refusal(p: Product, model: CarModel, code: UsageCode, year: number, si: number): 'age' | 'code' | 'ev' | 'model' | 'si' | null {
  const ev = model.body === 'ev';
  if (p.maxAge !== undefined && CURRENT_YEAR - year > p.maxAge) return 'age';
  if (p.codes !== 'all' && !p.codes.includes(code)) return 'code';
  if ((p.ev === 'deny' && ev) || (p.ev === 'only' && !ev)) return 'ev';
  if (p.excludeModels.includes(model.id)) return 'model';
  if (rateRow(p, si)?.prices[code] === undefined) return 'si';
  return null;
}

/** Turn a product into the package offered for one car. */
export function toPackage(p: Product, model: CarModel, code: UsageCode, si: number, agentId?: string): Package | null {
  const price = rateRow(p, si)?.prices[code];
  if (price === undefined) return null;
  const loaded = model.body === 'ev' && p.evLoading ? round10(price * (1 + p.evLoading / 100)) : price;
  return {
    id: p.id,
    type: p.type,
    repair: p.repair,
    deductible: p.deductible,
    ownDamage: coverAmount(p.ownDamage, si),
    fireTheft: coverAmount(p.fireTheft, si),
    flood: p.extras.includes('flood'),
    tpbiPerson: p.tpbiPerson,
    tpbiAccident: p.tpbiAccident,
    tppd: p.tppd,
    pa: p.pa,
    paPassenger: p.paPassenger,
    tempDriver: p.tempDriver,
    tempPassenger: p.tempPassenger,
    passengers: p.passengers ?? PASSENGERS_BY_CODE[code] ?? 0,
    medical: p.medical,
    bail: p.bail,
    premium: loaded,
    nameTh: p.nameTh,
    nameEn: p.nameEn,
    ver: p.ver,
    extras: [...p.extras],
    docs: [...p.docs] as DocKey[],
    ...(p.badge ? { badge: p.badge } : {}),
    comRate: commissionFor(p, agentId),
    ...(p.type !== 'CMI' && cmiPremium(code) !== undefined ? { cmi: cmiPremium(code) } : {}),
  };
}

/**
 * Packages on offer for a car. With a channel, only products on sale there (and, for a partner,
 * ones that partner may sell); without one (seed data) every product counts.
 * Models flagged noPackage get nothing and go to the quote request flow.
 */
export function packagesFor(model: CarModel, code: UsageCode, year: number, si: number, opts: { channel?: 'self' | 'partner'; agentId?: string } = {}): Package[] {
  if (model.noPackage) return [];
  const out: Package[] = [];
  for (const p of catalog) {
    if (p.archived) continue;
    if (opts.channel && !onSale(p, opts.channel, opts.agentId)) continue;
    if (refusal(p, model, code, year, si)) continue;
    const pkg = toPackage(p, model, code, si, opts.agentId);
    if (pkg) out.push(pkg);
  }
  return out.sort((x, y) => COVERAGE_TYPES.indexOf(x.type) - COVERAGE_TYPES.indexOf(y.type));
}

/** Lowest and highest catalogue price, for the product list. */
export function priceRange(p: Product): [number, number] | null {
  const all = p.rates.flatMap((r) => Object.values(r.prices).filter((v): v is number => typeof v === 'number'));
  return all.length ? [Math.min(...all), Math.max(...all)] : null;
}

/** A blank product of a class with standard cover, for "create new". */
export function blankProduct(type: CoverageType, id: string, by: string, now = Date.now()): Product {
  const std = defaultProducts(now).find((p) => p.type === type)!;
  return {
    ...std,
    id,
    ver: 0,
    updatedAt: now,
    updatedBy: by,
    nameTh: '',
    nameEn: '',
    tagTh: '',
    tagEn: '',
    highlightsTh: [],
    highlightsEn: [],
    badge: undefined,
    saleUntil: undefined,
    commission: undefined,
    partnerCommission: {},
    channels: { self: false, partner: false },
  };
}
