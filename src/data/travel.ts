import type { Lang, Package, TravelCover, TravelProduct, TravelRateRow, TravelZone, Trip, TripType, Vehicle } from '../types';
import { vehicleText } from './vehicles';

const DAY = 86_400_000;

/** Single trips run 1-180 days; an annual plan covers any number of trips of up to 90 days each. */
export const SINGLE_MAX_DAYS = 180;
export const ANNUAL_TRIP_DAYS = 90;
/** Schengen visas need medical cover of at least 30,000 EUR (about 1.1 million THB). */
export const SCHENGEN_MIN_MEDICAL = 1_100_000;
/** Standard commission for travel, in % of net premium (editable per plan and per partner). */
export const TRAVEL_COMMISSION = 20;

export const COVER_KEYS: (keyof TravelCover)[] = ['medical', 'death', 'evacuation', 'tripCancel', 'baggage', 'baggageDelay', 'flightDelay', 'liability'];

export function defaultZones(): TravelZone[] {
  return [
    { id: 'asia', nameTh: 'เอเชีย', nameEn: 'Asia', noteTh: 'ญี่ปุ่น เกาหลี จีน ไต้หวัน ฮ่องกง อาเซียน อินเดีย', noteEn: 'Japan, Korea, China, Taiwan, Hong Kong, ASEAN, India', schengen: false },
    { id: 'world', nameTh: 'ทั่วโลก (ยกเว้นอเมริกา)', nameEn: 'Worldwide (excl. Americas)', noteTh: 'ยุโรปรวมเชงเก้น สหราชอาณาจักร ออสเตรเลีย ตะวันออกกลาง แอฟริกา', noteEn: 'Europe incl. Schengen, UK, Australia, Middle East, Africa', schengen: true },
    { id: 'worldUs', nameTh: 'ทั่วโลก รวมอเมริกา', nameEn: 'Worldwide incl. Americas', noteTh: 'ทุกประเทศ รวมสหรัฐอเมริกา แคนาดา และอเมริกาใต้', noteEn: 'Every country, incl. the USA, Canada and South America', schengen: true },
  ];
}

/** Trip-length bands of the single-trip rate tables. */
const BANDS: [number, number][] = [[1, 4], [5, 8], [9, 15], [16, 31], [32, 60], [61, 90], [91, 120], [121, 180]];
const ASIA_BASIC = [250, 360, 520, 850, 1500, 2200, 2900, 3800];
const ZONE_FACTOR: Record<string, number> = { asia: 1, world: 1.6, worldUs: 2 };
const round10 = (n: number) => Math.round(n / 10) * 10;

function rates(planFactor: number): TravelRateRow[] {
  return BANDS.map(([dayFrom, dayTo], i) => ({
    dayFrom,
    dayTo,
    prices: Object.fromEntries(Object.entries(ZONE_FACTOR).map(([z, f]) => [z, round10(ASIA_BASIC[i] * f * planFactor)])),
  }));
}
const annual = (planFactor: number) => ({ asia: round10(2900 * planFactor), world: round10(4600 * planFactor), worldUs: round10(5900 * planFactor) });

const TERMS_TH = 'คุ้มครองระหว่างการเดินทางนอกประเทศไทย ตั้งแต่ออกจากประเทศไทยจนกลับถึงประเทศไทย ภายในระยะเวลาเอาประกันภัย ค่ารักษาพยาบาลจ่ายตามจริงไม่เกินวงเงิน';
const TERMS_EN = 'Covers you while travelling outside Thailand, from leaving Thailand until you return, within the period of insurance. Medical expenses are paid as incurred up to the limit.';
const EXCL_TH = ['โรคที่เป็นมาก่อนการเดินทาง (Pre-existing conditions)', 'การเดินทางเพื่อไปรับการรักษาพยาบาล', 'กีฬาอันตราย เช่น ดำน้ำลึกเกิน 30 เมตร ปีนเขาที่ต้องใช้เชือก', 'สงคราม การจลาจล และการก่อการร้ายด้วยอาวุธนิวเคลียร์ ชีวภาพ หรือเคมี'];
const EXCL_EN = ['Pre-existing medical conditions', 'Travelling to get medical treatment', 'Dangerous sports, e.g. diving below 30 m or roped climbing', 'War, riots, and nuclear, biological or chemical terrorism'];

