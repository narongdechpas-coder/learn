import type { Agent, Case, CoverageType, Marketing, ProposalOption, UsageCode } from '../types';
import { cmiPremium } from './packages';

export const MARKETING: Marketing[] = [
  { id: 'm1', th: 'ศุภชัย มั่นคง', en: 'Supachai Mankong', phone: '081-555-0101' },
  { id: 'm2', th: 'นันทนา ใจงาม', en: 'Nantana Jaingam', phone: '081-555-0102' },
  { id: 'm3', th: 'ปวีณา รุ่งโรจน์', en: 'Paweena Rungroj', phone: '081-555-0103' },
];

/** Sample Business Partners: four people and two companies, two per marketing officer. */
export const AGENTS: Agent[] = [
  { id: 'a1', code: 'AG-1001', kind: 'person', th: 'สมศักดิ์ ประกันดี', en: 'Somsak Prakandee', license: '6104012345', province: 'กรุงเทพมหานคร', phone: '089-111-2201', line: '@somsak.ins', mktId: 'm1', target: 90_000, active: true },
  { id: 'a2', code: 'AG-2001', kind: 'company', th: 'บริษัท รุ่งเรือง โบรกเกอร์ จำกัด', en: 'Rungruang Broker Co., Ltd.', contactTh: 'คุณอารีรัตน์ วงศ์ดี', contactEn: 'Areerat Wongdee', license: 'ว00123/2565', province: 'ชลบุรี', phone: '038-222-300', line: '@rungruang', mktId: 'm1', target: 160_000, active: true },
  { id: 'a3', code: 'AG-1002', kind: 'person', th: 'วันเพ็ญ ศรีสวัสดิ์', en: 'Wanpen Srisawat', license: '6204056789', province: 'เชียงใหม่', phone: '089-111-2202', line: '@wanpen', mktId: 'm2', target: 25_000, active: true },
  { id: 'a4', code: 'AG-1003', kind: 'person', th: 'อดิศร ทองมา', en: 'Adisorn Thongma', license: '6304098765', province: 'ขอนแก่น', phone: '089-111-2203', line: '@adisorn.car', mktId: 'm2', target: 20_000, active: true },
  { id: 'a5', code: 'AG-2002', kind: 'company', th: 'บริษัท เอเชีย คาร์แคร์ อินชัวรันส์ จำกัด', en: 'Asia Carcare Insurance Co., Ltd.', contactTh: 'คุณธีรพงศ์ แสงดี', contactEn: 'Teerapong Saengdee', license: 'ว00456/2566', province: 'นนทบุรี', phone: '02-555-7788', line: '@asiacarcare', mktId: 'm3', target: 60_000, active: true },
  { id: 'a6', code: 'AG-1004', kind: 'person', th: 'กิตติพงษ์ ใจกล้า', en: 'Kittipong Jaikla', license: '6404011122', province: 'ภูเก็ต', phone: '089-111-2204', line: '@kitti.phuket', mktId: 'm3', target: 15_000, active: true },
];

export const mktById = (id?: string) => MARKETING.find((m) => m.id === id);

/** Commission as a share of net premium (excl. VAT and stamp duty), by cover type. */
export const COMMISSION_RATE: Record<CoverageType, number> = { T1: 0.18, T2P: 0.15, T3P: 0.15, T2: 0.15, T3: 0.15, CMI: 0.12, TRV: 0.2, PA: 0.18, FIRE: 0.18 };

/** Quotations stay valid this many days; agents remit collected premium within this many days of issue. */
export const PROPOSAL_DAYS = 15;
export const PAY_DAYS = 15;
const DAY = 86_400_000;

/** Gross premium includes 7% VAT and 0.4% stamp duty. */
export const netOf = (gross: number) => Math.round((gross / 1.07428) * 100) / 100;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Commission rate of a package: the snapshot taken when it was offered, else the class standard. */
export const rateOf = (pkg: { type: CoverageType; comRate?: number }) => pkg.comRate ?? COMMISSION_RATE[pkg.type];

/** Price of one quoted option: voluntary premium after discount, plus CMI (never discounted). */
export function optionPrice(o: ProposalOption, discountPct: number, usage?: UsageCode) {
  const vol = o.pkg.premium;
  const cmi = o.addCmi && o.pkg.type !== 'CMI' ? (o.pkg.cmi ?? (usage && cmiPremium(usage)) ?? 0) : 0;
  const rate = rateOf(o.pkg);
  const pct = Math.min(discountPct / 100, rate);
  const discount = o.pkg.type === 'CMI' ? 0 : Math.round(netOf(vol) * pct);
  const full = r2(vol + cmi);
  const commission = r2(netOf(vol) * rate + netOf(cmi) * COMMISSION_RATE.CMI);
  return { full, discount, price: r2(full - discount), commission, net: r2(commission - discount), pct: pct * 100 };
}

/** Commission on a sold case after the agent's discount. */
export function caseCommission(c: Case) {
  if (!c.agentId) return { gross: 0, discount: 0, net: 0 };
  const base = c.pkg ? c.pkg.premium : (c.quotedPremium ?? 0);
  const cmi = c.addCmi && c.coverage !== 'CMI' ? (c.pkg?.cmi ?? (c.vehicle && cmiPremium(c.vehicle.usage)) ?? 0) : 0;
  const gross = r2(netOf(base) * (c.pkg ? rateOf(c.pkg) : COMMISSION_RATE[c.coverage]) + netOf(cmi) * COMMISSION_RATE.CMI);
  const discount = c.discount ?? 0;
  return { gross, discount, net: r2(gross - discount) };
}

/** paid = within the 15-day rule, late = paid after it, pending = not due yet, overdue = due and unpaid. */
export type PayState = 'paid' | 'late' | 'pending' | 'overdue';
export const settled = (st?: PayState) => st === 'paid' || st === 'late';
const doneState = (doneAt: number, due: number): PayState => (doneAt <= due ? 'paid' : 'late');

/**
 * Money side of an agent case. Paid through the link: due within 15 days of the customer's confirmation.
 * Collected by the agent: remittance due within 15 days of issue.
 */
export function payInfo(c: Case, now: number): { state: PayState; due: number; doneAt?: number } | null {
  if (!c.agentId || !c.collect || !c.stamps.confirmed || c.status === 'CANCELLED') return null;
  if (c.collect === 'link') {
    const due = c.stamps.confirmed + PAY_DAYS * DAY;
    return { state: c.paidAt ? doneState(c.paidAt, due) : now > due ? 'overdue' : 'pending', due, doneAt: c.paidAt };
  }
  // Remittance falls due only once the policy is issued.
  const due = (c.stamps.issued ?? now) + PAY_DAYS * DAY;
  return { state: c.remittedAt ? doneState(c.remittedAt, due) : c.stamps.issued && now > due ? 'overdue' : 'pending', due, doneAt: c.remittedAt };
}

/** Commission counts as received once ABC has the money for an issued policy. */
export const commissionReceived = (c: Case) => !!c.stamps.issued && !!(c.collect === 'agent' ? c.remittedAt : c.paidAt);
