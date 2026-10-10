import type { Case, CoverageType, Customer, Lead, Proposal, ProposalOption, RenewalItem, Source, TrafficDay, UsageCode, Visit } from '../types';
import { CURRENT_YEAR, MODELS, PROVINCES, STAFF, suggestedSumInsured } from '../data/vehicles';
import { packagesFor } from '../data/products';
import { estimateQuote, cmiPremium, REQUIRED_DOCS, SELF_SERVICE_TYPES } from '../data/packages';
import { addBizMinutes, bkkParts, bkkTime, DAY_MS, startOfBkkDay, dayKey } from './time';
import { SLA_KEYS, slaFor } from './sla';
import { AGENTS, PAY_DAYS, PROPOSAL_DAYS, optionPrice } from '../data/agents';
import { makeTrip, travelPackages } from '../data/travel';
import { OCCUPATIONS, getPaProducts, paPackage } from '../data/pa';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['สมชาย', 'สมหญิง', 'วิชัย', 'อรุณี', 'ประเสริฐ', 'จันทร์จิรา', 'ธีรวัฒน์', 'กัญญา', 'ภาณุ', 'ศิริพร', 'อนุชา', 'พรทิพย์', 'ชัยวัฒน์', 'มณีรัตน์', 'วรเชษฐ์', 'นภัสสร'];
const LAST = ['ใจดี', 'รักไทย', 'สุขสวัสดิ์', 'บุญมา', 'แสงทอง', 'พึ่งบุญ', 'ศรีวงศ์', 'มีสุข', 'ทองคำ', 'เพชรรัตน์', 'อินทร์แก้ว', 'วงศ์สวัสดิ์'];
const PLATE_LETTERS = ['กข', 'ขค', 'งจ', 'ฉช', 'ฐฒ', 'บม', 'พย', 'รล', 'วศ', 'สห'];

export interface SeedResult {
  cases: Case[];
  seq: number;
}