export function defaultTravelProducts(now = Date.now()): TravelProduct[] {
  const at = now - 90 * DAY;
  const plan = (id: string, th: string, en: string, tagTh: string, tagEn: string, hlTh: string[], hlEn: string[], cover: TravelCover, factor: number, badge?: TravelProduct['badge']): TravelProduct => ({
    id,
    ver: 1,
    updatedAt: at,
    updatedBy: 'system',
    nameTh: th,
    nameEn: en,
    tagTh,
    tagEn,
    highlightsTh: hlTh,
    highlightsEn: hlEn,
    ...(badge ? { badge } : {}),
    channels: { self: true, partner: true },
    partners: 'all',
    cover,
    single: rates(factor),
    annual: annual(factor),
    maxAge: 80,
    loadAge: 70,
    loadPct: 50,
    partnerCommission: {},
    termsTh: TERMS_TH,
    termsEn: TERMS_EN,
    exclusionsTh: EXCL_TH,
    exclusionsEn: EXCL_EN,
  });
  return [
    plan('TRV-BASIC', 'เดินทาง Basic', 'Travel Basic', 'ผ่านเกณฑ์วีซ่าเชงเก้น ราคาประหยัด', 'Meets Schengen visa rules at a low price', ['ค่ารักษาพยาบาล 2 ล้านบาท', 'ใช้ยื่นวีซ่าเชงเก้นได้'], ['2M THB medical', 'Accepted for Schengen visas'],
      { medical: 2_000_000, death: 1_000_000, evacuation: 2_000_000, tripCancel: 20_000, baggage: 20_000, baggageDelay: 0, flightDelay: 0, liability: 1_000_000 }, 1),
    plan('TRV-PLUS', 'เดินทาง Plus', 'Travel Plus', 'คุ้มครองครบ รวมเที่ยวบินและกระเป๋าล่าช้า', 'Full cover incl. flight and baggage delay', ['ค่ารักษาพยาบาล 4 ล้านบาท', 'เที่ยวบินล่าช้า กระเป๋าล่าช้า', 'ยกเลิกการเดินทาง 50,000 บาท'], ['4M THB medical', 'Flight and baggage delay', 'Trip cancellation 50,000 THB'],
      { medical: 4_000_000, death: 2_000_000, evacuation: 4_000_000, tripCancel: 50_000, baggage: 40_000, baggageDelay: 10_000, flightDelay: 10_000, liability: 2_000_000 }, 1.6, 'recommended'),
    plan('TRV-MAX', 'เดินทาง Max', 'Travel Max', 'วงเงินสูงสุด สำหรับทริปยาวและอเมริกา', 'Highest limits for long trips and the Americas', ['ค่ารักษาพยาบาล 8 ล้านบาท', 'ยกเลิกการเดินทาง 150,000 บาท'], ['8M THB medical', 'Trip cancellation 150,000 THB'],
      { medical: 8_000_000, death: 3_000_000, evacuation: 8_000_000, tripCancel: 150_000, baggage: 80_000, baggageDelay: 20_000, flightDelay: 20_000, liability: 3_000_000 }, 2.4),
  ];
}

let products: TravelProduct[] = defaultTravelProducts();
let zones: TravelZone[] = defaultZones();

/** The store hands the current travel catalogue over whenever it changes. */
export function setTravelCatalog(list: TravelProduct[], zoneList: TravelZone[]) {
  products = list;
  zones = zoneList;
}
export const getTravelProducts = () => products;
export const getZones = () => zones;
export const zoneById = (id: string) => zones.find((z) => z.id === id);

/** Inclusive days between two YYYY-MM-DD dates (a same-day trip counts as one day). */
export function tripDays(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / DAY) + 1 : 0;
}

/** A trip for a zone; an annual plan runs one year from the start date. */
export function makeTrip(type: TripType, zoneId: string, start: string, end: string, dest = ''): Trip | null {
  const z = zoneById(zoneId);
  if (!z || !start) return null;
  if (type === 'annual') {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    d.setUTCDate(d.getUTCDate() - 1);
    const last = d.toISOString().slice(0, 10);
    return { type, zoneId, zoneTh: z.nameTh, zoneEn: z.nameEn, dest, start, end: last, days: tripDays(start, last) };
  }
  const days = tripDays(start, end);
  if (days < 1 || days > SINGLE_MAX_DAYS) return null;
  return { type, zoneId, zoneTh: z.nameTh, zoneEn: z.nameEn, dest, start, end, days };
}

