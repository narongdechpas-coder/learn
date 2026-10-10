import type { BuildingType, Construction, FireMode, FireOccupancy, FireOffer, FirePeril, FireProduct, FireSettings, Lang, Package } from '../types';

const DAY = 86_400_000;

/** Standard commission for fire, in % of net premium (editable per product and per partner). */
export const FIRE_COMMISSION = 18;

export const PERILS: FirePeril[] = ['flood', 'storm', 'quake', 'hail'];
export const CONSTRUCTIONS: Construction[] = ['concrete', 'mixed', 'wood'];
export const BUILDINGS: Record<FireOccupancy, BuildingType[]> = { home: ['house', 'townhouse', 'condo'], shop: ['shophouse', 'office'] };

export const BUILDING_LABEL: Record<BuildingType, [string, string]> = {
  house: ['บ้านเดี่ยว', 'Detached house'],
  townhouse: ['ทาวน์เฮาส์ / บ้านแฝด', 'Townhouse / semi-detached'],
  condo: ['ห้องชุดคอนโดมิเนียม', 'Condominium unit'],
  shophouse: ['ร้านค้า / อาคารพาณิชย์', 'Shop / shophouse'],
  office: ['สำนักงานขนาดเล็ก', 'Small office'],
};
export const buildingName = (b: BuildingType, lang: Lang) => BUILDING_LABEL[b][lang === 'th' ? 0 : 1];

/** All 77 provinces (the property's location). */
export const PROVINCES_ALL = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

export function defaultFireSettings(): FireSettings {
  return {
    mode: 'rate',
    referralSi: 5_000_000,
    floodProvinces: ['พระนครศรีอยุธยา', 'ปทุมธานี', 'นนทบุรี', 'นครสวรรค์', 'สุโขทัย', 'อุบลราชธานี', 'ชัยนาท', 'อ่างทอง', 'สิงห์บุรี', 'พิจิตร'],
    costPerSqm: { house: 15_000, townhouse: 12_000, condo: 18_000, shophouse: 13_000, office: 16_000 },
  };
}

const TERMS_TH = 'คุ้มครองความเสียหายต่อตัวอาคารและทรัพย์สินภายในจากไฟไหม้ ฟ้าผ่า และการระเบิด ตามทุนประกันที่ระบุ เป็นเวลา 1 ปี ภัยเพิ่มเติมคุ้มครองเมื่อเลือกซื้อและระบุในตารางกรมธรรม์ ค่าสินไหมจ่ายตามความเสียหายจริงไม่เกินทุนประกัน';
const TERMS_EN = 'Covers the building and contents against fire, lightning and explosion up to the sums insured, for one year. Optional perils apply when bought and shown in the schedule. Claims are paid at the actual loss, up to the sum insured.';
const EXCL_TH = ['การวางเพลิงโดยผู้เอาประกันหรือผู้รับประโยชน์', 'ความเสียหายจากการเสื่อมสภาพ การชำรุดตามปกติ หรือปลวก', 'เงินสด ทองคำ อัญมณี เอกสาร และงานศิลปะ (เว้นแต่ระบุไว้)', 'สงคราม การจลาจล การก่อการร้าย และภัยนิวเคลียร์', 'ภัยเพิ่มเติมที่ไม่ได้เลือกซื้อ เช่น น้ำท่วม หรือแผ่นดินไหว'];
const EXCL_EN = ['Arson by the insured or the beneficiary', 'Wear and tear, gradual deterioration or termites', 'Cash, gold, jewellery, documents and works of art (unless stated)', 'War, riots, terrorism and nuclear risks', 'Optional perils that were not bought, e.g. flood or earthquake'];

