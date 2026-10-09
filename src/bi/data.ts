// Simulated non-life insurer data for the Multi-Lens dashboard.
// Everything is generated from a fixed seed so every viewer sees the same numbers.
// Money is in THB millions unless a field name says otherwise.

export const PRODUCTS = ['motor', 'fire', 'marine', 'health', 'misc'] as const;
export const CHANNELS = ['agency', 'broker', 'banca', 'direct'] as const;
export const REGIONS = ['bkk', 'central', 'north', 'northeast', 'south'] as const;
export type Product = (typeof PRODUCTS)[number];
export type Channel = (typeof CHANNELS)[number];
export type Region = (typeof REGIONS)[number];

/** Month index 0 = Jan 2025 … 20 = Sep 2026 (latest closed month). */
export const FIRST_YEAR = 2025;
export const MONTHS = 21;
export const LATEST = MONTHS - 1;
export const CY = 2026;
export const monthYear = (m: number) => FIRST_YEAR + Math.floor(m / 12);
export const monthOfYear = (m: number) => m % 12;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261009);
const jitter = (spread: number) => 1 + (R() * 2 - 1) * spread;
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

// ---------- dimensions ----------
export interface Unit {
  id: string;
  ch: Channel;
  rg: Region;
  th: string;
  en: string;
  /** 2026 delivery vs plan (hidden driver of the story). */
  perf: number;
}
export const UNITS: Unit[] = [
  { id: 'AG01', ch: 'agency', rg: 'bkk', th: 'ตัวแทน สุขุมวิท', en: 'Agency Sukhumvit', perf: 1.08 },
  { id: 'AG02', ch: 'agency', rg: 'bkk', th: 'ตัวแทน รัชดา', en: 'Agency Ratchada', perf: 1.02 },
  { id: 'AG03', ch: 'agency', rg: 'central', th: 'ตัวแทน ชลบุรี', en: 'Agency Chonburi', perf: 0.97 },
  { id: 'AG04', ch: 'agency', rg: 'north', th: 'ตัวแทน เชียงใหม่', en: 'Agency Chiang Mai', perf: 0.84 },
  { id: 'AG05', ch: 'agency', rg: 'northeast', th: 'ตัวแทน ขอนแก่น', en: 'Agency Khon Kaen', perf: 1.05 },
  { id: 'AG06', ch: 'agency', rg: 'south', th: 'ตัวแทน หาดใหญ่', en: 'Agency Hat Yai', perf: 0.93 },
  { id: 'BR01', ch: 'broker', rg: 'bkk', th: 'โบรกเกอร์ อัลฟ่า', en: 'Alpha Broker', perf: 1.04 },
  { id: 'BR02', ch: 'broker', rg: 'bkk', th: 'โบรกเกอร์ เบต้า', en: 'Beta Broker', perf: 0.88 },
  { id: 'BR03', ch: 'broker', rg: 'central', th: 'โบรกเกอร์ แกมมา', en: 'Gamma Broker', perf: 0.95 },
  { id: 'BR04', ch: 'broker', rg: 'bkk', th: 'โบรกเกอร์ เดลต้า', en: 'Delta Broker', perf: 1.1 },
  { id: 'BR05', ch: 'broker', rg: 'south', th: 'โบรกเกอร์ โอเมก้า', en: 'Omega Broker', perf: 0.8 },
  { id: 'BR06', ch: 'broker', rg: 'northeast', th: 'โบรกเกอร์ ซิกม่า', en: 'Sigma Broker', perf: 0.97 },
  { id: 'BA01', ch: 'banca', rg: 'bkk', th: 'ธนาคารพันธมิตร A', en: 'Partner Bank A', perf: 1.03 },
  { id: 'BA02', ch: 'banca', rg: 'bkk', th: 'ธนาคารพันธมิตร B', en: 'Partner Bank B', perf: 0.98 },
  { id: 'BA03', ch: 'banca', rg: 'central', th: 'ธนาคารพันธมิตร C', en: 'Partner Bank C', perf: 0.9 },
  { id: 'BA04', ch: 'banca', rg: 'north', th: 'ลีสซิ่งพันธมิตร D', en: 'Partner Leasing D', perf: 1.06 },
  { id: 'BA05', ch: 'banca', rg: 'northeast', th: 'ลีสซิ่งพันธมิตร E', en: 'Partner Leasing E', perf: 0.96 },
  { id: 'BA06', ch: 'banca', rg: 'south', th: 'ธนาคารพันธมิตร F', en: 'Partner Bank F', perf: 1.0 },
  { id: 'DI01', ch: 'direct', rg: 'bkk', th: 'เว็บไซต์ / Online', en: 'Website / Online', perf: 1.12 },
  { id: 'DI02', ch: 'direct', rg: 'bkk', th: 'Call Center', en: 'Call Center', perf: 0.94 },
  { id: 'DI03', ch: 'direct', rg: 'bkk', th: 'LINE OA', en: 'LINE OA', perf: 1.15 },
  { id: 'DI04', ch: 'direct', rg: 'bkk', th: 'Mobile App', en: 'Mobile App', perf: 1.06 },
  { id: 'DI05', ch: 'direct', rg: 'central', th: 'Marketplace พันธมิตร', en: 'Partner Marketplace', perf: 0.9 },
  { id: 'DI06', ch: 'direct', rg: 'north', th: 'สาขา Walk-in', en: 'Walk-in Branches', perf: 0.86 },
];