/** Age in whole years on a given date (YYYY-MM-DD). */
export function ageOn(birth: string, on: string) {
  const b = new Date(`${birth}T00:00:00Z`);
  const d = new Date(`${on}T00:00:00Z`);
  if (!Number.isFinite(b.getTime()) || !Number.isFinite(d.getTime())) return NaN;
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

const endOfDay = (d: string) => new Date(`${d}T23:59:59+07:00`).getTime();
export const travelExpired = (p: TravelProduct, now = Date.now()) => !!p.saleUntil && endOfDay(p.saleUntil) < now;

export function travelOnSale(p: TravelProduct, channel: 'self' | 'partner', agentId?: string, now = Date.now()) {
  if (p.archived || !p.channels[channel] || travelExpired(p, now)) return false;
  return channel !== 'partner' || !agentId || p.partners === 'all' || p.partners.includes(agentId);
}

export function travelCommission(p: TravelProduct, agentId?: string) {
  const own = agentId ? p.partnerCommission[agentId] : undefined;
  return (own ?? p.commission ?? TRAVEL_COMMISSION) / 100;
}

/** Base price of a plan for a trip (before the older-traveller loading), or undefined if not sold. */
export function basePrice(p: TravelProduct, trip: Pick<Trip, 'type' | 'zoneId' | 'days'>) {
  if (trip.type === 'annual') return p.annual[trip.zoneId];
  return p.single.find((r) => trip.days >= r.dayFrom && trip.days <= r.dayTo)?.prices[trip.zoneId];
}

export const meetsSchengen = (cover: TravelCover, zone?: TravelZone) => !!zone?.schengen && cover.medical >= SCHENGEN_MIN_MEDICAL;

/** A plan priced for one trip and traveller, as a package (type TRV) the usual sales flow can carry. */
export function travelPackage(p: TravelProduct, trip: Trip, age: number, agentId?: string): Package | null {
  const price = basePrice(p, trip);
  if (price === undefined || !(age >= 0) || age > p.maxAge) return null;
  const premium = age > p.loadAge && p.loadPct ? round10(price * (1 + p.loadPct / 100)) : price;
  return {
    id: p.id,
    type: 'TRV',
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
    premium,
    nameTh: p.nameTh,
    nameEn: p.nameEn,
    ver: p.ver,
    docs: [],
    ...(p.badge ? { badge: p.badge } : {}),
    comRate: travelCommission(p, agentId),
    travel: { productId: p.id, trip, cover: { ...p.cover }, schengen: meetsSchengen(p.cover, zoneById(trip.zoneId)) },
  };
}

/** Plans on offer for a trip and traveller age, cheapest first. */
export function travelPackages(trip: Trip, age: number, opts: { channel?: 'self' | 'partner'; agentId?: string } = {}): Package[] {
  return products
    .filter((p) => !p.archived && (!opts.channel || travelOnSale(p, opts.channel, opts.agentId)))
    .map((p) => travelPackage(p, trip, age, opts.agentId))
    .filter((x): x is Package => !!x)
    .sort((a, b) => a.premium - b.premium);
}

const fmtD = (d: string, lang: Lang) => new Date(`${d}T12:00:00+07:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "Asia · 7 days" / "Asia · annual". */
export function tripText(trip: Trip, lang: Lang) {
  const zone = lang === 'th' ? trip.zoneTh : trip.zoneEn;
  const len = trip.type === 'annual' ? (lang === 'th' ? 'รายปี' : 'annual') : lang === 'th' ? `${trip.days} วัน` : `${trip.days} day${trip.days > 1 ? 's' : ''}`;
  return `${zone} · ${len}`;
}
export const tripRange = (trip: Trip, lang: Lang) => `${fmtD(trip.start, lang)} – ${fmtD(trip.end, lang)}`;

/** What a case or quotation is about: the car, or the trip for travel. */
export function subjectText(x: { vehicle?: Vehicle; pkg?: Package; options?: { pkg: Package }[] }, lang: Lang) {
  if (x.vehicle) return vehicleText(x.vehicle);
  const trip = x.pkg?.travel?.trip ?? x.options?.[0]?.pkg.travel?.trip;
  return `${lang === 'th' ? 'ประกันเดินทาง' : 'Travel'}${trip ? ` · ${tripText(trip, lang)}` : ''}`;
}

/** Blank plan for "create new". */
export function blankTravelProduct(id: string, by: string, now = Date.now()): TravelProduct {
  const std = defaultTravelProducts(now)[0];
  return { ...structuredClone(std), id, ver: 0, updatedAt: now, updatedBy: by, nameTh: '', nameEn: '', tagTh: '', tagEn: '', highlightsTh: [], highlightsEn: [], badge: undefined, channels: { self: false, partner: false }, commission: undefined, partnerCommission: {} };
}

export function travelPriceRange(p: TravelProduct): [number, number] | null {
  const all = [...p.single.flatMap((r) => Object.values(r.prices)), ...Object.values(p.annual)].filter((v) => typeof v === 'number' && v > 0);
  return all.length ? [Math.min(...all), Math.max(...all)] : null;
}