export function defaultFireProducts(now = Date.now()): FireProduct[] {
  const at = now - 90 * DAY;
  const base = (id: string, mode: FireMode, occupancy: FireOccupancy, nameTh: string, nameEn: string, tagTh: string, tagEn: string, hlTh: string[], hlEn: string[], badge?: FireProduct['badge']): FireProduct => ({
    id,
    ver: 1,
    updatedAt: at,
    updatedBy: 'system',
    mode,
    occupancy,
    nameTh,
    nameEn,
    tagTh,
    tagEn,
    highlightsTh: hlTh,
    highlightsEn: hlEn,
    ...(badge ? { badge } : {}),
    channels: { self: true, partner: true },
    partners: 'all',
    rates: { concrete: 0, mixed: 0, wood: 0 },
    perilRates: { flood: 0, storm: 0, quake: 0, hail: 0 },
    minPremium: 0,
    planBuildingSi: 0,
    planContentsSi: 0,
    planPrice: 0,
    perilPrices: { flood: 0, storm: 0, quake: 0, hail: 0 },
    perils: [...PERILS],
    partnerCommission: {},
    termsTh: TERMS_TH,
    termsEn: TERMS_EN,
    exclusionsTh: EXCL_TH,
    exclusionsEn: EXCL_EN,
  });
  const plan = (p: FireProduct, b: number, c: number, price: number, perils: [number, number, number, number]): FireProduct => ({ ...p, planBuildingSi: b, planContentsSi: c, planPrice: price, perilPrices: { flood: perils[0], storm: perils[1], quake: perils[2], hail: perils[3] } });
  return [
    // Rate mode: the customer sets the sums; the rate follows the construction.
    {
      ...base('FIRE-HOME', 'rate', 'home', 'อัคคีภัยบ้านอยู่อาศัย', 'Home fire insurance', 'กำหนดทุนเองตามมูลค่าบ้านและทรัพย์สิน', 'Set your own sums for the house and contents', ['ทุนอาคารแนะนำจากพื้นที่ใช้สอย', 'เลือกภัยเพิ่ม: น้ำท่วม พายุ แผ่นดินไหว ลูกเห็บ'], ['Building sum suggested from the floor area', 'Add flood, storm, earthquake or hail'], 'recommended'),
      rates: { concrete: 1.0, mixed: 1.8, wood: 3.0 },
      perilRates: { flood: 0.5, storm: 0.3, quake: 0.3, hail: 0.1 },
      minPremium: 1_000,
    },
    {
      ...base('FIRE-SHOP', 'rate', 'shop', 'อัคคีภัยร้านค้า / สำนักงาน', 'Shop & office fire insurance', 'สำหรับร้านค้า อาคารพาณิชย์ และสำนักงานขนาดเล็ก', 'For shops, shophouses and small offices', ['คุ้มครองอาคาร สต็อกสินค้า และอุปกรณ์', 'เลือกภัยเพิ่มได้เหมือนบ้าน'], ['Covers the building, stock and equipment', 'Same optional perils as a home']),
      rates: { concrete: 1.6, mixed: 2.8, wood: 4.5 },
      perilRates: { flood: 0.8, storm: 0.4, quake: 0.4, hail: 0.2 },
      minPremium: 2_000,
    },
    // Plan mode: ready-made sums at a fixed price.
    plan(base('FIRE-H1', 'plan', 'home', 'บ้านอุ่นใจ 1 ล้าน', 'Home Care 1M', 'บ้านหรือคอนโดขนาดเล็ก ราคาประหยัด', 'Small houses and condos at a low price', ['อาคาร 1,000,000 บาท', 'ทรัพย์สินภายใน 200,000 บาท'], ['Building 1,000,000 THB', 'Contents 200,000 THB']), 1_000_000, 200_000, 1_290, [500, 300, 300, 100]),
    plan(base('FIRE-H3', 'plan', 'home', 'บ้านอุ่นใจ 3 ล้าน', 'Home Care 3M', 'คุ้มค่าที่สุดสำหรับบ้านเดี่ยวทั่วไป', 'Best value for a typical house', ['อาคาร 3,000,000 บาท', 'ทรัพย์สินภายใน 500,000 บาท'], ['Building 3,000,000 THB', 'Contents 500,000 THB'], 'recommended'), 3_000_000, 500_000, 3_290, [1_500, 900, 900, 300]),
    plan(base('FIRE-H5', 'plan', 'home', 'บ้านอุ่นใจ 4 ล้าน', 'Home Care 4M', 'บ้านหลังใหญ่ ทรัพย์สินมาก', 'Larger homes with more belongings', ['อาคาร 4,000,000 บาท', 'ทรัพย์สินภายใน 1,000,000 บาท'], ['Building 4,000,000 THB', 'Contents 1,000,000 THB']), 4_000_000, 1_000_000, 4_790, [2_200, 1_300, 1_300, 450]),
    plan(base('FIRE-S2', 'plan', 'shop', 'ร้านค้าอุ่นใจ 2.5 ล้าน', 'Shop Care 2.5M', 'ร้านค้าและอาคารพาณิชย์ 1 คูหา', 'One-unit shops and shophouses', ['อาคาร 2,000,000 บาท', 'สต็อกและอุปกรณ์ 500,000 บาท'], ['Building 2,000,000 THB', 'Stock and equipment 500,000 THB']), 2_000_000, 500_000, 3_990, [1_250, 750, 750, 250]),
    plan(base('FIRE-S5', 'plan', 'shop', 'ร้านค้าอุ่นใจ 5 ล้าน', 'Shop Care 5M', 'สำนักงานหรือร้านค้าขนาดกลาง', 'Mid-size offices and shops', ['อาคาร 4,000,000 บาท', 'สต็อกและอุปกรณ์ 1,000,000 บาท'], ['Building 4,000,000 THB', 'Stock and equipment 1,000,000 THB']), 4_000_000, 1_000_000, 7_490, [3_000, 1_500, 1_500, 500]),
  ];
}

