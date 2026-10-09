import type { Case } from '../types';
import { BIZ_DAY_MIN, bizMinutes } from './time';

export type SlaKey = 'accept' | 'quote' | 'issue';

export const SLA_TARGETS: Record<SlaKey, number> = {
  accept: 15,
  quote: 120,
  issue: BIZ_DAY_MIN,
};

export const SLA_KEYS: SlaKey[] = ['accept', 'quote', 'issue'];

export type SlaState = 'met' | 'breached' | 'running' | 'atRisk' | 'overdue';

export interface SlaResult {
  key: SlaKey;
  state: SlaState;
  /** Business minutes used so far (or in total when finished). */
  used: number;
  target: number;
  done: boolean;
}

/**
 * accept: submitted → accepted (every case)
 * quote:  submitted → quote sent (quote requests only)
 * issue:  documents complete → policy issued
 * Returns null when the SLA does not apply to the case (yet).
 */
export function slaFor(c: Case, key: SlaKey, now: number): SlaResult | null {
  // Self-service purchases never wait on an agent.
  if (c.source === 'self' || c.renewalOf) return null;
  const s = c.stamps;
  let start: number | undefined;
  let end: number | undefined;
  if (key === 'accept') {
    start = s.submitted;
    end = s.accepted;
  } else if (key === 'quote') {
    if (c.source !== 'quote') return null;
    start = s.submitted;
    end = s.quoted;
  } else {
    start = s.docsComplete;
    end = s.issued;
    // Documents finished before the case was accepted: the clock starts at acceptance.
    if (start && s.accepted && s.accepted > start) start = s.accepted;
    if (start && !s.accepted) return null;
  }
  if (!start) return null;
  const target = SLA_TARGETS[key];
  if (end === undefined && c.status === 'CANCELLED') return null;
  const used = bizMinutes(start, end ?? now);
  if (end !== undefined) return { key, state: used <= target ? 'met' : 'breached', used, target, done: true };
  const state: SlaState = used > target ? 'overdue' : used >= target * 0.8 ? 'atRisk' : 'running';
  return { key, state, used, target, done: false };
}

/** The SLA that currently governs an open case, if any. */
export function activeSla(c: Case, now: number): SlaResult | null {
  for (const k of SLA_KEYS) {
    const r = slaFor(c, k, now);
    if (r && !r.done) return r;
  }
  return null;
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  const idx = Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1);
  return v[Math.max(0, idx)];
}