const SEASON = [1.08, 0.95, 1.05, 0.92, 0.97, 0.98, 0.96, 1.0, 0.98, 1.02, 1.0, 1.11];
const SEASON_SUM = SEASON.reduce((a, b) => a + b, 0);

const ANNUAL_2025: Record<Product, number> = { motor: 2600, fire: 700, marine: 230, health: 700, misc: 470 };
const GROWTH_2026: Record<Product, number> = { motor: 0.035, fire: 0.06, marine: 0.02, health: 0.16, misc: 0.08 };
const TARGET_GROWTH: Record<Product, number> = { motor: 0.08, fire: 0.07, marine: 0.05, health: 0.14, misc: 0.09 };
const CH_GROWTH: Record<Channel, number> = { agency: 0, broker: -0.03, banca: 0.02, direct: 0.12 };
const CH_MIX: Record<Product, Record<Channel, number>> = {
  motor: { agency: 0.35, broker: 0.25, banca: 0.22, direct: 0.18 },
  fire: { agency: 0.25, broker: 0.45, banca: 0.25, direct: 0.05 },
  marine: { agency: 0.2, broker: 0.7, banca: 0.05, direct: 0.05 },
  health: { agency: 0.3, broker: 0.1, banca: 0.35, direct: 0.25 },
  misc: { agency: 0.3, broker: 0.4, banca: 0.15, direct: 0.15 },
};
const NB_SHARE: Record<Product, number> = { motor: 0.4, fire: 0.33, marine: 0.5, health: 0.45, misc: 0.5 };
const CEDE: Record<Product, number> = { motor: 0.05, fire: 0.45, marine: 0.5, health: 0.1, misc: 0.3 };
export const LR_PLAN: Record<Product, number> = { motor: 0.62, fire: 0.4, marine: 0.5, health: 0.66, misc: 0.45 };
const LR_BASE: Record<Product, number> = { motor: 0.615, fire: 0.37, marine: 0.47, health: 0.65, misc: 0.42 };
const LR_CH: Record<Channel, number> = { agency: 0, broker: 0.035, banca: -0.05, direct: -0.02 };
const LR_RG: Record<Region, number> = { bkk: 0.02, central: -0.01, north: 0, northeast: 0.05, south: 0.015 };
const ER_CH: Record<Channel, number> = { agency: 0.3, broker: 0.315, banca: 0.335, direct: 0.21 };
const ER_PR: Record<Product, number> = { motor: 0, fire: 0.01, marine: 0.025, health: -0.015, misc: 0.01 };
export const ER_PLAN = 0.305;
const AVG_PREM: Record<Product, number> = { motor: 14000, fire: 9000, marine: 26000, health: 8000, misc: 6000 };
const AVG_SEV: Record<Product, number> = { motor: 23000, fire: 88000, marine: 125000, health: 14500, misc: 31000 };
export const RR_PLAN: Record<Channel, number> = { agency: 0.84, broker: 0.8, banca: 0.87, direct: 0.74 };
const RR_BASE: Record<Channel, number> = { agency: 0.83, broker: 0.76, banca: 0.86, direct: 0.69 };
const NOTICE60: Record<Channel, number> = { agency: 0.9, broker: 0.82, banca: 0.95, direct: 0.975 };
const CONV: Record<Channel, number> = { agency: 0.27, broker: 0.34, banca: 0.17, direct: 0.085 };

const MARKET_2025: Record<Product, number> = { motor: 152000, fire: 23000, marine: 7600, health: 58000, misc: 60000 };
const MARKET_GROWTH: Record<Product, number> = { motor: 0.015, fire: 0.03, marine: 0, health: 0.11, misc: 0.04 };

