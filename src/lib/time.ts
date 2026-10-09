/** Business hours: Monday–Friday 08:30–17:30, Bangkok time (UTC+7). Public holidays are not excluded. */
const TZ = 7 * 3600_000;
const DAY = 86_400_000;
const OPEN = (8 * 60 + 30) * 60_000;
const CLOSE = (17 * 60 + 30) * 60_000;
export const BIZ_DAY_MIN = 9 * 60;

const dayStart = (t: number) => Math.floor((t + TZ) / DAY) * DAY - TZ;
const isWeekday = (day: number) => {
  const dow = new Date(day + TZ).getUTCDay();
  return dow >= 1 && dow <= 5;
};

/** Business minutes elapsed between a and b. */
export function bizMinutes(a: number, b: number): number {
  if (b <= a) return 0;
  let total = 0;
  for (let day = dayStart(a); day < b; day += DAY) {
    if (!isWeekday(day)) continue;
    const s = Math.max(a, day + OPEN);
    const e = Math.min(b, day + CLOSE);
    if (e > s) total += e - s;
  }
  return total / 60_000;
}

/** The moment `mins` business minutes after `start`. */
export function addBizMinutes(start: number, mins: number): number {
  let left = mins * 60_000;
  let t = start;
  for (let day = dayStart(start); ; day += DAY) {
    if (!isWeekday(day)) continue;
    const s = Math.max(t, day + OPEN);
    const e = day + CLOSE;
    if (e <= s) continue;
    if (e - s >= left) return s + left;
    left -= e - s;
    t = e;
  }
}

export const isBusinessTime = (t: number) => {
  const day = dayStart(t);
  return isWeekday(day) && t >= day + OPEN && t < day + CLOSE;
};

/** Bangkok-local calendar day key, e.g. 2026-10-07. */
export const dayKey = (t: number) => new Date(t + TZ).toISOString().slice(0, 10);
export const monthKey = (t: number) => new Date(t + TZ).toISOString().slice(0, 7);
export const startOfBkkDay = dayStart;
export const DAY_MS = DAY;

/** Bangkok wall-clock parts of a timestamp. */
export const bkkParts = (t: number) => {
  const d = new Date(t + TZ);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() };
};

/** Timestamp for a Bangkok wall-clock time. */
export const bkkTime = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo, d, h, mi) - TZ;
