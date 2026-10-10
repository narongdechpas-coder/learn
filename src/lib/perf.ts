import type { Agent, AgentMonth, Case } from '../types';
import { firstLiveMonth } from './history';
import { bkkParts, monthKey } from './time';

/** One partner's results for one month (or a sum of months). */
export interface PerfRow {
  target: number;
  gwp: number;
  policies: number;
  renewDue: number;
  renewed: number;
  renewGwp: number;
  claims: number;
}
export const zeroRow = (): PerfRow => ({ target: 0, gwp: 0, policies: 0, renewDue: 0, renewed: 0, renewGwp: 0, claims: 0 });
export const addRow = (a: PerfRow, b: PerfRow): PerfRow => ({
  target: a.target + b.target,
  gwp: a.gwp + b.gwp,
  policies: a.policies + b.policies,
  renewDue: a.renewDue + b.renewDue,
  renewed: a.renewed + b.renewed,
  renewGwp: a.renewGwp + b.renewGwp,
  claims: a.claims + b.claims,
});
export const ach = (r: PerfRow) => (r.target ? r.gwp / r.target : 0);
export const renewRate = (r: PerfRow) => (r.renewDue ? r.renewed / r.renewDue : 0);
export const lossRatio = (r: PerfRow) => (r.gwp ? r.claims / r.gwp : 0);

/** Share of the current month gone by, so a half-finished month is compared with the target to date. */
export function monthShare(now: number) {
  const p = bkkParts(now);
  return p.d / new Date(Date.UTC(p.y, p.mo + 1, 0)).getUTCDate();
}

/**
 * Per-partner, per-month results: production from the cases once they exist, else the stored history.
 * Returns a lookup `(agentId, 'YYYY-MM') => PerfRow`.
 */
export function perfCells(s: { cases: Case[]; monthly: AgentMonth[]; agents: Agent[]; seededAt: number }, now: number) {
  const live = firstLiveMonth(s.seededAt);
  const thisMonth = monthKey(now);
  const share = monthShare(now);
  const byKey = new Map<string, PerfRow>();
  const issued = new Map<string, Case[]>();
  for (const c of s.cases) {
    if (!c.agentId || c.stamps.issued === undefined) continue;
    const k = `${c.agentId}|${monthKey(c.stamps.issued)}`;
    issued.set(k, [...(issued.get(k) ?? []), c]);
  }
  for (const m of s.monthly) {
    const a = s.agents.find((x) => x.id === m.agentId);
    if (!a) continue;
    const k = `${m.agentId}|${m.month}`;
    const cs = m.month >= live ? (issued.get(k) ?? []) : [];
    const gwp = m.month >= live ? cs.reduce((x, c) => x + (c.premium ?? 0), 0) : m.gwp;
    byKey.set(k, {
      target: m.month === thisMonth ? Math.round(a.target * share) : a.target,
      gwp,
      policies: m.month >= live ? cs.length : m.policies,
      renewDue: m.renewDue,
      renewed: m.renewed,
      renewGwp: m.renewGwp,
      claims: gwp * m.lossRatio,
    });
  }
  return (agentId: string, month: string) => byKey.get(`${agentId}|${month}`) ?? zeroRow();
}