/** Three months of sample history ending at `now`, reproducible for the same day. */
export function seedCases(now: number): SeedResult {
  const rnd = mulberry32(20261007);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const weighted = <T,>(items: [T, number][]) => {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = rnd() * total;
    for (const [v, w] of items) if ((r -= w) <= 0) return v;
    return items[items.length - 1][0];
  };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const lognormal = (median: number, sigma: number) => median * Math.exp(sigma * gauss());

  const brandWeights: [string, number][] = [
    ['toyota', 25], ['honda', 18], ['isuzu', 12], ['mazda', 7], ['nissan', 6],
    ['mitsubishi', 7], ['ford', 8], ['mg', 6], ['byd', 7], ['suzuki', 4], ['hyundai', 4],
  ];
  const staffWeights: [string, number][] = STAFF.map((s, i) => [s.id, [24, 22, 20, 18, 16][i]]);

  const cases: Case[] = [];
  const startDay = startOfBkkDay(now) - 91 * DAY_MS;
  let seq = 0;

  for (let day = startDay; day <= startOfBkkDay(now); day += DAY_MS) {
    const p = bkkParts(day);
    const weekend = p.dow === 0 || p.dow === 6;
    const progress = (day - startDay) / (91 * DAY_MS);
    const mean = (weekend ? 1.6 : 4.2) * (0.8 + 0.45 * progress);
    const n = Math.max(0, Math.round(mean + gauss() * 1.3));
    for (let i = 0; i < n; i++) {
      const offHours = rnd() < 0.2;
      const minute = offHours ? 17 * 60 + 40 + rnd() * 270 : 8 * 60 + 30 + rnd() * 540;
      const submitted = bkkTime(p.y, p.mo, p.d, 0, Math.floor(minute));
      if (submitted > now - 10 * 60_000) continue;

      let source: Source = rnd() < 0.34 ? 'quote' : 'package';
      const brandId = weighted(brandWeights);
      let pool = MODELS.filter((x) => x.brandId === brandId && !x.noPackage);
      if (source === 'quote' && rnd() < 0.45) pool = MODELS.filter((x) => x.noPackage);
      const model = pick(pool);
      const span = model.yearTo - model.yearFrom;
      const year = Math.max(model.yearFrom, model.yearTo - Math.floor(Math.pow(rnd(), 1.6) * (span + 1)));
      const si = suggestedSumInsured(model, year);
      // Pickups are mostly registered as 320, some (4-door) as 110.
      const usage: UsageCode = model.codes.length > 1 ? (rnd() < 0.7 ? model.codes[0] : model.codes[1]) : model.codes[0];

      let coverage: CoverageType;
      let pkg;
      if (source === 'package') {
        const pkgs = packagesFor(model, usage, year, si);
        const wanted = weighted<CoverageType>([['T1', 45], ['T2P', 20], ['T3P', 18], ['T2', 5], ['T3', 7], ['CMI', 5]]);
        const candidates = pkgs.filter((x) => x.type === wanted);
        pkg = candidates.length ? pick(candidates) : pick(pkgs.filter((x) => x.type !== 'CMI'));
        coverage = pkg.type;
        // Most 2+ / 3+ / CMI buyers finish online by themselves.
        if (SELF_SERVICE_TYPES.includes(coverage) && rnd() < 0.7) source = 'self';
      } else {
        coverage = weighted<CoverageType>([['T1', 70], ['T2P', 20], ['T3P', 10]]);
      }
      const addCmi = coverage !== 'CMI' && rnd() < 0.55;

      seq++;
      const sp = bkkParts(submitted);
      const id = `JKY-${String(sp.y).slice(2)}${String(sp.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
      const fn = pick(FIRST);
      const ln = pick(LAST);
      const customer: Customer = {
        firstName: fn,
        lastName: ln,
        idCard: `1${Math.floor(1e11 + rnd() * 9e11)}`,
        phone: `08${Math.floor(1e7 + rnd() * 9e7)}`,
        email: `customer${seq}@example.com`,
        address: `${Math.floor(1 + rnd() * 300)}/${Math.floor(1 + rnd() * 90)} ถนนสุขุมวิท`,
        plate: `${Math.floor(1 + rnd() * 9)}${pick(PLATE_LETTERS)} ${Math.floor(1000 + rnd() * 8999)}`,
        province: pick(PROVINCES),
        chassis: `MR0${Math.floor(rnd() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}${Math.floor(1e6 + rnd() * 9e6)}`,
        startDate: new Date(submitted + 7 * DAY_MS).toISOString().slice(0, 10),
        driver1: '',
        driver2: '',
      };

      const c: Case = {
        id,
        source,
        createdAt: submitted,
        vehicle: { brandId, modelId: model.id, year, sumInsured: si, usage },
        coverage,
        pkg,
        addCmi,
        desiredSI: source === 'quote' ? si : undefined,
        customer,
        status: 'NEW',
        stamps: { submitted },
        docs: {},
        log: [],
        seeded: true,
      };
      if (source !== 'quote') {
        c.stamps.quoted = submitted;
        c.stamps.confirmed = submitted;
      }
      const cmiPrice = cmiPremium(usage) ?? 0;
      const stale = now - submitted > 10 * DAY_MS;

      if (source === 'self') {
        // Self service: documents and payment within minutes, no agent involved.
        c.stamps.accepted = submitted;
        c.status = 'AWAITING_PAYMENT';
        const docsAt = submitted + lognormal(6, 0.6) * 60_000;
        const finishes = rnd() < 0.82;
        if (!finishes || docsAt > now) {
          if (!finishes && stale) {
            c.status = 'CANCELLED';
            c.stamps.cancelled = submitted + 7 * DAY_MS;
          }
          cases.push(c);
          continue;
        }
        c.stamps.docsComplete = docsAt;
        for (const k of REQUIRED_DOCS[coverage]) c.docs[k] = { name: `${k}.jpg`, size: 700_000, at: docsAt };
        const paidAt = docsAt + lognormal(3, 0.5) * 60_000;
        if (paidAt > now) {
          cases.push(c);
          continue;
        }
        const paper = rnd() < 0.35;
        c.stamps.paid = paidAt;
        c.stamps.issued = paidAt + 5_000;
        c.status = 'ISSUED';
        c.payment = { method: rnd() < 0.6 ? 'qr' : 'card', at: paidAt };
        c.delivery = paper
          ? { method: 'paper', address: customer.address, trackingNo: `EB${String(100000000 + seq * 7919).slice(-9)}TH` }
          : { method: 'pdf', email: customer.email };
        c.premium = Math.round((pkg!.premium + (addCmi ? cmiPrice : 0)) * 100) / 100;
        c.policyNo = `P${CURRENT_YEAR % 100}-${String(100000 + seq).slice(1)}`;
        cases.push(c);
        continue;
      }

      const staff = weighted(staffWeights);
      const pace = STAFF.find((s) => s.id === staff)!.pace;
      const cancelAt = (t: number) => {
        if (stale) {
          c.status = 'CANCELLED';
          c.stamps.cancelled = Math.min(now - 60_000, t + (2 + rnd() * 5) * DAY_MS);
        }
      };

      // accept
      if (rnd() > 0.99) {
        cancelAt(submitted);
        cases.push(c);
        continue;
      }
      const accepted = addBizMinutes(submitted, Math.max(1, lognormal(7 * pace, 0.75)));
      if (accepted > now) {
        cases.push(c);
        continue;
      }
      c.stamps.accepted = accepted;
      c.assignee = staff;
      c.status = source === 'quote' ? 'ACCEPTED' : 'AWAITING_DOCS';

      let docsFrom = submitted;
      if (source === 'quote') {
        if (rnd() > 0.93) {
          cancelAt(accepted);
          cases.push(c);
          continue;
        }
        const quoted = addBizMinutes(submitted, Math.max(20, lognormal(60 * pace, 0.55)));
        if (quoted > now) {
          cases.push(c);
          continue;
        }
        c.stamps.quoted = quoted;
        c.status = 'QUOTED';
        c.quotedPremium = Math.round((estimateQuote(model, usage, si, coverage) * (0.95 + rnd() * 0.15)) / 10) * 10;
        if (rnd() > 0.62) {
          cancelAt(quoted);
          cases.push(c);
          continue;
        }
        const confirmed = quoted + lognormal(20, 0.9) * 3600_000;
        if (confirmed > now) {
          cases.push(c);
          continue;
        }
        c.stamps.confirmed = confirmed;
        c.status = 'AWAITING_DOCS';
        docsFrom = confirmed;
      }

      // documents
      if (rnd() > (source === 'quote' ? 0.9 : 0.84)) {
        cancelAt(docsFrom);
        cases.push(c);
        continue;
      }
      const docsComplete = Math.max(docsFrom + lognormal(26, 0.9) * 3600_000, accepted + 60_000);
      if (docsComplete > now) {
        cases.push(c);
        continue;
      }
      c.stamps.docsComplete = docsComplete;
      for (const k of REQUIRED_DOCS[coverage]) c.docs[k] = { name: `${k}.jpg`, size: 900_000, at: docsComplete };
      c.status = 'DOCS_REVIEW';

      // issue
      if (rnd() > 0.96) {
        cancelAt(docsComplete);
        cases.push(c);
        continue;
      }
      const issued = addBizMinutes(docsComplete, Math.max(30, lognormal(230 * pace, 0.6)));
      if (issued > now) {
        cases.push(c);
        continue;
      }
      c.stamps.issued = issued;
      c.status = 'ISSUED';
      const base = pkg ? pkg.premium : c.quotedPremium!;
      c.premium = Math.round((base + (addCmi ? cmiPrice : 0)) * 100) / 100;
      c.policyNo = `P${CURRENT_YEAR % 100}-${String(100000 + seq).slice(1)}`;
      cases.push(c);
    }
  }

  // Breaches that already happened are history, not new alerts.
  for (const c of cases) {
    const breached = SLA_KEYS.filter((k) => {
      const r = slaFor(c, k, now);
      return r && (r.state === 'overdue' || r.state === 'breached');
    });
    if (breached.length) c.slaAlerted = breached;
  }
  return { cases, seq };
}

/** Sample "send me the price" leads: some turned into the seeded cases, most did not. */
export function seedLeads(cases: Case[], now: number): Lead[] {
  const rnd = mulberry32(777);
  const leads: Lead[] = [];
  const fromPrice = (v: NonNullable<Case['vehicle']>) => {
    const md = MODELS.find((m) => m.id === v.modelId);
    if (!md) return 0;
    const p = packagesFor(md, v.usage, v.year, v.sumInsured).filter((x) => x.type !== 'CMI');
    return p.length ? Math.min(...p.map((x) => x.premium)) : 0;
  };
  for (const c of cases) {
    if (!c.vehicle || c.source === 'quote' || rnd() > 0.45) continue;
    leads.push({
      id: `L-S${leads.length}`,
      at: c.createdAt - (20 + rnd() * 600) * 60_000,
      ...(rnd() < 0.7 ? { contact: c.customer.phone, channel: 'phone' as const } : { contact: c.customer.email, channel: 'email' as const }),
      vehicle: c.vehicle,
      fromPrice: fromPrice(c.vehicle),
      caseId: c.id,
      contacted: c.createdAt - 10 * 60_000,
    });
  }
  const pool = MODELS.filter((m) => !m.noPackage);
  const open = Math.round(cases.length * 0.8);
  for (let i = 0; i < open; i++) {
    const at = now - rnd() * 91 * DAY_MS;
    const md = pool[Math.floor(rnd() * pool.length)];
    const year = md.yearTo - Math.floor(rnd() * Math.min(8, md.yearTo - md.yearFrom + 1));
    const vehicle = { brandId: md.brandId, modelId: md.id, year, sumInsured: suggestedSumInsured(md, year), usage: md.codes[0] };
    const email = rnd() < 0.3;
    leads.push({
      id: `L-O${i}`,
      at,
      contact: email ? `lead${i}@example.com` : `08${Math.floor(1e7 + rnd() * 9e7)}`,
      channel: email ? 'email' : 'phone',
      vehicle,
      fromPrice: fromPrice({ ...vehicle }),
      contacted: now - at > 2 * DAY_MS && rnd() < 0.7 ? at + (1 + rnd() * 20) * 3600_000 : undefined,
    });
  }
  return leads.sort((a, b) => b.at - a.at);
}

/** Visitors per day for the steps before submitting, scaled from the seeded requests. */
export function seedTraffic(cases: Case[], now: number): Record<string, TrafficDay> {
  const rnd = mulberry32(4242);
  const perDay: Record<string, number> = {};
  for (const c of cases) perDay[dayKey(c.createdAt)] = (perDay[dayKey(c.createdAt)] ?? 0) + 1;
  const out: Record<string, TrafficDay> = {};
  for (let d = startOfBkkDay(now) - 91 * DAY_MS; d <= now; d += DAY_MS) {
    const k = dayKey(d);
    const sub = perDay[k] ?? 0;
    const choose = Math.round(sub * (1.25 + rnd() * 0.25) + rnd() * 2);
    const pkg = Math.round(choose * (1.9 + rnd() * 0.5));
    const car = Math.round(pkg * (1.1 + rnd() * 0.15));
    const visit = Math.round(car * (2.2 + rnd() * 0.6));
    out[k] = { visit, car, pkg, choose };
  }
  return out;
}

/**
 * Moves part of the seeded sales to the Business Partners and builds their quotation history:
 * every agent package sale came from an accepted quotation, and most quotations never close.
 */
export function seedAgentWork(cases: Case[], now: number): Proposal[] {
  const rnd = mulberry32(5150);
  const weights: [string, number][] = [['a1', 18], ['a2', 30], ['a3', 13], ['a4', 10], ['a5', 22], ['a6', 7]];
  const pickAgent = () => {
    let r = rnd() * 100;
    for (const [id, w] of weights) if ((r -= w) <= 0) return id;
    return 'a1';
  };
  // Close rate differs by agent; companies quote more and close less.
  const closeRate: Record<string, number> = { a1: 0.42, a2: 0.3, a3: 0.48, a4: 0.36, a5: 0.33, a6: 0.5 };
  const discountChoices = [0, 0, 2, 3, 5, 5, 8, 10, 12];
  const proposals: Proposal[] = [];
  let n = 0;
  const mkId = (t: number) => {
    const p = bkkParts(t);
    n++;
    return `Q-${String(p.y).slice(2)}${String(p.mo + 1).padStart(2, '0')}-S${String(n).padStart(4, '0')}`;
  };

  // Money: most pay on time; a few are late or still outstanding.
  const seedMoney = (c: Case) => {
    if (c.status === 'CANCELLED' || !c.stamps.confirmed) return;
    const confirmed = c.stamps.confirmed!;
    if (c.collect === 'link') {
      const late = rnd() < 0.12;
      const paidAt = confirmed + (late ? PAY_DAYS + 1 + rnd() * 10 : rnd() * 4) * DAY_MS;
      if (paidAt < now && rnd() > 0.05) c.paidAt = paidAt;
    } else {
      c.paidAt = confirmed;
      if (c.stamps.issued) {
        const late = rnd() < 0.18;
        const remittedAt = c.stamps.issued + (late ? PAY_DAYS + 1 + rnd() * 12 : 1 + rnd() * 12) * DAY_MS;
        if (remittedAt < now) c.remittedAt = remittedAt;
      }
    }
  };

  for (const c of cases) {
    if (c.source === 'self' || rnd() > 0.36) continue;
    const agentId = pickAgent();
    c.agentId = agentId;
    c.collect = rnd() < 0.62 ? 'link' : 'agent';
    if (c.source === 'quote') {
      seedMoney(c);
      continue;
    }

    const v = c.vehicle!;
    const md = MODELS.find((m) => m.id === v.modelId)!;
    const pkgs = packagesFor(md, v.usage, v.year, v.sumInsured).filter((p) => p.type !== 'CMI' || c.coverage === 'CMI');
    const others = pkgs.filter((p) => p.id !== c.pkg!.id);
    const options: ProposalOption[] = [{ pkg: c.pkg!, addCmi: c.addCmi }];
    const extra = Math.floor(rnd() * 3);
    for (let i = 0; i < extra && others.length; i++) options.push({ pkg: others.splice(Math.floor(rnd() * others.length), 1)[0], addCmi: c.addCmi });
    const discountPct = c.coverage === 'CMI' ? 0 : discountChoices[Math.floor(rnd() * discountChoices.length)];
    const price = optionPrice(options[0], discountPct, v.usage);
    c.discount = price.discount || undefined;
    if (c.premium !== undefined) c.premium = Math.round((c.premium - (c.discount ?? 0)) * 100) / 100;

    const createdAt = c.createdAt - (0.5 + rnd() * 70) * 3600_000;
    const atDesk = rnd() < 0.4;
    const pr: Proposal = {
      id: mkId(createdAt),
      agentId,
      createdAt,
      expiresAt: createdAt + PROPOSAL_DAYS * DAY_MS,
      vehicle: c.vehicle,
      customer: c.customer,
      options: options.sort(() => rnd() - 0.5),
      discountPct,
      sentVia: atDesk ? ['pdf'] : rnd() < 0.6 ? ['link', 'line'] : ['link'],
      viewedAt: atDesk ? undefined : createdAt + (0.2 + rnd() * 20) * 3600_000,
      status: 'accepted',
      acceptedAt: c.createdAt,
      acceptedBy: atDesk ? 'agent' : 'customer',
      caseId: c.id,
      seeded: true,
    };
    pr.chosen = pr.options.findIndex((o) => o.pkg.id === c.pkg!.id);
    c.proposalId = pr.id;
    proposals.push(pr);

    seedMoney(c);
  }

  // Quotations that did not (or not yet) close.
  const sold = proposals.length;
  const pool = MODELS.filter((m) => !m.noPackage);
  const total = Math.round(sold / 0.38);
  for (let i = sold; i < total; i++) {
    const agentId = pickAgent();
    if (rnd() < closeRate[agentId] - 0.3) continue;
    const createdAt = now - rnd() * 91 * DAY_MS;
    const md = pool[Math.floor(rnd() * pool.length)];
    const year = md.yearTo - Math.floor(rnd() * Math.min(9, md.yearTo - md.yearFrom + 1));
    const si = suggestedSumInsured(md, year);
    const usage = md.codes[0];
    const pkgs = packagesFor(md, usage, year, si).filter((p) => p.type !== 'CMI');
    if (!pkgs.length) continue;
    const k = 1 + Math.floor(rnd() * Math.min(4, pkgs.length));
    const options: ProposalOption[] = [];
    const left = [...pkgs];
    const cmi = rnd() < 0.5;
    for (let j = 0; j < k; j++) options.push({ pkg: left.splice(Math.floor(rnd() * left.length), 1)[0], addCmi: cmi });
    const viewed = rnd() < 0.62;
    const expired = now > createdAt + PROPOSAL_DAYS * DAY_MS;
    const fn = FIRST[Math.floor(rnd() * FIRST.length)];
    const ln = LAST[Math.floor(rnd() * LAST.length)];
    proposals.push({
      id: mkId(createdAt),
      agentId,
      createdAt,
      expiresAt: createdAt + PROPOSAL_DAYS * DAY_MS,
      vehicle: { brandId: md.brandId, modelId: md.id, year, sumInsured: si, usage },
      customer: { firstName: fn, lastName: ln, idCard: '', phone: `08${Math.floor(1e7 + rnd() * 9e7)}`, email: `prospect${i}@example.com`, address: '', plate: '', province: PROVINCES[Math.floor(rnd() * PROVINCES.length)], chassis: '', startDate: '', driver1: '', driver2: '' },
      options,
      discountPct: discountChoices[Math.floor(rnd() * discountChoices.length)],
      sentVia: rnd() < 0.7 ? ['link'] : ['pdf'],
      viewedAt: viewed ? Math.min(now - 60_000, createdAt + (0.5 + rnd() * 48) * 3600_000) : undefined,
      status: viewed && (expired || rnd() < 0.3) && rnd() < 0.35 ? 'declined' : 'open',
      seeded: true,
    });
  }
  return proposals.sort((a, b) => b.createdAt - a.createdAt);
}

/** Policies in force that come up for renewal from a month ago to three months ahead. */
export function seedRenewals(now: number): RenewalItem[] {
  const rnd = mulberry32(9090);
  const out: RenewalItem[] = [];
  const pool = MODELS.filter((m) => !m.noPackage && m.body !== 'ev');
  const agents = AGENTS.map((a) => a.id);
  for (let i = 0; i < 260; i++) {
    const expiry = startOfBkkDay(now) + Math.round(-30 + rnd() * 120) * DAY_MS;
    const md = pool[Math.floor(rnd() * pool.length)];
    const year = Math.max(md.yearFrom, md.yearTo - Math.floor(rnd() * 8));
    const usage = md.codes[0];
    const coverage: CoverageType = (['T1', 'T1', 'T1', 'T2P', 'T3P', 'T3'] as CoverageType[])[Math.floor(rnd() * 6)];
    const si = suggestedSumInsured(md, year);
    const pk = packagesFor(md, usage, year, si).find((p) => p.type === coverage) ?? packagesFor(md, usage, year, si)[0];
    const days = (expiry - now) / DAY_MS;
    const r = rnd();
    const status: RenewalItem['status'] =
      days < 0 ? (r < 0.7 ? 'renewed' : 'lost') : days < 30 ? (r < 0.38 ? 'renewed' : r < 0.68 ? 'quoted' : 'open') : days < 60 ? (r < 0.15 ? 'renewed' : r < 0.4 ? 'quoted' : 'open') : r < 0.05 ? 'renewed' : r < 0.15 ? 'quoted' : 'open';
    const agentId = rnd() < 0.7 ? agents[Math.floor(rnd() * agents.length)] : undefined;
    out.push({
      id: `R-${String(i + 1).padStart(4, '0')}`,
      agentId,
      policyNo: `P${(CURRENT_YEAR - 1) % 100}-${String(10000 + Math.floor(rnd() * 89999))}`,
      customerName: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      phone: `08${Math.floor(1e7 + rnd() * 9e7)}`,
      vehicle: { brandId: md.brandId, modelId: md.id, year, sumInsured: si, usage },
      coverage: pk.type,
      premium: pk.premium,
      expiry,
      status,
      // Renewed at last year's price less the 5% no-claim discount, give or take a claim surcharge.
      ...(status === 'renewed' ? { renewedPremium: Math.round(pk.premium * (rnd() < 0.85 ? 0.95 : 1.05)), renewedAt: Math.min(now, expiry - Math.round(rnd() * 25) * DAY_MS) } : {}),
    });
  }
  return out.sort((a, b) => a.expiry - b.expiry);
}

/** One earlier visit per partner (some with a next appointment), so the visit log and VP column have history. */
export function seedVisits(now: number): Visit[] {
  const notes: [string, string[]][] = [
    ['คุยเป้าไตรมาสนี้ Partner ขอโปรชั้น 1 สำหรับรถ EV และขอใบเสนอราคาแบบเทียบ 3 แพ็กเกจ', ['ยอดเดือนที่แล้ว', 'งานต่ออายุค้าง']],
    ['ยอดต่ำกว่าเป้าเพราะลูกค้าเลื่อนออกรถ นัดติดตามงานต่ออายุ 5 ราย', ['ยอดต่ำกว่าเป้า', 'งานต่ออายุ']],
    ['สนใจขยายไปขาย 2+ กลุ่มรถกระบะ ขอเอกสารผลิตภัณฑ์เพิ่ม', ['ผลิตภัณฑ์ใหม่']],
    ['เร่งนำส่งเบี้ยที่ค้าง 2 ราย ตกลงนำส่งภายในสัปดาห์นี้', ['เบี้ยค้างนำส่ง']],
    ['ทบทวนค่าคอมพิเศษ Partner ขอเพิ่ม 1% หากทำได้เกินเป้า 3 เดือนติด', ['ค่าคอม', 'เป้าปีหน้า']],
    ['แนะนำแพ็กเกจใหม่และวิธีส่งลิงก์ใบเสนอราคาทาง LINE', ['แนะนำแพ็กเกจใหม่']],
  ];
  return AGENTS.map((a, i) => {
    const at = startOfBkkDay(now - (8 + i * 6) * DAY_MS) + 12 * 3600_000;
    const [outcome, topics] = notes[i % notes.length];
    return { id: `v-seed-${a.id}`, agentId: a.id, mktId: a.mktId, at, topics, outcome, nextAt: i % 3 === 2 ? undefined : startOfBkkDay(now + (5 + i * 4) * DAY_MS) + 10 * 3600_000, recordedAt: at };
  }).sort((x, y) => y.at - x.at);
}

/**
 * Three months of travel policies: bought online, or sold by a partner from an accepted quotation.
 * Travel is issued the moment it is paid, so every seeded one is already issued.
 */
export function seedTravel(now: number, startSeq: number): { cases: Case[]; proposals: Proposal[]; seq: number } {
  const rnd = mulberry32(8080);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const weighted = <T,>(items: [T, number][]) => {
    const total = items.reduce((x, [, w]) => x + w, 0);
    let r = rnd() * total;
    for (const [v, w] of items) if ((r -= w) <= 0) return v;
    return items[items.length - 1][0];
  };
  const agentWeights: [string, number][] = [['a1', 20], ['a2', 25], ['a3', 15], ['a4', 8], ['a5', 22], ['a6', 10]];
  const cases: Case[] = [];
  const proposals: Proposal[] = [];
  let seq = startSeq;
  let qn = 500;
  const startDay = startOfBkkDay(now) - 91 * DAY_MS;
  for (let day = startDay; day <= startOfBkkDay(now); day += DAY_MS) {
    const n = rnd() < 0.55 ? 1 : rnd() < 0.3 ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const p = bkkParts(day);
      const submitted = bkkTime(p.y, p.mo, p.d, 0, Math.floor(8 * 60 + rnd() * 780));
      if (submitted > now - 30 * 60_000) continue;
      const annual = rnd() < 0.18;
      const zoneId = weighted<string>([['asia', 58], ['world', 32], ['worldUs', 10]]);
      const start = dayKey(submitted + (2 + Math.floor(rnd() * 28)) * DAY_MS);
      const len = pick([3, 4, 5, 5, 6, 7, 7, 8, 10, 12, 14, 21, 30]);
      const end = dayKey(new Date(`${start}T12:00:00+07:00`).getTime() + (len - 1) * DAY_MS);
      const dest = zoneId === 'asia' ? pick(['ญี่ปุ่น', 'เกาหลีใต้', 'ไต้หวัน', 'เวียดนาม', 'สิงคโปร์', 'ฮ่องกง']) : zoneId === 'world' ? pick(['ฝรั่งเศส', 'อิตาลี', 'สวิตเซอร์แลนด์', 'สหราชอาณาจักร', 'ออสเตรเลีย']) : pick(['สหรัฐอเมริกา', 'แคนาดา']);
      const trip = makeTrip(annual ? 'annual' : 'single', zoneId, start, end, dest);
      if (!trip) continue;
      const age = Math.round(22 + rnd() * 48);
      const pkgs = travelPackages(trip, age);
      if (!pkgs.length) continue;
      const want = weighted<string>([['TRV-BASIC', 40], ['TRV-PLUS', 45], ['TRV-MAX', 15]]);
      const pkg = pkgs.find((x) => x.id === want) ?? pkgs[0];
      seq++;
      const sp = bkkParts(submitted);
      const id = `JKY-${String(sp.y).slice(2)}${String(sp.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
      const birth = `${bkkParts(now).y - age}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;
      const customer: Customer = {
        firstName: pick(FIRST),
        lastName: pick(LAST),
        idCard: `1${Math.floor(1e11 + rnd() * 9e11)}`,
        phone: `08${Math.floor(1e7 + rnd() * 9e7)}`,
        email: `traveller${seq}@example.com`,
        address: '',
        plate: '',
        province: '',
        chassis: '',
        startDate: trip.start,
        driver1: '',
        driver2: '',
        passport: `A${Math.floor(1e7 + rnd() * 9e7)}`,
        birthDate: birth,
      };
      const viaAgent = rnd() < 0.4;
      const issued = submitted + (3 + rnd() * 40) * 60_000;
      const c: Case = {
        id,
        source: viaAgent ? 'package' : 'self',
        createdAt: submitted,
        coverage: 'TRV',
        pkg,
        addCmi: false,
        customer,
        status: 'ISSUED',
        stamps: { submitted, quoted: submitted, confirmed: submitted, accepted: submitted, docsComplete: submitted, paid: issued, issued },
        docs: {},
        log: [],
        policyNo: `TR${CURRENT_YEAR % 100}-${String(100000 + seq).slice(1)}`,
        premium: pkg.premium,
        delivery: { method: 'pdf', email: customer.email },
        seeded: true,
      };
      if (!viaAgent) {
        c.payment = { method: rnd() < 0.6 ? 'qr' : 'card', at: issued };
      } else {
        const agentId = weighted(agentWeights);
        c.agentId = agentId;
        c.collect = rnd() < 0.7 ? 'link' : 'agent';
        const discountPct = pick([0, 0, 0, 3, 5]);
        const others = pkgs.filter((x) => x.id !== pkg.id).slice(0, Math.floor(rnd() * 3));
        const options: ProposalOption[] = [{ pkg, addCmi: false }, ...others.map((o) => ({ pkg: o, addCmi: false }))];
        const price = optionPrice(options[0], discountPct);
        c.discount = price.discount || undefined;
        c.premium = Math.round((pkg.premium - (c.discount ?? 0)) * 100) / 100;
        c.paidAt = issued;
        if (c.collect === 'link') c.payment = { method: 'qr', at: issued };
        else {
          const remittedAt = issued + (1 + rnd() * 14) * DAY_MS;
          if (remittedAt < now) c.remittedAt = remittedAt;
        }
        const createdAt = submitted - (0.5 + rnd() * 30) * 3600_000;
        qn++;
        const qp = bkkParts(createdAt);
        const pr: Proposal = {
          id: `Q-${String(qp.y).slice(2)}${String(qp.mo + 1).padStart(2, '0')}-T${String(qn).padStart(4, '0')}`,
          agentId,
          createdAt,
          expiresAt: createdAt + PROPOSAL_DAYS * DAY_MS,
          customer,
          options,
          discountPct,
          sentVia: ['link', 'line'],
          viewedAt: createdAt + 3600_000,
          status: 'accepted',
          acceptedAt: submitted,
          acceptedBy: c.collect === 'agent' ? 'agent' : 'customer',
          chosen: 0,
          caseId: id,
          seeded: true,
        };
        c.proposalId = pr.id;
        proposals.push(pr);
      }
      cases.push(c);
    }
  }
  return { cases, proposals, seq };
}

/** Thai-style birth date for an age in whole years on a given day. */
const birthFor = (rnd: () => number, now: number, age: number) =>
  `${bkkParts(now).y - age - 1}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;

/**
 * Three months of personal accident policies, bought online or sold by partners. Most are issued on
 * payment; applications with a "yes" health answer or a class 3 job were reviewed by the back office
 * first, and the newest of those are still waiting in the queue.
 */
export function seedPa(now: number, startSeq: number): { cases: Case[]; proposals: Proposal[]; seq: number } {
  const rnd = mulberry32(6060);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const agentWeights: [string, number][] = [['a1', 22], ['a2', 15], ['a3', 25], ['a4', 10], ['a5', 18], ['a6', 10]];
  const weighted = <T,>(items: [T, number][]) => {
    const total = items.reduce((x, [, w]) => x + w, 0);
    let r = rnd() * total;
    for (const [v, w] of items) if ((r -= w) <= 0) return v;
    return items[items.length - 1][0];
  };
  const occs = OCCUPATIONS.filter((o) => o.cls !== 4);
  const plans = getPaProducts();
  const cases: Case[] = [];
  const proposals: Proposal[] = [];
  let seq = startSeq;
  let qn = 300;
  const startDay = startOfBkkDay(now) - 91 * DAY_MS;
  for (let day = startDay; day <= startOfBkkDay(now); day += DAY_MS) {
    const n = rnd() < 0.45 ? 1 : rnd() < 0.15 ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const p = bkkParts(day);
      const submitted = bkkTime(p.y, p.mo, p.d, 0, Math.floor(8 * 60 + rnd() * 780));
      if (submitted > now - 30 * 60_000) continue;
      const occ = weighted(occs.map((o) => [o, o.cls === 1 ? 6 : o.cls === 2 ? 4 : 2] as [typeof o, number]));
      const health = [rnd() < 0.05, rnd() < 0.04, rnd() < 0.03];
      const age = Math.round(20 + rnd() * 42);
      const start = dayKey(submitted + (1 + Math.floor(rnd() * 10)) * DAY_MS);
      const plan = weighted<string>([['PA-100', 30], ['PA-300', 50], ['PA-500', 20]]);
      const prod = plans.find((x) => x.id === plan) ?? plans[0];
      const motorcycle = rnd() < (occ.id === 'rider' ? 0.9 : 0.2);
      const birth = birthFor(rnd, submitted, age);
      const pkg = paPackage(prod, { birth, start, occupation: occ.id, motorcycle, health });
      if (!pkg?.accident) continue;
      const referral = pkg.accident.referral;
      seq++;
      const sp = bkkParts(submitted);
      const id = `JKY-${String(sp.y).slice(2)}${String(sp.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
      const customer: Customer = {
        firstName: pick(FIRST),
        lastName: pick(LAST),
        idCard: `1${Math.floor(1e11 + rnd() * 9e11)}`,
        phone: `08${Math.floor(1e7 + rnd() * 9e7)}`,
        email: `pa${seq}@example.com`,
        address: '',
        plate: '',
        province: '',
        chassis: '',
        startDate: start,
        driver1: '',
        driver2: '',
        birthDate: birth,
        beneficiary: pick(['ทายาทโดยธรรม', 'คู่สมรส', 'บิดา มารดา']),
      };
      const viaAgent = rnd() < 0.45;
      // Referred applications: reviewed within a working day; the last two days are still open.
      const pending = referral && now - submitted < 2 * DAY_MS;
      const accepted = referral ? submitted + (0.5 + rnd() * 4) * 3600_000 : submitted;
      const issued = referral ? accepted + (1 + rnd() * 6) * 3600_000 : submitted + (3 + rnd() * 40) * 60_000;
      const staff = STAFF[Math.floor(rnd() * STAFF.length)].id;
      const c: Case = {
        id,
        source: viaAgent || referral ? 'package' : 'self',
        createdAt: submitted,
        coverage: 'PA',
        pkg,
        addCmi: false,
        customer,
        status: 'ISSUED',
        stamps: { submitted, quoted: submitted, confirmed: submitted, accepted, docsComplete: submitted, paid: issued, issued },
        docs: {},
        log: [],
        policyNo: `PA${CURRENT_YEAR % 100}-${String(100000 + seq).slice(1)}`,
        premium: pkg.premium,
        delivery: { method: 'pdf', email: customer.email },
        ...(referral ? { assignee: staff } : {}),
        seeded: true,
      };
      if (pending) {
        const taken = now - submitted > 3 * 3600_000;
        c.status = taken ? 'DOCS_REVIEW' : 'NEW';
        c.stamps = { submitted, quoted: submitted, confirmed: submitted, docsComplete: submitted, ...(taken ? { accepted } : {}) };
        if (!taken) delete c.assignee;
        delete c.policyNo;
        delete c.premium;
        delete c.delivery;
      }
      if (!viaAgent) {
        if (!pending) c.payment = { method: rnd() < 0.6 ? 'qr' : 'card', at: issued };
      } else {
        const agentId = weighted(agentWeights);
        c.agentId = agentId;
        c.collect = rnd() < 0.7 ? 'link' : 'agent';
        const discountPct = pick([0, 0, 0, 3, 5]);
        const options: ProposalOption[] = [{ pkg, addCmi: false }];
        const price = optionPrice(options[0], discountPct);
        c.discount = price.discount || undefined;
        if (c.premium !== undefined) c.premium = Math.round((pkg.premium - (c.discount ?? 0)) * 100) / 100;
        c.paidAt = pending ? undefined : issued;
        if (!pending && c.collect === 'link') c.payment = { method: 'qr', at: issued };
        if (!pending && c.collect === 'agent') {
          const remittedAt = issued + (1 + rnd() * 14) * DAY_MS;
          if (remittedAt < now) c.remittedAt = remittedAt;
        }
        const createdAt = submitted - (0.5 + rnd() * 30) * 3600_000;
        qn++;
        const qp = bkkParts(createdAt);
        const pr: Proposal = {
          id: `Q-${String(qp.y).slice(2)}${String(qp.mo + 1).padStart(2, '0')}-A${String(qn).padStart(4, '0')}`,
          agentId,
          createdAt,
          expiresAt: createdAt + PROPOSAL_DAYS * DAY_MS,
          customer,
          options,
          discountPct,
          sentVia: ['link', 'line'],
          viewedAt: createdAt + 3600_000,
          status: 'accepted',
          acceptedAt: submitted,
          acceptedBy: c.collect === 'agent' ? 'agent' : 'customer',
          chosen: 0,
          caseId: id,
          seeded: true,
        };
        c.proposalId = pr.id;
        proposals.push(pr);
      }
      cases.push(c);
    }
  }
  return { cases, proposals, seq };
}

/** Last year's PA policies coming up for renewal (one-year cover, like motor). */
export function seedPaRenewals(now: number): RenewalItem[] {
  const rnd = mulberry32(6161);
  const agents = AGENTS.map((a) => a.id);
  const occs = OCCUPATIONS.filter((o) => o.cls !== 4);
  const plans = getPaProducts();
  const out: RenewalItem[] = [];
  for (let i = 0; i < 60; i++) {
    const expiry = startOfBkkDay(now) + Math.round(-30 + rnd() * 120) * DAY_MS;
    const prod = plans[Math.floor(rnd() * plans.length)];
    const occ = occs[Math.floor(rnd() * occs.length)];
    const motorcycle = rnd() < 0.25;
    const age = Math.round(22 + rnd() * 45);
    const birth = birthFor(rnd, now, age);
    const start = dayKey(expiry + DAY_MS);
    const pkg = paPackage(prod, { birth, start, occupation: occ.id, motorcycle, health: [false, false, false], renewal: true });
    if (!pkg) continue;
    const days = (expiry - now) / DAY_MS;
    const r = rnd();
    const status: RenewalItem['status'] =
      days < 0 ? (r < 0.75 ? 'renewed' : 'lost') : days < 30 ? (r < 0.4 ? 'renewed' : r < 0.65 ? 'quoted' : 'open') : r < 0.1 ? 'renewed' : r < 0.25 ? 'quoted' : 'open';
    const agentId = rnd() < 0.7 ? agents[Math.floor(rnd() * agents.length)] : undefined;
    const n = 1 + Math.floor(rnd() * 9000);
    out.push({
      id: `RP-${String(i + 1).padStart(4, '0')}`,
      agentId,
      policyNo: `PA${(CURRENT_YEAR - 1) % 100}-${String(10000 + Math.floor(rnd() * 89999))}`,
      customerName: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      phone: `08${Math.floor(1e7 + rnd() * 9e7)}`,
      pa: { productId: prod.id, occupation: occ.id, motorcycle, birthDate: birth, idCard: `1${Math.floor(1e11 + rnd() * 9e11)}`, email: `renew${n}@example.com` },
      coverage: 'PA',
      premium: pkg.premium,
      expiry,
      status,
      ...(status === 'renewed' ? { renewedPremium: pkg.premium, renewedAt: Math.min(now, expiry - Math.round(rnd() * 25) * DAY_MS) } : {}),
    });
  }
  return out;
}
