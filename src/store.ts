import { useSyncExternalStore } from 'react';
import type { Agent, AgentMonth, CallbackSlot, Case, Claim, Customer, CoverageType, Delivery, DocKey, Email, EmailTemplate, Lead, Notification, Package, Proposal, ProposalOption, RenewalItem, Source, TrafficDay, Vehicle } from './types';
import { seedAgentWork, seedCases, seedLeads, seedRenewals, seedTraffic } from './lib/seed';
import { AGENTS, PROPOSAL_DAYS, optionPrice } from './data/agents';
import { seedMonthly } from './lib/history';
import { SLA_KEYS, slaFor } from './lib/sla';
import { cmiPremium, REQUIRED_DOCS } from './data/packages';
import { CURRENT_YEAR } from './data/vehicles';
import { bkkParts, dayKey } from './lib/time';
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
  leads: Lead[];
  traffic: Record<string, TrafficDay>;
  agents: Agent[];
  proposals: Proposal[];
  renewals: RenewalItem[];
  monthly: AgentMonth[];
}

const KEY = 'abc-motor-demo-v1';
const VERSION = 7;

function fresh(): State {
  const now = Date.now();
  const { cases, seq } = seedCases(now);
  const proposals = seedAgentWork(cases, now);
  return {
    version: VERSION,
    seededAt: now,
    seq,
    cases,
    emails: [],
    notifications: [],
    mine: [],
    leads: seedLeads(cases, now),
    traffic: seedTraffic(cases, now),
    agents: AGENTS.map((a) => ({ ...a })),
    proposals,
    renewals: seedRenewals(now),
    monthly: seedMonthly(cases, now),
  };
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

function mail(s: State, template: EmailTemplate, c: Pick<Case, 'id' | 'customer'>, params: Record<string, string | number> = {}, agentTo?: string): Email[] {
  const staff = template.startsWith('staff');
  const e: Email = {
    id: uid(),
    at: Date.now(),
    to: agentTo ?? (staff ? STAFF_EMAIL : c.customer.email),
    audience: agentTo ? 'agent' : staff ? 'staff' : 'customer',
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
  return Math.round((base + (c.addCmi ? (cmiPremium(c.vehicle.usage) ?? 0) : 0) - (c.discount ?? 0)) * 100) / 100;
};

export const requiredDocs = (c: Case) => REQUIRED_DOCS[c.coverage];
export const docsMissing = (c: Case) => requiredDocs(c).filter((k) => !c.docs[k]);
export const canUpload = (c: Case) =>
  c.source === 'self'
    ? c.status === 'AWAITING_PAYMENT'
    : c.source === 'package'
      ? ['NEW', 'AWAITING_DOCS'].includes(c.status)
      : c.status === 'AWAITING_DOCS';

export interface SubmitInput {
  source: Source;
  vehicle: Vehicle;
  coverage: CoverageType;
  pkg?: Package;
  addCmi: boolean;
  desiredSI?: number;
  customer: Customer;
  callback?: CallbackSlot;
  agentId?: string;
  discount?: number;
  collect?: Case['collect'];
  proposalId?: string;
}

export function submitCase(input: SubmitInput, mine = true): string {
  const base = load() ?? state;
  const now = Date.now();
  const seq = base.seq + 1;
  const p = bkkParts(now);
  const id = `ABC-${String(p.y).slice(2)}${String(p.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
  const self = input.source === 'self';
  const c: Case = {
    id,
    ...input,
    createdAt: now,
    status: self ? 'AWAITING_PAYMENT' : 'NEW',
    stamps:
      input.source === 'quote'
        ? { submitted: now }
        : { submitted: now, quoted: now, confirmed: now, ...(self ? { accepted: now } : {}) },
    docs: {},
    log: [{ at: now, by: input.agentId ?? 'customer', action: self ? 'selfStart' : input.source === 'package' ? 'submitPackage' : 'submitQuote' }],
  };
  const s: State = { ...base, seq, cases: [c, ...base.cases], mine: mine ? [id, ...base.mine] : base.mine };
  // A lead that comes back and submits counts as converted.
  const phone = input.customer.phone.replace(/\D/g, '');
  const email = input.customer.email.trim().toLowerCase();
  const lead = base.leads.find((l) => !l.caseId && now - l.at < 30 * 86400000 && (l.contact.replace(/\D/g, '') === phone || l.contact.toLowerCase() === email));
  if (lead) s.leads = base.leads.map((l) => (l === lead ? { ...l, caseId: id } : l));
  if (self) {
    // Nobody needs to act yet; the back office hears about it once it is paid.
    commit(s);
    return id;
  }
  s.emails = mail(s, 'custReceived', c);
  s.emails = mail(s, 'staffNewCase', c, { source: c.source });
  s.notifications = notify(s, 'new', id, { source: c.source, ...(c.agentId ? { agent: c.agentId } : {}) });
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

export function customerConfirm(id: string, by = 'customer', collect?: Case['collect']) {
  update(id, (c, s) => {
    if (c.status !== 'QUOTED') return;
    const now = Date.now();
    c.stamps.confirmed = now;
    c.status = 'AWAITING_DOCS';
    if (collect) c.collect = collect;
    c.log.push({ at: now, by, action: 'confirm' });
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

export async function uploadDoc(id: string, key: DocKey, file: File, by = 'customer') {
  await putFile(`${id}:${key}`, file);
  update(id, (c, s) => {
    const now = Date.now();
    c.docs[key] = { name: file.name, size: file.size, at: now };
    c.log.push({ at: now, by, action: 'upload', text: key });
    if (docsMissing(c).length === 0 && !c.stamps.docsComplete) {
      c.stamps.docsComplete = now;
      if (c.source === 'self') return;
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

/** Self service: simulated payment, then the policy is issued straight away. */
export function payAndIssue(id: string, delivery: Delivery, payment: { method: 'qr' | 'card'; last4?: string; months?: number }) {
  update(id, (c, s) => {
    if (c.status !== 'AWAITING_PAYMENT' || docsMissing(c).length) return;
    const now = Date.now();
    c.stamps.paid = now;
    c.stamps.issued = now;
    c.status = 'ISSUED';
    c.payment = { ...payment, at: now };
    c.delivery = delivery.method === 'paper' ? { ...delivery, trackingNo: `EB${String(Math.floor(1e8 + Math.random() * 9e8))}TH` } : delivery;
    c.premium = totalPremium(c);
    c.policyNo = `P${CURRENT_YEAR % 100}-${String(100000 + s.seq + Math.floor(Math.random() * 900)).slice(1)}`;
    c.log.push({ at: now, by: 'customer', action: 'paid', text: payment.method });
    s.emails = mail(s, 'custSelfIssued', c, {
      policyNo: c.policyNo,
      premium: c.premium ?? 0,
      deliveryMethod: c.delivery.method,
      trackingNo: c.delivery.trackingNo ?? '',
      sendTo: c.delivery.email ?? '',
    });
    return { notifications: notify(s, 'self', id, { type: c.coverage }) };
  });
}

/** Count a visitor reaching a step before submitting (once per browser tab session). */
const counted = new Set<string>();
export function trackStep(step: keyof TrafficDay) {
  const day = dayKey(Date.now());
  const flag = `abc-step-${day}-${step}`;
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
  } catch {
    if (counted.has(flag)) return;
  }
  counted.add(flag);
  const base = load() ?? state;
  const cur = base.traffic[day] ?? { visit: 0, car: 0, pkg: 0, choose: 0 };
  commit({ ...base, traffic: { ...base.traffic, [day]: { ...cur, [step]: cur[step] + 1 } } });
}

export function fileClaim(id: string, claim: Omit<Claim, 'no' | 'at'>): string {
  const no = `CL-${String(Math.floor(100000 + Math.random() * 900000))}`;
  update(id, (c, s) => {
    const now = Date.now();
    c.claims = [{ ...claim, no, at: now }, ...(c.claims ?? [])];
    c.log.push({ at: now, by: 'customer', action: 'claim', text: no });
    s.emails = mail(s, 'custClaim', c, { claimNo: no });
    return { notifications: notify(s, 'claim', id, { claimNo: no }) };
  });
  return no;
}

export function setReminders(id: string, reminders: { renewal: boolean; tax: boolean }) {
  update(id, (c) => {
    c.reminders = reminders;
  });
}

/** Sends the renewal reminder now (the real one goes out 60/30/7 days before expiry). */
export function sendRenewalPreview(id: string, nextPrice: number, expiry: string) {
  update(id, (c, s) => ({ emails: mail(s, 'custRenewal', c, { price: nextPrice, expiry, policyNo: c.policyNo ?? '' }) }));
}

export interface LeadInput {
  contact: string;
  channel: Lead['channel'];
  vehicle: Vehicle;
  fromPrice: number;
  popularId?: string;
}

/** "Send me this price": keep the contact so the team can follow up before the customer drops off. */
export function captureLead(input: LeadInput): string {
  const base = load() ?? state;
  const now = Date.now();
  const lead: Lead = { id: `L-${uid().toUpperCase()}`, at: now, ...input };
  const email: Email = {
    id: uid(),
    at: now,
    to: input.contact,
    audience: 'customer',
    template: 'custLead',
    caseId: lead.id,
    params: { price: input.fromPrice, channel: input.channel },
  };
  commit({
    ...base,
    leads: [lead, ...base.leads],
    emails: [email, ...base.emails].slice(0, 300),
    notifications: notify(base, 'lead', lead.id, { contact: input.contact }),
  });
  return lead.id;
}

export function markLeadContacted(id: string) {
  const base = load() ?? state;
  commit({ ...base, leads: base.leads.map((l) => (l.id === id ? { ...l, contacted: Date.now() } : l)) });
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

// ---- Business Partner channel ----

const nextProposalId = (base: State) => {
  const p = bkkParts(Date.now());
  const n = base.proposals.filter((x) => !x.seeded).length + 1;
  return `Q-${String(p.y).slice(2)}${String(p.mo + 1).padStart(2, '0')}-${String(n).padStart(3, '0')}${uid().slice(0, 2).toUpperCase()}`;
};

export interface ProposalInput {
  agentId: string;
  vehicle: Vehicle;
  customer: Customer;
  options: ProposalOption[];
  discountPct: number;
  renewalOf?: string;
}

/** An agent's quotation (1-5 packages) for a customer. */
export function createProposal(input: ProposalInput): string {
  const base = load() ?? state;
  const now = Date.now();
  const id = nextProposalId(base);
  const pr: Proposal = { id, ...input, createdAt: now, expiresAt: now + PROPOSAL_DAYS * 86_400_000, sentVia: [], status: 'open' };
  const renewals = input.renewalOf ? base.renewals.map((r) => (r.id === input.renewalOf && r.status === 'open' ? { ...r, status: 'quoted' as const, proposalId: id } : r)) : base.renewals;
  commit({ ...base, proposals: [pr, ...base.proposals], renewals });
  return id;
}

const updateProposal = (id: string, fn: (p: Proposal) => Proposal) => {
  const base = load() ?? state;
  commit({ ...base, proposals: base.proposals.map((p) => (p.id === id ? fn(p) : p)) });
};

/** Agent shared the quotation: link, PDF or LINE. The link also goes to the customer by email. */
export function markProposalSent(id: string, via: Proposal['sentVia'][number]) {
  const base = load() ?? state;
  const pr = base.proposals.find((p) => p.id === id);
  if (!pr) return;
  const proposals = base.proposals.map((p) => (p.id === id && !p.sentVia.includes(via) ? { ...p, sentVia: [...p.sentVia, via] } : p));
  const emails = via === 'link' && !pr.sentVia.includes('link')
    ? mail(base, 'custOffer', { id, customer: pr.customer }, { n: pr.options.length, expiry: pr.expiresAt, agent: pr.agentId })
    : base.emails;
  commit({ ...base, proposals, emails });
}

/** The customer opened the link (the agent's own preview does not count). */
export function viewProposal(id: string) {
  const base = load() ?? state;
  if (base.proposals.find((p) => p.id === id)?.viewedAt) return;
  updateProposal(id, (p) => ({ ...p, viewedAt: Date.now() }));
}

export function declineProposal(id: string) {
  updateProposal(id, (p) => (p.status === 'open' ? { ...p, status: 'declined' } : p));
}

/**
 * Customer (from the link) or agent (in front of the customer, with consent) picks one option.
 * The sale then runs through the back office like any package sale.
 */
export function acceptProposal(id: string, choice: number, by: 'customer' | 'agent', collect: 'link' | 'agent'): string | null {
  const base = load() ?? state;
  const pr = base.proposals.find((p) => p.id === id);
  if (!pr || pr.status !== 'open' || Date.now() > pr.expiresAt) return null;
  const o = pr.options[choice];
  const price = optionPrice(o, pr.discountPct, pr.vehicle.usage);
  const caseId = submitCase(
    {
      source: 'package',
      vehicle: pr.vehicle,
      coverage: o.pkg.type,
      pkg: o.pkg,
      addCmi: o.addCmi && o.pkg.type !== 'CMI',
      customer: pr.customer,
      agentId: pr.agentId,
      discount: price.discount || undefined,
      collect,
      proposalId: id,
    },
    by === 'customer',
  );
  const after = load() ?? state;
  const now = Date.now();
  commit({
    ...after,
    proposals: after.proposals.map((p) => (p.id === id ? { ...p, status: 'accepted', acceptedAt: now, acceptedBy: by, chosen: choice, caseId } : p)),
    renewals: pr.renewalOf ? after.renewals.map((r) => (r.id === pr.renewalOf ? { ...r, status: 'renewed', renewedPremium: price.price, renewedAt: now } : r)) : after.renewals,
  });
  return caseId;
}

/** Customer pays ABC through the quotation link (simulated). */
export function payByLink(id: string, method: 'qr' | 'card', last4?: string, months?: number) {
  update(id, (c) => {
    if (c.paidAt) return;
    const now = Date.now();
    c.paidAt = now;
    c.payment = { method, at: now, last4, months };
    c.log.push({ at: now, by: 'customer', action: 'paid', text: method });
  });
}

/** Agent took the customer's money; it still has to be remitted to ABC. */
export function agentCollected(id: string) {
  update(id, (c) => {
    if (c.paidAt) return;
    const now = Date.now();
    c.paidAt = now;
    c.log.push({ at: now, by: c.agentId ?? 'agent', action: 'collected' });
  });
}

/** Back office received the agent's remittance. */
export function recordRemit(id: string, staffId: string) {
  update(id, (c) => {
    if (c.remittedAt) return;
    const now = Date.now();
    c.remittedAt = now;
    c.paidAt = c.paidAt ?? now;
    c.log.push({ at: now, by: staffId, action: 'remitted' });
  });
}

/** Agent tells the back office the money has been transferred. */
export function agentRemitNotice(id: string) {
  update(id, (c, s) => {
    const now = Date.now();
    c.log.push({ at: now, by: c.agentId ?? 'agent', action: 'remitNotice' });
    return { notifications: notify(s, 'remit', id, { agent: c.agentId ?? '' }) };
  });
}

/** Marketing reminds an agent about a renewal due or a late remittance. */
export function nudgeAgent(kind: 'renewal' | 'remit', refId: string, mktId: string) {
  const base = load() ?? state;
  const now = Date.now();
  if (kind === 'renewal') {
    const r = base.renewals.find((x) => x.id === refId);
    const ag = base.agents.find((a) => a.id === r?.agentId);
    if (!r || !ag) return;
    commit({
      ...base,
      renewals: base.renewals.map((x) => (x.id === refId ? { ...x, nudgedAt: now } : x)),
      emails: mail(base, 'agentNudge', { id: r.policyNo, customer: { firstName: ag.th } as Customer }, { policyNo: r.policyNo, customer: r.customerName, expiry: r.expiry, mkt: mktId }, `${ag.code.toLowerCase()}@agents.abc.example`),
    });
    return;
  }
  const c = base.cases.find((x) => x.id === refId);
  const ag = base.agents.find((a) => a.id === c?.agentId);
  if (!c || !ag) return;
  const cases = base.cases.map((x) => (x.id === refId ? { ...x, log: [...x.log, { at: now, by: mktId, action: 'nudge' }] } : x));
  commit({
    ...base,
    cases,
    emails: mail(base, 'agentRemit', { id: c.id, customer: { firstName: ag.th } as Customer }, { customer: `${c.customer.firstName} ${c.customer.lastName}`, premium: totalPremium(c) ?? 0, mkt: mktId }, `${ag.code.toLowerCase()}@agents.abc.example`),
  });
}

export function updateAgent(id: string, patch: Partial<Pick<Agent, 'target' | 'active' | 'mktId'>>) {
  const base = load() ?? state;
  commit({ ...base, agents: base.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
}

export async function resetDemo() {
  await clearFiles();
  commit(fresh());
}
