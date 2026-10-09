// Product catalogue <-> Excel. The exported file is also the import template: one sheet per product
// (key fields on top, then the rate table) plus a sheet that explains how to fill it in.
import type { CoverageType, Product, RateRow, UsageCode } from '../types';
import { COVERAGE_TYPES } from '../data/packages';
import { SI_TOP, blankProduct } from '../data/products';
import { CATALOGUE_CODES } from '../data/vehicles';
import { safeSheetName, type Cell, type Sheet } from './xlsx';

export const GUIDE_SHEET = 'คำอธิบาย (Guide)';
const RATE_HEAD = 'ทุนตั้งแต่ / SI from';

/** Key fields in the order they appear at the top of each sheet. */
const FIELDS = [
  ['id', 'รหัสแพ็กเกจ / Product ID'],
  ['type', 'ชั้น / Class (T1 T2P T3P T2 T3 CMI)'],
  ['nameTh', 'ชื่อ (TH)'],
  ['nameEn', 'Name (EN)'],
  ['self', 'เปิดขายลูกค้า / Customer site (Y/N)'],
  ['partner', 'เปิดขาย Partner (Y/N)'],
  ['saleUntil', 'ขายได้ถึง / On sale until (YYYY-MM-DD)'],
  ['maxAge', 'อายุรถสูงสุด (ปี) / Max car age'],
  ['commission', 'ค่าคอมพิเศษ % (ว่าง = มาตรฐาน) / Special commission %'],
  ['ver', 'เวอร์ชันตอน Export / Exported version'],
] as const;
type FieldKey = (typeof FIELDS)[number][0];

const yn = (b: boolean) => (b ? 'Y' : 'N');

export function productsToSheets(products: Product[]): Sheet[] {
  const guide: Sheet = {
    name: GUIDE_SHEET,
    widths: [110],
    rows: [
      ['วิธีใช้ไฟล์นี้ / How to use this file'],
      ['1. แต่ละชีตคือ 1 แพ็กเกจ ชื่อชีตไม่สำคัญ ระบบใช้ "รหัสแพ็กเกจ" ในเซลล์ B1'],
      ['2. แก้ค่าในคอลัมน์ B ด้านบน และตารางเบี้ยด้านล่างได้ ห้ามแก้ข้อความในคอลัมน์ A'],
      ['3. ตารางเบี้ย: 1 แถว = 1 ช่วงทุน ใส่เบี้ยรวมภาษีแยกตามรหัสรถ ช่องว่าง = ไม่รับรหัสรถนั้นในช่วงทุนนี้ ช่วงทุนห้ามทับกัน'],
      ['4. เพิ่มแพ็กเกจใหม่: คัดลอกชีต แล้วเปลี่ยนรหัสแพ็กเกจเป็นรหัสใหม่ (ความคุ้มครองจะเริ่มจากมาตรฐานของชั้นนั้น และยังปิดขายจนกว่าจะเปิด)'],
      ['5. นำเข้าที่หลังบ้าน > ผลิตภัณฑ์ > Import Excel ระบบจะแสดงสรุปความต่างให้ตรวจก่อนยืนยัน ทุกแพ็กเกจที่เปลี่ยนจะได้เวอร์ชันใหม่'],
      [''],
      ['1. One sheet per product; the product ID in cell B1 is what counts, not the sheet name.'],
      ['2. Edit column B at the top and the rate table below; do not change the labels in column A.'],
      ['3. Rate table: one row per sum-insured band, gross premium per vehicle code. Blank = not offered for that code. Bands must not overlap.'],
      ['4. New product: copy a sheet and give it a new product ID (it starts with the standard cover of its class, closed for sale).'],
      ['5. Import in Back office > Products > Import Excel. You review the differences before anything changes; each changed product gets a new version.'],
    ],
  };
  const sheets = products
    .filter((p) => !p.archived)
    .map((p): Sheet => {
      const val: Record<FieldKey, Cell> = {
        id: p.id,
        type: p.type,
        nameTh: p.nameTh,
        nameEn: p.nameEn,
        self: yn(p.channels.self),
        partner: yn(p.channels.partner),
        saleUntil: p.saleUntil ?? '',
        maxAge: p.maxAge ?? '',
        commission: p.commission ?? '',
        ver: p.ver,
      };
      return {
        name: p.id,
        widths: [52, 16, 12, 12, 12],
        rows: [
          ...FIELDS.map(([k, label]) => [label, val[k]]),
          [],
          [RATE_HEAD, 'ทุนถึง / SI to', ...CATALOGUE_CODES],
          ...p.rates.map((r) => [r.siFrom, r.siTo, ...CATALOGUE_CODES.map((c) => r.prices[c] ?? null)]),
        ],
      };
    });
  const used = new Set<string>();
  for (const s of sheets) {
    let n = safeSheetName(s.name);
    for (let i = 2; used.has(n); i++) n = safeSheetName(`${s.name.slice(0, 27)} (${i})`);
    used.add(n);
    s.name = n;
  }
  return [guide, ...sheets];
}

