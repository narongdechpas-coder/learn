import { useSyncExternalStore } from 'react';
import type { Case, Customer, CoverageType, DocKey, Email, EmailTemplate, Notification, Package, Source, Vehicle } from './types';
import { seedCases } from './lib/seed';
import { SLA_KEYS, slaFor } from './lib/sla';
import { cmiPremium, REQUIRED_DOCS } from './data/packages';
import { CURRENT_YEAR, modelById } from './data/vehicles';
import { bkkParts } from './lib/time';
import { clearFiles, deleteFile, putFile } from './files';

export const STAFF_EMAIL = 'motor-ops@abc.example';

export interface State {
  version: number;
  seededAt: number;
  seq: number;
  cases: Case[];
  emails: Email[];
  notifications: Notification[];
  /** Requests made from this browser, newest first (the customer's "my requests"). */
  mine: string[];
}

const KEY = 'abc-motor-demo-v1';
const VERSION = 1;

function fresh(): State {
  const now = Date.now();
  const { cases, seq } = seedCases(now);
  return { version: VERSION, seededAt: now, seq, cases, emails: [], notifications: [], mine: [] };
}

function load(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s.version === VERSION ? s : null;
  } catch {
    return null;
  }
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

let state: State = load() ?? fresh();
save(state);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel('abc-motor-demo');
  channel.onmessage = () => {
    const s = load();
    if (s) {
      state = s;
      emit();
    }
  };
} catch {
  channel = null;
}
try {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    const s = load();
    if (s) {
      state = s;
      emit();
    }
  });
} catch {
  /* ignore */
}

function commit(next: State) {
  state = next;
  save(state);
  emit();
  try {
    channel?.postMessage('sync');
  } catch {
    /* ignore */
  }
}

export const getState = () => state;
export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

function mail(s: State, template: EmailTemplate, c: Case, params: Record<string, string | number> = {}): Email[] {
  const staff = template.startsWith('staff');
  const e: Email = {
    id: uid(),
    at: Date.now(),
    to: staff ? STAFF_EMAIL : c.customer.email,
    audience: staff ? 'staff' : 'customer',
    template,
    caseId: c.id,
    params: { name: c.customer.firstName, ...params },
  };
  return [e, ...s.emails].slice(0, 300);
}

function notify(s: State, kind: Notification['kind'], caseId: string, params?: Notification['params']): Notification[] {
  return [{ id: uid(), at: Date.now(), caseId, kind, params, read: false }, ...s.notifications].slice(0, 200);
}

/** Apply a change to one case, starting from the latest stored state (another tab may have written). */
function update(id: string, fn: (c: Case, s: State) => Partial<State> | void) {
  const base = load() ?? state;
  const idx = base.cases.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const c: Case = structuredClone(base.cases[idx]);
  const s: State = { ...base };
  const extra = fn(c, s) || {};
  const cases = [...base.cases];
  cases[idx] = c;
  commit({ ...s, ...extra, cases });
}

export const totalPremium = (c: Case) => {
  const base = c.pkg ? c.pkg.premium : c.quotedPremium;
  if (base === undefined) return undefined;
  return Math.round((base + (c.addCmi ? cmiPremium(modelById(c.vehicle.modelId).body) : 0)) * 100) / 100;
};

export const requiredDocs = (c: Case) => REQUIRED_DOCS[c.coverage];
export const docsMissing = (c: Case) => requiredDocs(c).filter((k) => !c.docs[k]);
export const canUpload = (c: Case) =>
  c.source === 'package' ? ['NEW', 'AWAITING_DOCS'].includes(c.status) : c.status === 'AWAITING_DOCS';

export interface SubmitInput {
  source: Source;
  vehicle: Vehicle;
  coverage: CoverageType;
  pkg?: Package;
  addCmi: boolean;
  desiredSI?: number;
  customer: Customer;
}

