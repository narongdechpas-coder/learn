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
  payment?: { method: 'qr' | 'card'; at: number; last4?: string };
  seeded?: boolean;
}

export interface Delivery {
  method: 'paper' | 'pdf';
  address?: string;
  email?: string;
  trackingNo?: string;
}

export type EmailTemplate =
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
  audience: 'customer' | 'staff';
  template: EmailTemplate;
  caseId: string;
  params: Record<string, string | number>;
}

export interface Notification {
  id: string;
  at: number;
  caseId: string;
  kind: 'new' | 'confirmed' | 'docs' | 'sla' | 'declined' | 'self';
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
