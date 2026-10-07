import type { BodyType, CarModel, CoverageType, DocKey, Package } from '../types';
import { CURRENT_YEAR } from './vehicles';

export const COVERAGE_TYPES: CoverageType[] = ['T1', 'T2P', 'T3P', 'T2', 'T3', 'CMI'];
export const QUOTE_TYPES: CoverageType[] = ['T1', 'T2P', 'T3P', 'T2', 'T3'];

/** Compulsory motor insurance (พ.ร.บ.) gross premium by vehicle use. */
export const cmiPremium = (body: BodyType) => (body === 'pickup' ? 967.28 : 645.21);

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
export function class1Premium(body: BodyType, si: number, repair: 'dealer' | 'garage', deductible: number) {
  const rate = repair === 'dealer' ? 0.026 : 0.021;
  const bodyFactor = body === 'pickup' ? 0.92 : body === 'ev' ? 1.25 : 1;
  const dedFactor = deductible >= 5000 ? 0.8 : deductible >= 3000 ? 0.86 : 1;
  const floor = repair === 'dealer' ? 16500 : 13500;
  return round10(Math.max(floor, si * rate * bodyFactor) * dedFactor);
}

/**
 * Packages ABC sells for a given car. Rules (sample):
 * Class 1 up to 10 years old (dealer repair up to 5), EVs get Class 1 / 3 only,
 * 2+ / 3+ up to 15 years, Class 2 / 3 and CMI for every car.
 * Models flagged noPackage get nothing and go to the quote request flow.
 */
export function packagesFor(model: CarModel, year: number, si: number): Package[] {
  if (model.noPackage) return [];
  const age = CURRENT_YEAR - year;
  const ev = model.body === 'ev';
  const pickup = model.body === 'pickup';
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
        premium: class1Premium(model.body, si, repair, deductible),
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
        premium: (cover === 300000 ? 9900 : 8900) - (pickup ? 500 : 0),
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
        premium: (cover === 200000 ? 7900 : 6900) - (pickup ? 400 : 0),
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
      premium: pickup ? 4290 : 3890,
    });
  }
  out.push({ ...base, ...thirdParty(false), id: 'T3', type: 'T3', premium: pickup ? 2590 : 2290 });
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
    premium: cmiPremium(model.body),
  });
  return out;
}

/** Ballpark price used for seeded quotes. */
export function estimateQuote(model: CarModel, si: number, type: CoverageType): number {
  switch (type) {
    case 'T1':
      return class1Premium(model.body, si, 'garage', 0);
    case 'T2P':
      return 9400;
    case 'T3P':
      return 7400;
    case 'T2':
      return 3990;
    case 'T3':
      return 2390;
    default:
      return cmiPremium(model.body);
  }
}
