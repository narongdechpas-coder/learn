export type Lang = 'th' | 'en';

export type BodyType = 'sedan' | 'suv' | 'pickup' | 'ev' | 'van';

/** Thai motor insurance vehicle code (รหัสรถ). The catalogue sells 110, 210 and 320; the rest are quote-only. */
export type UsageCode = '110' | '120' | '210' | '220' | '320' | '340';

export type CoverageType = 'T1' | 'T2P' | 'T3P' | 'T2' | 'T3' | 'CMI';

export type Source = 'package' | 'quote' | 'self';

export type Status =
  | 'NEW'
  | 'AWAITING_PAYMENT'
  | 'ACCEPTED'
  | 'QUOTED'
  | 'AWAITING_DOCS'
  | 'DOCS_REVIEW'
  | 'ISSUED'
  | 'CANCELLED';

/** Milestones recorded on a case; the funnel and SLA are computed from these. */
export type Stage = 'submitted' | 'accepted' | 'quoted' | 'confirmed' | 'docsComplete' | 'paid' | 'issued' | 'cancelled';

export type DocKey = 'front' | 'back' | 'left' | 'right' | 'regbook' | 'idcard';

export interface Brand {
  id: string;
  name: string;
}

export interface CarModel {
  id: string;
  brandId: string;
  name: string;
  body: BodyType;
  /** Vehicle codes this model can be registered under. */
  codes: UsageCode[];
  yearFrom: number;
  yearTo: number;
  /** Showroom price of a new car in THB. */
  newPrice: number;
  /** No ready-made package: the customer must request a quote. */
  noPackage?: boolean;
}

export interface Vehicle {
  brandId: string;
  modelId: string;
  year: number;
  sumInsured: number;
  /** The catalogue's suggested value when the customer adjusted it. */
  suggestedSI?: number;
  usage: UsageCode;
  /** A car that is not in the catalogue, typed in by the customer (quote request only). */
  custom?: { brand: string; model: string };
}

export interface Package {
  id: string;
  type: CoverageType;
  repair: 'dealer' | 'garage' | null;
  deductible: number;
  /** Own damage cover (Class 1, 2+, 3+). */
  ownDamage: number;
  /** Fire & theft cover (Class 1, 2+, 2). */
  fireTheft: number;
  flood: boolean;
  tpbiPerson: number;
  tpbiAccident: number;
  tppd: number;
  pa: number;
  medical: number;
  bail: number;
  /** Gross premium incl. tax and stamp duty, THB. */
  premium: number;
}

export interface Customer {
  firstName: string;
  lastName: string;
  idCard: string;
  phone: string;
  email: string;
  address: string;
  plate: string;
  province: string;
  chassis: string;
  startDate: string;
  driver1: string;
  driver2: string;
}

export interface DocMeta {
  name: string;
  size: number;
  at: number;
}

export interface LogEntry {
  at: number;
  by: string; // 'customer' | 'system' | staff id
  action: string;
  text?: string;
}

export interface Case {
  id: string;
  source: Source;
  createdAt: number;
  vehicle: Vehicle;
  coverage: CoverageType;
  pkg?: Package;
  addCmi: boolean;
  desiredSI?: number;
  quotedPremium?: number;
  customer: Customer;
  status: Status;
  assignee?: string;
  stamps: Partial<Record<Stage, number>>;
  docs: Partial<Record<DocKey, DocMeta>>;
  log: LogEntry[];
  policyNo?: string;
  premium?: number;
  slaAlerted?: string[];
  delivery?: Delivery;
  /** Preferred call-back slot for quote requests. */
  callback?: CallbackSlot;
  claims?: Claim[];
  reminders?: { renewal: boolean; tax: boolean };
  payment?: { method: 'qr' | 'card'; at: number; last4?: string; months?: number };
  /** Sold through a sub-agent (ตัวแทนช่วง); absent for direct sales. */
  agentId?: string;
  proposalId?: string;
  /** Discount the agent gave, THB, taken out of the agent's commission. */
  discount?: number;
  /** Who takes the money: the customer pays ABC through the link, or the agent collects and remits. */
  collect?: 'link' | 'agent';
  /** Customer paid (link) or the agent collected the money. */
  paidAt?: number;
  /** Agent handed the collected premium over to ABC. */
  remittedAt?: number;
  seeded?: boolean;
}

