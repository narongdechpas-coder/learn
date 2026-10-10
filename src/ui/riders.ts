import type { Package } from '../types';
import { fmtBaht, type TKey } from '../i18n';

type T = (k: TKey, v?: Record<string, string | number>) => string;

/**
 * Rider rows (R.Y.01–03) as a policy schedule shows them: driver and passengers apart, permanent
 * and temporary disability apart. `passengers` is undefined when it depends on the car (catalogue).
 */
export function riderRows(p: Pick<Package, 'pa' | 'paPassenger' | 'tempDriver' | 'tempPassenger' | 'medical' | 'bail'> & { passengers?: number }, t: T, lang: 'th' | 'en'): [string, string][] {
  const n = p.passengers;
  const money = (v: number, unit = '') => (v ? `${fmtBaht(v, lang)}${unit}` : t('notCovered'));
  const rows: [string, string][] = [
    [t('rdPaDriver'), money(p.pa)],
    [n === undefined ? t('rdPaPassengerAny') : t('rdPaPassenger', { n }), money(p.paPassenger, t('perPerson'))],
  ];
  if (p.tempDriver || p.tempPassenger) {
    rows.push([t('rdTempDriver'), money(p.tempDriver, t('rdPerWeek'))]);
    rows.push([n === undefined ? t('rdTempPassengerAny') : t('rdTempPassenger', { n }), money(p.tempPassenger, t('rdPerPersonWeek'))]);
  }
  rows.push([n === undefined ? t('rdMedicalAny') : t('rdMedical', { n: n + 1 }), money(p.medical, t('perPerson'))]);
  rows.push([t('rdBail'), money(p.bail, t('rdPerCase'))]);
  return rows;
}