export function submitCase(input: SubmitInput): string {
  const base = load() ?? state;
  const now = Date.now();
  const seq = base.seq + 1;
  const p = bkkParts(now);
  const id = `ABC-${String(p.y).slice(2)}${String(p.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
  const c: Case = {
    id,
    ...input,
    createdAt: now,
    status: 'NEW',
    stamps: input.source === 'package' ? { submitted: now, quoted: now, confirmed: now } : { submitted: now },
    docs: {},
    log: [{ at: now, by: 'customer', action: input.source === 'package' ? 'submitPackage' : 'submitQuote' }],
  };
  const s: State = { ...base, seq, cases: [c, ...base.cases], mine: [id, ...base.mine] };
  s.emails = mail(s, 'custReceived', c);
  s.emails = mail(s, 'staffNewCase', c, { source: c.source });
  s.notifications = notify(s, 'new', id, { source: c.source });
  commit(s);
  return id;
}

export function acceptCase(id: string, staffId: string) {
  update(id, (c) => {
    if (c.status !== 'NEW') return;
    const now = Date.now();
    c.stamps.accepted = now;
    c.assignee = c.assignee ?? staffId;
    c.log.push({ at: now, by: staffId, action: 'accept' });
    if (c.source === 'quote') c.status = 'ACCEPTED';
    else if (docsMissing(c).length === 0) {
      c.status = 'DOCS_REVIEW';
      c.stamps.docsComplete = c.stamps.docsComplete ?? now;
    } else c.status = 'AWAITING_DOCS';
  });
}

export function assignCase(id: string, staffId: string, by: string) {
  update(id, (c) => {
    c.assignee = staffId;
    c.log.push({ at: Date.now(), by, action: 'assign', text: staffId });
  });
}

export function sendQuote(id: string, premium: number, staffId: string) {
  update(id, (c, s) => {
    if (c.status !== 'ACCEPTED' && c.status !== 'QUOTED') return;
    const now = Date.now();
    c.quotedPremium = premium;
    c.stamps.quoted = c.stamps.quoted ?? now;
    c.status = 'QUOTED';
    c.log.push({ at: now, by: staffId, action: 'quote', text: String(premium) });
    return { emails: mail(s, 'custQuoted', c, { premium: totalPremium(c) ?? premium }) };
  });
}

export function customerConfirm(id: string) {
  update(id, (c, s) => {
    if (c.status !== 'QUOTED') return;
    const now = Date.now();
    c.stamps.confirmed = now;
    c.status = 'AWAITING_DOCS';
    c.log.push({ at: now, by: 'customer', action: 'confirm' });
    s.emails = mail(s, 'staffConfirmed', c);
    return { emails: mail(s, 'custDocsNeeded', c), notifications: notify(s, 'confirmed', id) };
  });
}

export function customerDecline(id: string) {
  update(id, (c, s) => {
    if (c.status !== 'QUOTED') return;
    const now = Date.now();
    c.stamps.cancelled = now;
    c.status = 'CANCELLED';
    c.log.push({ at: now, by: 'customer', action: 'decline' });
    return { notifications: notify(s, 'declined', id) };
  });
}

export async function uploadDoc(id: string, key: DocKey, file: File) {
  await putFile(`${id}:${key}`, file);
  update(id, (c, s) => {
    const now = Date.now();
    c.docs[key] = { name: file.name, size: file.size, at: now };
    c.log.push({ at: now, by: 'customer', action: 'upload', text: key });
    if (docsMissing(c).length === 0 && !c.stamps.docsComplete) {
      c.stamps.docsComplete = now;
      if (c.status === 'AWAITING_DOCS') c.status = 'DOCS_REVIEW';
      s.emails = mail(s, 'staffDocsComplete', c);
      return { notifications: notify(s, 'docs', id) };
    }
  });
}

export function requestReupload(id: string, keys: DocKey[], note: string, staffId: string) {
  keys.forEach((k) => deleteFile(`${id}:${k}`));
  update(id, (c, s) => {
    if (c.status !== 'DOCS_REVIEW') return;
    const now = Date.now();
    for (const k of keys) delete c.docs[k];
    delete c.stamps.docsComplete;
    c.status = 'AWAITING_DOCS';
    c.log.push({ at: now, by: staffId, action: 'reupload', text: note });
    return { emails: mail(s, 'custReupload', c, { docs: keys.join(','), note }) };
  });
}

export function issuePolicy(id: string, staffId: string) {
  update(id, (c, s) => {
    if (c.status !== 'DOCS_REVIEW') return;
    const now = Date.now();
    c.stamps.issued = now;
    c.status = 'ISSUED';
    c.premium = totalPremium(c);
    c.policyNo = `P${CURRENT_YEAR % 100}-${String(100000 + s.seq + Math.floor(Math.random() * 900)).slice(1)}`;
    c.log.push({ at: now, by: staffId, action: 'issue' });
    return { emails: mail(s, 'custIssued', c, { policyNo: c.policyNo, premium: c.premium ?? 0 }) };
  });
}

export function cancelCase(id: string, reason: string, staffId: string) {
  update(id, (c, s) => {
    if (c.status === 'ISSUED' || c.status === 'CANCELLED') return;
    const now = Date.now();
    c.stamps.cancelled = now;
    c.status = 'CANCELLED';
    c.log.push({ at: now, by: staffId, action: 'cancel', text: reason });
    return { emails: mail(s, 'custCancelled', c, { reason }) };
  });
}

export function addNote(id: string, text: string, staffId: string) {
  update(id, (c) => {
    c.log.push({ at: Date.now(), by: staffId, action: 'note', text });
  });
}

export function markNotificationsRead() {
  const base = load() ?? state;
  if (!base.notifications.some((n) => !n.read)) return;
  commit({ ...base, notifications: base.notifications.map((n) => ({ ...n, read: true })) });
}

/** Raise one alert (notification + staff email) the first time an open case breaches an SLA. */
export function checkSlaBreaches() {
  const base = load() ?? state;
  const now = Date.now();
  let s: State | null = null;
  base.cases.forEach((c, i) => {
    if (c.status === 'ISSUED' || c.status === 'CANCELLED') return;
    for (const k of SLA_KEYS) {
      const r = slaFor(c, k, now);
      if (!r || r.state !== 'overdue' || c.slaAlerted?.includes(k)) continue;
      s = s ?? { ...base, cases: [...base.cases] };
      const nc: Case = { ...c, slaAlerted: [...(c.slaAlerted ?? []), k] };
      s.cases[i] = nc;
      s.notifications = notify(s, 'sla', c.id, { sla: k });
      s.emails = mail(s, 'staffSla', nc, { sla: k });
    }
  });
  if (s) commit(s);
}

export async function resetDemo() {
  await clearFiles();
  commit(fresh());
}