export type IssueCode =
  | 'noId'
  | 'badType'
  | 'typeChanged'
  | 'badYN'
  | 'badDate'
  | 'badAge'
  | 'badCommission'
  | 'noRates'
  | 'badNumber'
  | 'badBand'
  | 'overlap'
  | 'dupId'
  | 'noName';

export interface Issue {
  code: IssueCode;
  row?: number;
  col?: string;
}

export interface RateDiff {
  added: number;
  removed: number;
  changed: { band: string; code: UsageCode; from?: number; to?: number }[];
}

export interface ImportItem {
  sheet: string;
  id: string;
  kind: 'new' | 'changed' | 'same' | 'error';
  product?: Product;
  /** Product fields that change (keys of Product), not counting the rate table. */
  fields: string[];
  rates: RateDiff;
  errors: Issue[];
  /** File exported from an older version than the one saved now. */
  stale?: { file: number; now: number };
}

const str = (c: Cell | undefined) => (c === null || c === undefined ? '' : String(c).trim());
/** Excel stores typed dates as serial day numbers. */
const asDate = (c: Cell | undefined): string | null | undefined => {
  if (c === null || c === undefined || c === '') return null;
  if (typeof c === 'number') return new Date(Math.round((c - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(c).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
};
const asNum = (c: Cell | undefined): number | null | undefined => {
  if (c === null || c === undefined || c === '') return null;
  const n = typeof c === 'number' ? c : Number(String(c).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const bandLabel = (r: RateRow) => `${r.siFrom.toLocaleString('en-US')}–${r.siTo >= SI_TOP ? '∞' : r.siTo.toLocaleString('en-US')}`;

function diffRates(a: RateRow[], b: RateRow[]): RateDiff {
  const key = (r: RateRow) => `${r.siFrom}-${r.siTo}`;
  const am = new Map(a.map((r) => [key(r), r]));
  const bm = new Map(b.map((r) => [key(r), r]));
  const changed: RateDiff['changed'] = [];
  for (const [k, r] of bm) {
    const o = am.get(k);
    if (!o) continue;
    for (const c of CATALOGUE_CODES) if (o.prices[c] !== r.prices[c]) changed.push({ band: bandLabel(r), code: c, from: o.prices[c], to: r.prices[c] });
  }
  return { added: [...bm.keys()].filter((k) => !am.has(k)).length, removed: [...am.keys()].filter((k) => !bm.has(k)).length, changed };
}

/** Read the edited sheets against the current catalogue: what would change, and what is wrong. */
export function planImport(sheets: Sheet[], current: Product[], by: string): ImportItem[] {
  const items: ImportItem[] = [];
  const seen = new Set<string>();
  for (const sh of sheets) {
    if (sh.name === GUIDE_SHEET || !sh.rows.length) continue;
    const errors: Issue[] = [];
    const get = (k: FieldKey) => {
      const label = FIELDS.find(([f]) => f === k)![1];
      return sh.rows.find((r) => str(r?.[0]) === label)?.[1];
    };
    const id = str(get('id'));
    if (!id) {
      errors.push({ code: 'noId', row: 1 });
      items.push({ sheet: sh.name, id: '', kind: 'error', fields: [], rates: { added: 0, removed: 0, changed: [] }, errors });
      continue;
    }
    if (seen.has(id)) errors.push({ code: 'dupId', row: 1 });
    seen.add(id);
    const prev = current.find((p) => p.id === id);
    const type = str(get('type')) as CoverageType;
    if (!COVERAGE_TYPES.includes(type)) errors.push({ code: 'badType', row: 2 });
    else if (prev && prev.type !== type) errors.push({ code: 'typeChanged', row: 2 });
    const base: Product = prev ? structuredClone(prev) : blankProduct(COVERAGE_TYPES.includes(type) ? type : 'T1', id, by);
    const next: Product = { ...base, id };
    next.nameTh = str(get('nameTh'));
    next.nameEn = str(get('nameEn'));
    if (!next.nameTh) errors.push({ code: 'noName', row: 3 });
    const flag = (k: 'self' | 'partner', row: number) => {
      const v = str(get(k)).toUpperCase();
      if (v !== 'Y' && v !== 'N') errors.push({ code: 'badYN', row });
      return v === 'Y';
    };
    next.channels = { self: flag('self', 5), partner: flag('partner', 6) };
    const until = asDate(get('saleUntil'));
    if (until === undefined) errors.push({ code: 'badDate', row: 7 });
    else next.saleUntil = until ?? undefined;
    const age = asNum(get('maxAge'));
    if (age === undefined || (age !== null && (age < 0 || age > 50 || !Number.isInteger(age)))) errors.push({ code: 'badAge', row: 8 });
    else next.maxAge = age ?? undefined;
    const com = asNum(get('commission'));
    if (com === undefined || (com !== null && (com < 0 || com > 50))) errors.push({ code: 'badCommission', row: 9 });
    else next.commission = com ?? undefined;

    const head = sh.rows.findIndex((r) => str(r?.[0]) === RATE_HEAD);
    const rates: RateRow[] = [];
    if (head >= 0) {
      const codes = (sh.rows[head] ?? []).slice(2).map((c) => str(c) as UsageCode);
      for (let i = head + 1; i < sh.rows.length; i++) {
        const r = sh.rows[i] ?? [];
        if (r.every((c) => str(c) === '')) continue;
        const from = asNum(r[0]);
        const to = asNum(r[1]);
        if (from == null || to == null || from < 0) {
          errors.push({ code: 'badNumber', row: i + 1, col: from == null ? 'A' : 'B' });
          continue;
        }
        if (to < from) errors.push({ code: 'badBand', row: i + 1 });
        const prices: RateRow['prices'] = {};
        codes.forEach((code, j) => {
          if (!CATALOGUE_CODES.includes(code)) return;
          const v = asNum(r[j + 2]);
          if (v === undefined || (v !== null && v < 0)) errors.push({ code: 'badNumber', row: i + 1, col: String.fromCharCode(67 + j) });
          else if (v !== null) prices[code] = v;
        });
        rates.push({ siFrom: from, siTo: to, prices });
      }
    }
    if (!rates.length) errors.push({ code: 'noRates', row: head >= 0 ? head + 2 : undefined });
    rates.sort((a, b) => a.siFrom - b.siFrom);
    for (let i = 1; i < rates.length; i++) if (rates[i].siFrom <= rates[i - 1].siTo) errors.push({ code: 'overlap', row: head + 2 + i });
    next.rates = rates;

    const fileVer = asNum(get('ver'));
    const stale = prev && typeof fileVer === 'number' && fileVer < prev.ver ? { file: fileVer, now: prev.ver } : undefined;
    const fields = prev
      ? (['nameTh', 'nameEn', 'channels', 'saleUntil', 'maxAge', 'commission'] as const).filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]))
      : [];
    const rd = prev ? diffRates(prev.rates, rates) : { added: rates.length, removed: 0, changed: [] };
    const kind: ImportItem['kind'] = errors.length ? 'error' : !prev ? 'new' : fields.length || rd.added || rd.removed || rd.changed.length ? 'changed' : 'same';
    items.push({ sheet: sh.name, id, kind, product: errors.length ? undefined : next, fields: [...fields], rates: rd, errors, stale });
  }
  return items;
}
