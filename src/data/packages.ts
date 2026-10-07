import type { CarModel, CoverageType, DocKey, Package, UsageCode } from '../types';
import { CURRENT_YEAR } from './vehicles';

export const COVERAGE_TYPES: CoverageType[] = ['T1', 'T2P', 'T3P', 'T2', 'T3', 'CMI'];
export const QUOTE_TYPES: CoverageType[] = ['T1', 'T2P', 'T3P', 'T2', 'T3'];

/** Compulsory motor insurance (พ.ร.บ.) gross premium by vehicle use. */
const CMI: Partial<Record<UsageCode, number>> = { '110': 645.21, '210': 1182.35, '320': 967.28 };
/** Compulsory (พ.ร.บ.) premium for a vehicle code; undefined when an agent has to price it. */
export const cmiPremium = (code: UsageCode) => CMI[code];
/** Codes ABC sells self-service and through ready-made packages. */
export const SELF_SERVICE_TYPES: CoverageType[] = ['T2P', 'T3P', 'CMI'];

export const REQUIRED_DOCS: Record<CoverageType, DocKey[]> = {
  T1: ['front', 'back', 'left', 'right', 'regbook', 'idcard'],
  T2P: ['regbook', 'idcard'],
  T3P: ['regbook', 'idcard'],
  T2: ['regbook', 'idcard'],
  T3: ['regbook', 'idcard'],
  CMI: ['regbook', 'idcard'],
};

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const round10 = (n: number) => Math.round(n / 10) * 10;

const thirdParty = (big: boolean) => ({
  tpbiPerson: 1_000_000,
  tpbiAccident: 10_000_000,
  tppd: big ? 2_500_000 : 1_000_000,
  pa: 100_000,
  medical: 100_000,
  bail: 300_000,
});

/** Class 1 base premium; also used to price manual quotes. */
/** Price adjustment by vehicle code: pickups (320) are cheaper, vans (210) dearer. */
const ADJ: Partial<Record<UsageCode, { t1: number; plus: number; t2: number; t3: number }>> = {
  '110': { t1: 1, plus: 0, t2: 3890, t3: 2290 },
  '320': { t1: 0.92, plus: -500, t2: 4290, t3: 2590 },
  '210': { t1: 1.12, plus: 1000, t2: 4590, t3: 2990 },
};
const adj = (code: UsageCode) => ADJ[code] ?? ADJ['110']!;

export function class1Premium(model: CarModel, code: UsageCode, si: number, repair: 'dealer' | 'garage', deductible: number) {
  const rate = repair === 'dealer' ? 0.026 : 0.021;
  const factor = adj(code).t1 * (model.body === 'ev' ? 1.25 : 1);
  const dedFactor = deductible >= 5000 ? 0.8 : deductible >= 3000 ? 0.86 : 1;
  const floor = repair === 'dealer' ? 16500 : 13500;
  return round10(Math.max(floor, si * rate * factor) * dedFactor);
}

/**
 * Packages ABC sells for a given car and vehicle code. Rules (sample):
 * Class 1 up to 10 years old (dealer repair up to 5), EVs get Class 1 / 3 only,
 * 2+ / 3+ up to 15 years, Class 2 / 3 and CMI for every car.
 * Models flagged noPackage get nothing and go to the quote request flow.
 */
