export type Lang = 'th' | 'en';

export type BodyType = 'sedan' | 'suv' | 'pickup' | 'ev' | 'van';

/** Thai motor insurance vehicle code (รหัสรถ). The catalogue sells 110, 210 and 320; the rest are quote-only. */
export type UsageCode = '110' | '120' | '210' | '220' | '320' | '340';

/** Motor classes, plus TRV for travel and PA for personal accident (their packages carry their own cover). */
export type CoverageType = 'T1' | 'T2P' | 'T3P' | 'T2' | 'T3' | 'CMI' | 'TRV' | 'PA';

/** Lines of business on the customer home page; fire is not on sale yet. */
export type Line = 'motor' | 'travel' | 'pa' | 'fire';

/** Single trip (1-180 days) or annual multi-trip (any number of trips, up to 90 days each). */
export type TripType = 'single' | 'annual';

/** A trip being insured: cover runs from start to end (annual: one year from start). */
export interface Trip {
  type: TripType;
  zoneId: string;
  zoneTh: string;
  zoneEn: string;
  /** Main destination, free text (shown on the certificate). */
  dest: string;
  /** YYYY-MM-DD. */
  start: string;
  end: string;
  days: number;
}

/** Benefits of a travel plan, THB (0 = not covered). */
export interface TravelCover {
  /** Medical expenses abroad (incl. hospital) per trip; Schengen visas need at least 30,000 EUR. */
  medical: number;
  /** Accidental death or permanent disability. */
  death: number;
  /** Emergency evacuation and repatriation. */
  evacuation: number;
  tripCancel: number;
  /** Baggage loss or damage, and personal effects. */
  baggage: number;
  baggageDelay: number;
  flightDelay: number;
  /** Liability to third parties. */
  liability: number;
}

/** A travel plan's price and cover for one trip, kept on the package (and so on the case). */
export interface TravelOffer {
  productId: string;
  trip: Trip;
  cover: TravelCover;
  schengen: boolean;
}

/** Travel destination zone, set up by the back office. */
export interface TravelZone {
  id: string;
  nameTh: string;
  nameEn: string;
  /** Countries in the zone, shown to the customer. */
  noteTh: string;
  noteEn: string;
  /** Plans for this zone can carry a Schengen visa letter. */
  schengen: boolean;
}

/** One trip-length band of a travel rate table: gross premium by zone id. */
export interface TravelRateRow {
  dayFrom: number;
  dayTo: number;
  prices: Record<string, number>;
}

/** A travel plan the back office sets up (like a motor product, with zone × days rates). */
export interface TravelProduct {
  id: string;
  ver: number;
  updatedAt: number;
  updatedBy: string;
  nameTh: string;
  nameEn: string;
  tagTh: string;
  tagEn: string;
  highlightsTh: string[];
  highlightsEn: string[];
  badge?: 'recommended' | 'new';
  channels: { self: boolean; partner: boolean };
  partners: 'all' | string[];
  saleUntil?: string;
  cover: TravelCover;
  /** Single-trip rates by trip length; annual rates by zone (absent zone = not sold annually). */
  single: TravelRateRow[];
  annual: Record<string, number>;
  /** Oldest traveller accepted; travellers above loadAge pay loadPct more. */
  maxAge: number;
  loadAge: number;
  loadPct: number;
  commission?: number;
  partnerCommission: Record<string, number>;
  termsTh: string;
  termsEn: string;
  exclusionsTh: string[];
  exclusionsEn: string[];
  archived?: boolean;
}

export interface TravelProductVersion {
  id: string;
  ver: number;
  at: number;
  by: string;
  note: string;
  changes: string[];
  snapshot: TravelProduct;
}

/** Personal accident occupation class: 1 office, 2 outdoor or driving, 3 manual work (4 = refused). */
export type OccClass = 1 | 2 | 3;

/** Benefits of a personal accident plan, THB (0 = not covered). */
export interface PaCover {
  /** Accidental death, loss of limbs or sight, permanent total disability (อ.บ.1). */
  death: number;
  /** Medical expenses per accident. */
  medical: number;
  /** Hospital cash per day as an in-patient. */
  hospitalDaily: number;
  funeral: number;
}