let products: FireProduct[] = defaultFireProducts();
let settings: FireSettings = defaultFireSettings();

/** The store hands the current fire catalogue and settings over whenever they change. */
export function setFireCatalog(list: FireProduct[], s: FireSettings) {
  products = list;
  settings = s;
}
export const getFireProducts = () => products;
export const getFireSettings = () => settings;

const endOfDay = (d: string) => new Date(`${d}T23:59:59+07:00`).getTime();
export const fireExpired = (p: FireProduct, now = Date.now()) => !!p.saleUntil && endOfDay(p.saleUntil) < now;

/** On sale in a channel, and of the kind (rate or plan) the back office has switched on. */
export function fireOnSale(p: FireProduct, channel: 'self' | 'partner', agentId?: string, now = Date.now()) {
  if (p.archived || p.mode !== settings.mode || !p.channels[channel] || fireExpired(p, now)) return false;
  return channel !== 'partner' || !agentId || p.partners === 'all' || p.partners.includes(agentId);
}

export function fireCommission(p: FireProduct, agentId?: string) {
  const own = agentId ? p.partnerCommission[agentId] : undefined;
  return (own ?? p.commission ?? FIRE_COMMISSION) / 100;
}

/** One year of cover: the last day is the day before the same date next year. */
export function fireEnd(start: string) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const round10 = (n: number) => Math.round(n / 10) * 10;
const round10k = (n: number) => Math.round(n / 10_000) * 10_000;

/** Building sum suggested from the floor area and the rebuild cost per m² for that type of building. */
export const suggestBuildingSi = (b: BuildingType, area: number) => (area > 0 ? round10k(area * (settings.costPerSqm[b] ?? 0)) : 0);

/** The property and the cover asked for: everything that changes the price or the underwriting. */
export interface FireApplicant {
  occupancy: FireOccupancy;
  building: BuildingType;
  construction: Construction;
  area: number;
  yearBuilt: number;
  owner: 'owner' | 'tenant';
  address: string;
  province: string;
  /** Rate mode only (plan mode uses the plan's sums). */
  buildingSi: number;
  contentsSi: number;
  perils: FirePeril[];
  priorLoss: boolean;
  beneficiary?: string;
  start: string;
  /** A renewal continues last year's cover without a new review. */
  renewal?: boolean;
}

/** Why the back office has to look at it before issuing. */
export function fireReferral(a: Pick<FireApplicant, 'construction' | 'priorLoss' | 'province' | 'renewal'>, totalSi: number, s: FireSettings = settings): FireOffer['referral'] {
  if (a.renewal) return [];
  return [
    ...(totalSi > s.referralSi ? (['si'] as const) : []),
    ...(a.construction === 'wood' ? (['wood'] as const) : []),
    ...(a.priorLoss ? (['loss'] as const) : []),
    ...(s.floodProvinces.includes(a.province) ? (['flood'] as const) : []),
  ];
}