export function packagesFor(model: CarModel, code: UsageCode, year: number, si: number): Package[] {
  if (model.noPackage) return [];
  const age = CURRENT_YEAR - year;
  const ev = model.body === 'ev';
  const a = adj(code);
  const out: Package[] = [];
  const base = { ownDamage: 0, fireTheft: 0, flood: false, deductible: 0, repair: null as Package['repair'] };

  if (age <= 10) {
    const variants: ['dealer' | 'garage', number][] = [];
    if (age <= 5) variants.push(['dealer', 0]);
    variants.push(['garage', 0], ['garage', 3000]);
    for (const [repair, deductible] of variants) {
      out.push({
        ...base,
        ...thirdParty(true),
        id: `T1-${repair}-${deductible}`,
        type: 'T1',
        repair,
        deductible,
        ownDamage: si,
        fireTheft: si,
        flood: true,
        premium: class1Premium(model, code, si, repair, deductible),
      });
    }
  }
  if (!ev && age <= 15) {
    for (const cover of si >= 300000 ? [200000, 300000] : [200000]) {
      out.push({
        ...base,
        ...thirdParty(false),
        id: `T2P-${cover}`,
        type: 'T2P',
        repair: 'garage',
        ownDamage: cover,
        fireTheft: cover,
        premium: (cover === 300000 ? 9900 : 8900) + a.plus,
      });
    }
    for (const cover of [100000, 200000]) {
      out.push({
        ...base,
        ...thirdParty(false),
        id: `T3P-${cover}`,
        type: 'T3P',
        repair: 'garage',
        ownDamage: cover,
        premium: (cover === 200000 ? 7900 : 6900) + Math.round(a.plus * 0.8),
      });
    }
  }
  if (!ev) {
    out.push({
      ...base,
      ...thirdParty(false),
      id: 'T2',
      type: 'T2',
      fireTheft: Math.min(500000, Math.floor((si * 0.7) / 10000) * 10000),
      premium: a.t2,
    });
  }
  out.push({ ...base, ...thirdParty(false), id: 'T3', type: 'T3', premium: a.t3 });
  const cmi = cmiPremium(code);
  if (cmi !== undefined)
    out.push({
      ...base,
      id: 'CMI',
      type: 'CMI',
      tpbiPerson: 80_000,
      tpbiAccident: 0,
      tppd: 0,
      pa: 500_000,
      medical: 80_000,
      bail: 0,
      premium: cmi,
    });
  return out;
}

/** Reference price shown to agents when they write a quote. */
export function estimateQuote(model: CarModel, code: UsageCode, si: number, type: CoverageType): number {
  const a = adj(code);
  switch (type) {
    case 'T1':
      return class1Premium(model, code, si, 'garage', 0);
    case 'T2P':
      return 9400 + a.plus;
    case 'T3P':
      return 7400 + Math.round(a.plus * 0.8);
    case 'T2':
      return a.t2 + 100;
    case 'T3':
      return a.t3 + 100;
    default:
      return cmiPremium(code) ?? 0;
  }
}

/** 0% instalments on card: 10 months from 10,000 THB, 6 months from 4,000 THB. */
export function installmentPlan(premium: number): { months: number; monthly: number } | null {
  const months = premium >= 10000 ? 10 : premium >= 4000 ? 6 : 0;
  return months ? { months, monthly: Math.ceil(premium / months) } : null;
}

/** "Best seller" and "best value" picks among the packages shown for a car. */
export function packageBadges(pkgs: Package[]): { popular?: string; value?: string } {
  const has = (id: string) => pkgs.some((p) => p.id === id);
  const popular = has('T1-garage-0')
    ? 'T1-garage-0'
    : (pkgs.find((p) => p.type === 'T2P' && p.ownDamage >= 300000) ?? pkgs.find((p) => p.type === 'T2P'))?.id;
  const value = has('T1-garage-3000') ? 'T1-garage-3000' : pkgs.find((p) => p.type === 'T3P' && p.ownDamage >= 200000)?.id;
  return { popular, value: value === popular ? undefined : value };
}

export type Scenario = 'collide' | 'solo' | 'theftFire' | 'flood' | 'thirdParty';
export const SCENARIOS: Scenario[] = ['collide', 'solo', 'theftFire', 'flood', 'thirdParty'];

/** Which everyday situations each cover type pays for, in plain terms. */
export const SCENARIO_COVER: Record<CoverageType, Record<Scenario, boolean>> = {
  T1: { collide: true, solo: true, theftFire: true, flood: true, thirdParty: true },
  T2P: { collide: true, solo: false, theftFire: true, flood: false, thirdParty: true },
  T3P: { collide: true, solo: false, theftFire: false, flood: false, thirdParty: true },
  T2: { collide: false, solo: false, theftFire: true, flood: false, thirdParty: true },
  T3: { collide: false, solo: false, theftFire: false, flood: false, thirdParty: true },
  CMI: { collide: false, solo: false, theftFire: false, flood: false, thirdParty: false },
};