export type AgentKind = 'person' | 'company';

/** ABC marketing officer who looks after a group of sub-agents. */
export interface Marketing {
  id: string;
  th: string;
  en: string;
  phone: string;
}

/** Sub-agent (ตัวแทนช่วง): a person or a company selling ABC motor insurance. */
export interface Agent {
  id: string;
  code: string;
  kind: AgentKind;
  th: string;
  en: string;
  /** Contact person for a company. */
  contactTh?: string;
  contactEn?: string;
  license: string;
  province: string;
  phone: string;
  line: string;
  mktId: string;
  /** Monthly premium target, THB. */
  target: number;
  active: boolean;
}

export interface ProposalOption {
  pkg: Package;
  addCmi: boolean;
}

/** A quotation an agent prepares for a customer: 1 to 5 packages, valid for 15 days. */
export interface Proposal {
  id: string;
  agentId: string;
  createdAt: number;
  expiresAt: number;
  vehicle: Vehicle;
  customer: Customer;
  options: ProposalOption[];
  /** Discount as % of net premium; each option is capped at its commission rate. */
  discountPct: number;
  sentVia: ('link' | 'pdf' | 'line')[];
  viewedAt?: number;
  status: 'open' | 'accepted' | 'declined';
  acceptedAt?: number;
  acceptedBy?: 'customer' | 'agent';
  chosen?: number;
  caseId?: string;
  /** Renewal book entry this proposal renews. */
  renewalOf?: string;
  seeded?: boolean;
}

/** A policy coming up for renewal (the in-force book, simplified). */
export interface RenewalItem {
  id: string;
  agentId?: string;
  policyNo: string;
  customerName: string;
  phone: string;
  vehicle: Vehicle;
  coverage: CoverageType;
  premium: number;
  expiry: number;
  status: 'open' | 'quoted' | 'renewed' | 'lost';
  proposalId?: string;
  nudgedAt?: number;
}

export type CallbackSlot = 'none' | 'asap' | 'morning' | 'afternoon' | 'evening';

export interface Claim {
  no: string;
  at: number;
  type: 'collision' | 'solo' | 'theft' | 'flood' | 'other';
  place: string;
  note: string;
}

/** Daily visitor counts for the steps before a request is submitted. */
export interface TrafficDay {
  visit: number;
  car: number;
  pkg: number;
  choose: number;
}

export interface Delivery {
  method: 'paper' | 'pdf';
  address?: string;
  email?: string;
  trackingNo?: string;
}

/** Someone who asked for the price to be sent to them before filling in the full form. */
export interface Lead {
  id: string;
  at: number;
  contact: string;
  channel: 'phone' | 'email';
  vehicle: Vehicle;
  /** Cheapest package shown, for the follow-up call. */
  fromPrice: number;
  popularId?: string;
  contacted?: number;
  caseId?: string;
}

export type EmailTemplate =
  | 'custRenewal'
  | 'custOffer'
  | 'agentNudge'
  | 'agentRemit'
  | 'custClaim'
  | 'custLead'
  | 'custSelfIssued'
  | 'custReceived'
  | 'custQuoted'
  | 'custDocsNeeded'
  | 'custReupload'
  | 'custIssued'
  | 'custCancelled'
  | 'staffNewCase'
  | 'staffConfirmed'
  | 'staffDocsComplete'
  | 'staffSla';

export interface Email {
  id: string;
  at: number;
  to: string;
  audience: 'customer' | 'staff' | 'agent';
  template: EmailTemplate;
  caseId: string;
  params: Record<string, string | number>;
}

export interface Notification {
  id: string;
  at: number;
  caseId: string;
  kind: 'new' | 'confirmed' | 'docs' | 'sla' | 'declined' | 'self' | 'lead' | 'claim' | 'remit';
  params?: Record<string, string | number>;
  read: boolean;
}

export interface Staff {
  id: string;
  th: string;
  en: string;
  /** Used by the seed generator only: how quickly this person usually works. */
  pace: number;
}