/** Balance-sheet assumptions behind ROE (shown on the page). */
export const EQUITY = 3400;
export const INVESTED = 8600;
export const INV_YIELD = 0.032;
export const TAX = 0.2;

export interface Fact {
  m: number;
  p: Product;
  u: number;
  ch: Channel;
  rg: Region;
  gwp: number;
  nb: number;
  rn: number;
  tgt: number;
  tgtNb: number;
  tgtRn: number;
  nep: number;
  clm: number;
  exp: number;
  /** plan values for the same row, for ratio targets */
  nepPlan: number;
  clmPlan: number;
  expPlan: number;
  polNb: number;
  polRn: number;
  due: number;
  dueTgtRenewed: number;
  n60: number;
  n30: number;
  leads: number;
  clmCnt: number;
}

function buildFacts(): Fact[] {
  const out: Fact[] = [];
  const unitShare = new Map<string, number>();
  for (const ch of CHANNELS) {
    const us = UNITS.filter((u) => u.ch === ch);
    const w = us.map(() => 0.6 + R() * 0.8);
    const tot = w.reduce((a, b) => a + b, 0);
    us.forEach((u, i) => unitShare.set(u.id, w[i] / tot));
  }
  const healthDrift = (m: number) => (monthYear(m) === CY ? 0.012 * monthOfYear(m) : 0);
  for (let m = 0; m < MONTHS; m++) {
    const y = monthYear(m);
    const mo = monthOfYear(m);
    const flood = y === CY && mo >= 6 && mo <= 8;
    for (const p of PRODUCTS) {
      for (let ui = 0; ui < UNITS.length; ui++) {
        const u = UNITS[ui];
        const plan25 = (ANNUAL_2025[p] * CH_MIX[p][u.ch] * unitShare.get(u.id)! * SEASON[mo]) / SEASON_SUM;
        const growth = y === CY ? (1 + GROWTH_2026[p] + CH_GROWTH[u.ch]) * u.perf : 1;
        const gwp = plan25 * growth * jitter(0.12);
        const tgt = y === CY ? plan25 * (1 + TARGET_GROWTH[p] + Math.max(0, CH_GROWTH[u.ch]) * 0.8) : plan25 * 1.06;
        const nbs = NB_SHARE[p] * (u.ch === 'direct' ? 1.25 : 1) * jitter(0.08);
        const nb = gwp * Math.min(0.85, nbs);
        const rn = gwp - nb;
        const tgtNb = tgt * NB_SHARE[p] * (u.ch === 'direct' ? 1.25 : 1);
        const tgtRn = tgt - tgtNb;
        const nep = gwp * (1 - CEDE[p]) * 0.96;
        const nepPlan = tgt * (1 - CEDE[p]) * 0.96;
        let lr = LR_BASE[p] + LR_CH[u.ch] + (p === 'motor' || p === 'misc' ? LR_RG[u.rg] : LR_RG[u.rg] * 0.4);
        if (p === 'health') lr += healthDrift(m);
        if (flood && u.rg === 'north') lr += p === 'fire' ? 0.55 : p === 'motor' ? 0.3 : 0.08;
        if (flood && u.rg === 'central' && p === 'fire') lr += 0.15;
        lr = Math.max(0.12, lr + (R() * 2 - 1) * 0.07);
        const clm = nep * lr;
        const er = ER_CH[u.ch] + ER_PR[p] + (R() * 2 - 1) * 0.015 + (y === CY && u.ch === 'direct' ? 0.02 : 0);
        const exp = nep * er;
        const avg = AVG_PREM[p] / 1e6;
        const polNb = Math.round(nb / avg);
        const polRn = Math.round(rn / avg);
        const rr = Math.min(0.97, Math.max(0.4, RR_BASE[u.ch] + (u.perf - 1) * 0.35 + (R() * 2 - 1) * 0.04 - (y === CY && p === 'health' ? 0.03 : 0)));
        const due = Math.max(polRn, Math.round(polRn / rr));
        const p60 = Math.min(1, NOTICE60[u.ch] + (u.perf - 1) * 0.2 + (R() * 2 - 1) * 0.03);
        const n60 = Math.round(due * p60);
        const n30 = Math.round(n60 + (due - n60) * 0.75);
        const leads = Math.round(polNb / Math.max(0.03, CONV[u.ch] * (0.85 + u.perf * 0.15) * jitter(0.1)));
        const sev = (AVG_SEV[p] / 1e6) * (u.rg === 'northeast' ? 1.06 : u.rg === 'bkk' ? 1.08 : 1) * (flood && u.rg === 'north' ? 1.9 : 1) * jitter(0.1);
        out.push({
          m, p, u: ui, ch: u.ch, rg: u.rg, gwp, nb, rn, tgt, tgtNb, tgtRn, nep, clm, exp,
          nepPlan, clmPlan: nepPlan * LR_PLAN[p], expPlan: nepPlan * ER_PLAN,
          polNb, polRn, due, dueTgtRenewed: due * RR_PLAN[u.ch], n60, n30, leads,
          clmCnt: Math.max(0, Math.round(clm / sev)),
        });
      }
    }
  }
  return out;
}
export const FACTS = buildFacts();