/** Premium for a product and applicant (gross, incl. tax and duty), or undefined if it cannot be priced. */
export function firePremium(p: FireProduct, a: Pick<FireApplicant, 'construction' | 'buildingSi' | 'contentsSi' | 'perils'>) {
  const perils = a.perils.filter((x) => p.perils.includes(x));
  if (p.mode === 'plan') return p.planPrice + perils.reduce((t, x) => t + (p.perilPrices[x] ?? 0), 0);
  const total = a.buildingSi + a.contentsSi;
  if (!(total > 0)) return undefined;
  const rate = (p.rates[a.construction] ?? 0) + perils.reduce((t, x) => t + (p.perilRates[x] ?? 0), 0);
  return Math.max(p.minPremium, round10((total / 1000) * rate));
}

/** A product priced for one property, as a package (type FIRE) the usual sales flow can carry. */
export function firePackage(p: FireProduct, a: FireApplicant, agentId?: string): Package | null {
  if (p.occupancy !== a.occupancy) return null;
  const buildingSi = p.mode === 'plan' ? p.planBuildingSi : a.buildingSi;
  const contentsSi = p.mode === 'plan' ? p.planContentsSi : a.contentsSi;
  const perils = a.perils.filter((x) => p.perils.includes(x));
  const premium = firePremium(p, { construction: a.construction, buildingSi, contentsSi, perils });
  if (premium === undefined) return null;
  return {
    id: p.id,
    type: 'FIRE',
    repair: null,
    deductible: 0,
    ownDamage: 0,
    fireTheft: 0,
    flood: perils.includes('flood'),
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
    premium,
    nameTh: p.nameTh,
    nameEn: p.nameEn,
    ver: p.ver,
    docs: ['idcard', 'house'],
    ...(p.badge ? { badge: p.badge } : {}),
    comRate: fireCommission(p, agentId),
    fire: {
      productId: p.id,
      mode: p.mode,
      occupancy: a.occupancy,
      building: a.building,
      construction: a.construction,
      area: a.area,
      yearBuilt: a.yearBuilt,
      owner: a.owner,
      address: a.address,
      province: a.province,
      buildingSi,
      contentsSi,
      perils,
      priorLoss: a.priorLoss,
      ...(a.beneficiary?.trim() ? { beneficiary: a.beneficiary.trim() } : {}),
      referral: fireReferral(a, buildingSi + contentsSi),
      start: a.start,
      end: fireEnd(a.start),
    },
  };
}

/** Products on offer for an applicant, cheapest first. */
export function firePackages(a: FireApplicant, opts: { channel?: 'self' | 'partner'; agentId?: string } = {}): Package[] {
  return products
    .filter((p) => !p.archived && p.mode === settings.mode && (!opts.channel || fireOnSale(p, opts.channel, opts.agentId)))
    .map((p) => firePackage(p, a, opts.agentId))
    .filter((x): x is Package => !!x)
    .sort((a, b) => a.premium - b.premium);
}

/** "Fire · detached house · Bangkok". */
export function fireText(f: Pick<FireOffer, 'building' | 'province'>, lang: Lang) {
  return `${lang === 'th' ? 'ประกันอัคคีภัย' : 'Fire'} · ${buildingName(f.building, lang)} · ${f.province}`;
}

/** Blank product for "create new". */
export function blankFireProduct(id: string, by: string, mode: FireMode, occupancy: FireOccupancy, now = Date.now()): FireProduct {
  const std = defaultFireProducts(now).find((p) => p.mode === mode && p.occupancy === occupancy)!;
  return { ...structuredClone(std), id, ver: 0, updatedAt: now, updatedBy: by, nameTh: '', nameEn: '', tagTh: '', tagEn: '', highlightsTh: [], highlightsEn: [], badge: undefined, channels: { self: false, partner: false }, commission: undefined, partnerCommission: {} };
}
