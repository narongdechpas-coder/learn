import type { Case, Proposal } from '../types';
import { caseCommission } from '../data/agents';

export interface ProductStat {
  id: string;
  policies: number;
  /** Voluntary premium of issued policies (CMI add-ons not counted). */
  gwp: number;
  partnerPolicies: number;
  commission: number;
  /** Partner quotations that offered it, and how many of those the customer took with this product. */
  offered: number;
  won: number;
}

/** Sales per product from issued cases and partner quotations (since `from`, when given). */
export function productStats(cases: Case[], proposals: Proposal[], from = 0): Map<string, ProductStat> {
  const out = new Map<string, ProductStat>();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = { id, policies: 0, gwp: 0, partnerPolicies: 0, commission: 0, offered: 0, won: 0 }));
    return s;
  };
  for (const c of cases) {
    if (!c.pkg || c.status !== 'ISSUED' || (c.stamps.issued ?? 0) < from) continue;
    const s = get(c.pkg.id);
    s.policies++;
    s.gwp += c.pkg.premium;
    if (c.agentId) {
      s.partnerPolicies++;
      s.commission += caseCommission(c).net;
    }
  }
  for (const p of proposals) {
    if (p.createdAt < from) continue;
    p.options.forEach((o, i) => {
      const s = get(o.pkg.id);
      s.offered++;
      if (p.status === 'accepted' && p.chosen === i) s.won++;
    });
  }
  return out;
}