export function marketGwp(p: Product, m: number) {
  const y = monthYear(m);
  const base = (MARKET_2025[p] * SEASON[monthOfYear(m)]) / SEASON_SUM;
  return y === CY ? base * (1 + MARKET_GROWTH[p]) : base;
}

// ---------- period & filters ----------
export type PeriodMode = 'MTD' | 'QTD' | 'YTD';
export interface Filters {
  asOf: number;
  mode: PeriodMode;
  product: Product | 'all';
  channel: Channel | 'all';
  region: Region | 'all';
}
export const DEFAULT_FILTERS: Filters = { asOf: LATEST, mode: 'YTD', product: 'all', channel: 'all', region: 'all' };

export function periodMonths(asOf: number, mode: PeriodMode): number[] {
  const mo = monthOfYear(asOf);
  const start = mode === 'MTD' ? asOf : mode === 'QTD' ? asOf - (mo % 3) : asOf - mo;
  const out: number[] = [];
  for (let m = start; m <= asOf; m++) out.push(m);
  return out;
}

export function matches(f: Fact, flt: Pick<Filters, 'product' | 'channel' | 'region'>) {
  return (flt.product === 'all' || f.p === flt.product) && (flt.channel === 'all' || f.ch === flt.channel) && (flt.region === 'all' || f.rg === flt.region);
}

export interface Agg {
  gwp: number; nb: number; rn: number; tgt: number; tgtNb: number; tgtRn: number;
  nep: number; clm: number; exp: number; nepPlan: number; clmPlan: number; expPlan: number;
  polNb: number; polRn: number; due: number; dueTgtRenewed: number; n60: number; n30: number; leads: number; clmCnt: number;
}
const ZERO: Agg = { gwp: 0, nb: 0, rn: 0, tgt: 0, tgtNb: 0, tgtRn: 0, nep: 0, clm: 0, exp: 0, nepPlan: 0, clmPlan: 0, expPlan: 0, polNb: 0, polRn: 0, due: 0, dueTgtRenewed: 0, n60: 0, n30: 0, leads: 0, clmCnt: 0 };
const KEYS = Object.keys(ZERO) as (keyof Agg)[];

export function agg(rows: Iterable<Fact>): Agg {
  const a = { ...ZERO };
  for (const r of rows) for (const k of KEYS) a[k] += r[k];
  return a;
}

/** Facts for a set of months under the dimension filters. */
export function select(months: number[], flt: Pick<Filters, 'product' | 'channel' | 'region'>, extra?: (f: Fact) => boolean): Fact[] {
  const set = new Set(months);
  return FACTS.filter((f) => set.has(f.m) && matches(f, flt) && (!extra || extra(f)));
}

export function groupAgg<K extends string | number>(rows: Fact[], key: (f: Fact) => K): Map<K, Agg> {
  const buckets = new Map<K, Fact[]>();
  for (const r of rows) {
    const k = key(r);
    const b = buckets.get(k);
    if (b) b.push(r);
    else buckets.set(k, [r]);
  }
  const out = new Map<K, Agg>();
  for (const [k, b] of buckets) out.set(k, agg(b));
  return out;
}

export const ratios = (a: Agg) => {
  const lr = a.nep ? a.clm / a.nep : 0;
  const er = a.nep ? a.exp / a.nep : 0;
  const lrPlan = a.nepPlan ? a.clmPlan / a.nepPlan : 0;
  const erPlan = a.nepPlan ? a.expPlan / a.nepPlan : 0;
  return {
    lr, er, cr: lr + er, lrPlan, erPlan, crPlan: lrPlan + erPlan,
    uwp: a.nep - a.clm - a.exp,
    uwpPlan: a.nepPlan - a.clmPlan - a.expPlan,
    ach: a.tgt ? a.gwp / a.tgt : 0,
    achNb: a.tgtNb ? a.nb / a.tgtNb : 0,
    rr: a.due ? a.polRn / a.due : 0,
    rrPlan: a.due ? a.dueTgtRenewed / a.due : 0,
    achRn: a.tgtRn ? a.rn / a.tgtRn : 0,
    n60: a.due ? a.n60 / a.due : 0,
    n30: a.due ? a.n30 / a.due : 0,
    conv: a.leads ? a.polNb / a.leads : 0,
    freq: a.polNb + a.polRn ? (a.clmCnt / (a.polNb + a.polRn)) * 100 : 0,
    sev: a.clmCnt ? (a.clm * 1e6) / a.clmCnt : 0,
  };
};

