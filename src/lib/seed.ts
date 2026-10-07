import type { Case, CoverageType, Customer, Lead, Source, UsageCode } from '../types';
import { CURRENT_YEAR, MODELS, PROVINCES, STAFF, suggestedSumInsured } from '../data/vehicles';
import { estimateQuote, packagesFor, cmiPremium, REQUIRED_DOCS, SELF_SERVICE_TYPES } from '../data/packages';
import { addBizMinutes, bkkParts, bkkTime, DAY_MS, startOfBkkDay } from './time';
import { SLA_KEYS, slaFor } from './sla';

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
      const id = `ABC-${String(sp.y).slice(2)}${String(sp.mo + 1).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;
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
  const fromPrice = (v: Case['vehicle']) => {
    const md = MODELS.find((m) => m.id === v.modelId);
    if (!md) return 0;
    const p = packagesFor(md, v.usage, v.year, v.sumInsured).filter((x) => x.type !== 'CMI');
    return p.length ? Math.min(...p.map((x) => x.premium)) : 0;
  };
  for (const c of cases) {
    if (c.source === 'quote' || rnd() > 0.45) continue;
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
      fromPrice: fromPrice({ ...vehicle } as Case['vehicle']),
      contacted: now - at > 2 * DAY_MS && rnd() < 0.7 ? at + (1 + rnd() * 20) * 3600_000 : undefined,
    });
  }
  return leads.sort((a, b) => b.at - a.at);
}