/** A PA plan priced for one person, kept on the package (and so on the case). */
export interface PaOffer {
  productId: string;
  occClass: OccClass;
  /** Occupation id from the occupation list. */
  occupation: string;
  /** "Other" occupation, as the customer described it (always reviewed before issue). */
  occupationText?: string;
  /** Riding or riding pillion on a motorcycle covered (extra premium). */
  motorcycle: boolean;
  cover: PaCover;
  /** Answers to the health questions ("yes" = true). */
  health: boolean[];
  /** Back office has to review before the policy is issued (a "yes" answer or class 3). */
  referral: boolean;
  /** YYYY-MM-DD; one-year cover. */
  start: string;
  end: string;
}

/** A PA plan the back office sets up: one sum insured, a price per occupation class. */
export interface PaProduct {
  id: string;
  ver: number;
  updatedAt: number;
  updatedBy: string;
  nameTh: string;
  nameEn: string;
  tagTh: string;
  tagEn: string;
  highlightsTh: string[];
  highlightsEn: string[];
  badge?: 'recommended' | 'new';
  channels: { self: boolean; partner: boolean };
  partners: 'all' | string[];
  saleUntil?: string;
  cover: PaCover;
  /** Yearly premium by occupation class. */
  prices: Record<OccClass, number>;
  /** Motorcycle add-on, % on top of the premium (0 = not offered). */
  motorcyclePct: number;
  /** Entry age range, and the oldest age a policy can be renewed to. */
  minAge: number;
  maxAge: number;
  renewAge: number;
  commission?: number;
  partnerCommission: Record<string, number>;
  termsTh: string;
  termsEn: string;
  exclusionsTh: string[];
  exclusionsEn: string[];
  archived?: boolean;
}

export interface PaProductVersion {
  id: string;
  ver: number;
  at: number;
  by: string;
  note: string;
  changes: string[];
  snapshot: PaProduct;
}

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
  /** Riders (เอกสารแนบท้าย). R.Y.01 personal accident, death or permanent disability: driver, and each passenger. */
  pa: number;
  paPassenger: number;
  /** R.Y.01 temporary disability per week (0 = not covered): driver, and each passenger. */
  tempDriver: number;
  tempPassenger: number;
  /** R.Y.02 medical expenses per person (driver and passengers); R.Y.03 bail bond per accident. */
  medical: number;
  bail: number;
  /** Passengers covered by the riders (seats less the driver). */
  passengers: number;
  /** Gross premium incl. tax and stamp duty, THB. */
  premium: number;
  /** Snapshot of the product it came from, so later edits never change a price already offered. */
  nameTh?: string;
  nameEn?: string;
  ver?: number;
  extras?: ProductExtra[];
  docs?: DocKey[];
  badge?: Product['badge'];
  /** Commission as a share of net premium for whoever sells it (standard, product or partner rate). */
  comRate?: number;
  /** CMI price for this car when the package was offered (used when CMI is added). */
  cmi?: number;
  /** Travel packages only (type TRV): the trip and the plan's cover. */
  travel?: TravelOffer;
  /** Personal accident packages only (type PA): occupation, add-ons and the plan's cover. */
  accident?: PaOffer;
}

/** Extra benefits a product includes in its premium. */
export type ProductExtra = 'flood' | 'roadside' | 'towing' | 'courtesyCar' | 'evBattery' | 'glass';

/** How a sum is worked out: the car's sum insured, a fixed amount, or a share of it (capped). */
export interface CoverRule {
  mode: 'none' | 'si' | 'fixed' | 'pct';
  value: number;
  cap?: number;
}

/** One sum-insured band of a rate table: gross premium by vehicle code. */
export interface RateRow {
  siFrom: number;
  siTo: number;
  prices: Partial<Record<UsageCode, number>>;
}