// ---------- RAG ----------
export type Rag = 'good' | 'warn' | 'bad';
/** Achievement ratio → RAG: ≥95% green, 85–95% amber, <85% red. */
export const rag = (achievement: number): Rag => (achievement >= 0.95 ? 'good' : achievement >= 0.85 ? 'warn' : 'bad');
/** For lower-is-better ratios (loss, expense, combined) achievement = plan ÷ actual. */
export const ragLower = (actual: number, plan: number): Rag => rag(actual > 0 ? plan / actual : 1);

// ---------- retention analysis (synthetic curves) ----------
export const NONRENEW_REASONS = ['price', 'competitor', 'soldCar', 'service', 'claimExp', 'other'] as const;
export type NonRenewReason = (typeof NONRENEW_REASONS)[number];
export const NONRENEW_MIX: Record<Channel, Record<NonRenewReason, number>> = {
  agency: { price: 0.34, competitor: 0.18, soldCar: 0.19, service: 0.1, claimExp: 0.12, other: 0.07 },
  broker: { price: 0.29, competitor: 0.33, soldCar: 0.14, service: 0.09, claimExp: 0.09, other: 0.06 },
  banca: { price: 0.27, competitor: 0.12, soldCar: 0.3, service: 0.12, claimExp: 0.11, other: 0.08 },
  direct: { price: 0.46, competitor: 0.24, soldCar: 0.12, service: 0.08, claimExp: 0.05, other: 0.05 },
};
export const PRICE_BUCKETS = ['≤ -10%', '-10–0%', '0–5%', '5–10%', '10–20%', '> 20%'];
const PRICE_MID = [-0.13, -0.05, 0.025, 0.075, 0.15, 0.26];
const ELASTICITY: Record<Channel, number> = { agency: 0.55, broker: 0.75, banca: 0.4, direct: 1.15 };
export function renewalByPriceChange(ch: Channel | 'all') {
  const chs: readonly Channel[] = ch === 'all' ? CHANNELS : [ch];
  return PRICE_MID.map((d, i) => {
    const v = chs.reduce((s, c) => s + Math.min(0.97, RR_BASE[c] + 0.03 - ELASTICITY[c] * Math.max(-0.05, d) - (d > 0.18 ? 0.06 : 0)), 0) / chs.length;
    return { bucket: PRICE_BUCKETS[i], rate: v };
  });
}
/** Renewal rate by policy tenure (1st renewal, 2nd, 3–4th, 5+). */
export function renewalByTenure(ch: Channel | 'all') {
  const chs: readonly Channel[] = ch === 'all' ? CHANNELS : [ch];
  const lift = [-0.09, -0.01, 0.04, 0.08];
  return lift.map((l, i) => ({ tenure: i, rate: chs.reduce((s, c) => s + Math.min(0.97, RR_BASE[c] + l), 0) / chs.length }));
}

// ---------- claim sample for distributions ----------
export interface ClaimSample { p: Product; rg: Region; ch: Channel; amount: number }
export const CLAIM_SAMPLE: ClaimSample[] = (() => {
  const r = rng(77);
  const out: ClaimSample[] = [];
  const sigma: Record<Product, number> = { motor: 0.85, fire: 1.25, marine: 1.1, health: 0.75, misc: 1.0 };
  const counts: Record<Product, number> = { motor: 1400, fire: 260, marine: 120, health: 900, misc: 320 };
  for (const p of PRODUCTS) {
    for (let i = 0; i < counts[p]; i++) {
      const rg = REGIONS[Math.floor(r() * REGIONS.length)];
      const ch = CHANNELS[Math.floor(r() * CHANNELS.length)];
      const mu = Math.log(AVG_SEV[p]) - (sigma[p] * sigma[p]) / 2 + (rg === 'north' ? 0.25 : 0);
      out.push({ p, rg, ch, amount: Math.exp(mu + sigma[p] * normal(r)) });
    }
  }
  return out;
})();
