import type { AgentMonth, Case } from '../types';
import { AGENTS } from '../data/agents';
import { DAY_MS, bkkParts, bkkTime, startOfBkkDay } from './time';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED_DAYS = 91;

/** Thirteen months ending with the current one, oldest first, as 'YYYY-MM' plus the month's start time. */
export function last13Months(now: number): { key: string; at: number }[] {
  const p = bkkParts(now);
  const out: { key: string; at: number }[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(Date.UTC(p.y, p.mo - i, 1));
    out.push({ key: d.toISOString().slice(0, 7), at: bkkTime(d.getUTCFullYear(), d.getUTCMonth(), 1) });
  }
  return out;
}

/** Rolling 12 months: the last 12 complete months (the current, unfinished month is reported separately). */
export const rolling12 = (now: number) => last13Months(now).slice(0, 12);

/** First month fully covered by the seeded cases; earlier months come from the stored history. */
export const firstLiveMonth = (seededAt: number) => {
  const start = startOfBkkDay(seededAt) - SEED_DAYS * DAY_MS;
  const p = bkkParts(start);
  return bkkParts(start).d === 1 ? `${p.y}-${String(p.mo + 1).padStart(2, '0')}` : new Date(Date.UTC(p.y, p.mo + 1, 1)).toISOString().slice(0, 7);
};

/**
 * Twelve months of per-partner results for the VP view. Production before the seeded cases is
 * generated around each partner's recent monthly average (with a little seasonality); the loss
 * ratio and renewal results are generated for every month, since the demo has no claims ledger.
 */
export function seedMonthly(cases: Case[], now: number): AgentMonth[] {
  const rnd = mulberry32(31337);
  const months = last13Months(now);
  const live = firstLiveMonth(now);
  const lrBase: Record<string, number> = { a1: 0.52, a2: 0.61, a3: 0.44, a4: 0.71, a5: 0.58, a6: 0.49 };
  const renewBase: Record<string, number> = { a1: 0.78, a2: 0.71, a3: 0.83, a4: 0.64, a5: 0.74, a6: 0.8 };
  const out: AgentMonth[] = [];
  for (const a of AGENTS) {
    const sold = cases.filter((c) => c.agentId === a.id && c.stamps.issued !== undefined && c.stamps.issued >= now - 90 * DAY_MS);
    const avgGwp = Math.max(a.target * 0.5, sold.reduce((s, c) => s + (c.premium ?? 0), 0) / 3);
    const avgPrem = sold.length ? sold.reduce((s, c) => s + (c.premium ?? 0), 0) / sold.length : 12000;
    months.forEach((m, i) => {
      const mo = Number(m.key.slice(5)) - 1;
      // Thai motor sales peak around year end and the April holidays; a gentle upward trend.
      const season = 1 + 0.12 * Math.cos(((mo - 11) / 12) * 2 * Math.PI) + (mo === 3 ? 0.08 : 0);
      const gwp = Math.round(avgGwp * season * (0.82 + i * 0.015 + rnd() * 0.3));
      const policies = Math.max(1, Math.round(gwp / avgPrem));
      const due = Math.max(1, Math.round(policies * (0.7 + rnd() * 0.5)));
      const renewed = Math.min(due, Math.round(due * Math.min(0.97, renewBase[a.id] + (rnd() - 0.5) * 0.18)));
      out.push({
        agentId: a.id,
        month: m.key,
        gwp: m.key >= live ? 0 : gwp,
        policies: m.key >= live ? 0 : policies,
        lossRatio: Math.max(0.15, lrBase[a.id] + (rnd() - 0.5) * 0.24),
        renewDue: due,
        renewed,
        renewGwp: Math.round(renewed * avgPrem * (0.92 + rnd() * 0.12)),
      });
    });
  }
  return out;
}