/** A product (package) the back office sets up; the customer and partner screens are built from these. */
export interface Product {
  id: string;
  type: CoverageType;
  ver: number;
  updatedAt: number;
  updatedBy: string;
  nameTh: string;
  nameEn: string;
  tagTh: string;
  tagEn: string;
  highlightsTh: string[];
  highlightsEn: string[];
  badge?: 'recommended' | 'new';
  /** Where it is on sale: the customer website and/or Business Partners. */
  channels: { self: boolean; partner: boolean };
  /** Partners who may sell it. */
  partners: 'all' | string[];
  /** Last day on sale (YYYY-MM-DD); hidden from customers and partners afterwards. */
  saleUntil?: string;
  repair: 'dealer' | 'garage' | null;
  deductible: number;
  ownDamage: CoverRule;
  fireTheft: CoverRule;
  tpbiPerson: number;
  tpbiAccident: number;
  tppd: number;
  /** Riders (เอกสารแนบท้าย). R.Y.01 personal accident, death or permanent disability: driver, and each passenger. */
  pa: number;
  paPassenger: number;
  /** R.Y.01 temporary disability per week (0 = not covered): driver, and each passenger. */
  tempDriver: number;
  tempPassenger: number;
  /** R.Y.02 medical expenses per person (driver and passengers); R.Y.03 bail bond per accident. */
  medical: number;
  bail: number;
  /** Passengers covered; absent = by vehicle code (110: 6, 210: 11, 320: 2). */
  passengers?: number;
  extras: ProductExtra[];
  /** Underwriting: oldest car accepted (years), vehicle codes, electric cars, models refused. */
  maxAge?: number;
  codes: 'all' | UsageCode[];
  ev: 'allow' | 'deny' | 'only';
  evLoading: number;
  excludeModels: string[];
  rates: RateRow[];
  docs: DocKey[];
  /** Product commission in % of net premium; absent = the standard rate for its class. */
  commission?: number;
  /** Per-partner commission in %, which wins over the product rate. */
  partnerCommission: Record<string, number>;
  termsTh: string;
  termsEn: string;
  exclusionsTh: string[];
  exclusionsEn: string[];
  /** Policy wording PDF uploaded by the back office (file kept in IndexedDB). */
  pdf?: { name: string; key: string };
  archived?: boolean;
}

/** One saved version of a product, kept for the change history and rollback. */
export interface ProductVersion {
  id: string;
  ver: number;
  at: number;
  by: string;
  note: string;
  changes: string[];
  snapshot: Product;
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
  /** Travel and PA: passport number (travel), date of birth (YYYY-MM-DD) and beneficiary. */
  passport?: string;
  birthDate?: string;
  beneficiary?: string;
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
  /** Motor cases only; travel cases carry their trip on the package. */
  vehicle?: Vehicle;
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
  /** Sold through a Business Partner (Business Partner); absent for direct sales. */
  agentId?: string;
  proposalId?: string;
  /** Renewal of a policy ABC already holds: no documents, payment issues the new policy. */
  renewalOf?: string;
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

/** ABC marketing officer who looks after a group of Business Partners. */
export interface Marketing {
  id: string;
  th: string;
  en: string;
  phone: string;
}

/** Business Partner (Business Partner): a person or a company selling ABC motor insurance. */
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
  /** Motor quotations only; travel quotations carry the trip on each option. */
  vehicle?: Vehicle;
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

/** One partner's month: production (history only), loss ratio and renewal results. */
export interface AgentMonth {
  agentId: string;
  month: string;
  /** GWP and policies for months before the seeded cases; later months are counted from the cases. */
  gwp: number;
  policies: number;
  /** Claims incurred ÷ earned premium. */
  lossRatio: number;
  renewDue: number;
  renewed: number;
  renewGwp: number;
}

/** A policy coming up for renewal (the in-force book, simplified). */
export interface RenewalItem {
  id: string;
  agentId?: string;
  policyNo: string;
  customerName: string;
  phone: string;
  /** Motor renewals; PA renewals carry the insured person instead. */
  vehicle?: Vehicle;
  pa?: { productId: string; occupation: string; occupationText?: string; motorcycle: boolean; birthDate: string; idCard: string; email: string };
  coverage: CoverageType;
  premium: number;
  expiry: number;
  status: 'open' | 'quoted' | 'renewed' | 'lost';
  /** Premium of the renewed policy, once renewed. */
  renewedPremium?: number;
  renewedAt?: number;
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
  kind: 'new' | 'confirmed' | 'docs' | 'sla' | 'declined' | 'self' | 'lead' | 'claim' | 'remit' | 'renewed';
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

/** A marketing officer's visit to a Business Partner, recorded after the meeting. */
export interface Visit {
  id: string;
  agentId: string;
  mktId: string;
  /** Visit date (Bangkok noon of that day). */
  at: number;
  /** Points prepared for the meeting (printed on the report). */
  topics: string[];
  outcome: string;
  /** Next appointment, if one was made. */
  nextAt?: number;
  recordedAt: number;
}
