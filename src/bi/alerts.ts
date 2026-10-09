// Exception engine: turns red/amber signals from every lens into a ranked action list.
import { CHANNELS, PRODUCTS, REGIONS, UNITS, groupAgg, periodMonths, rag, ragLower, ratios, select, type Filters, type Rag } from './data';
import { CLAIM_PROCS, UW_PROCS, type ItemState } from './ops';
import { CHANNEL_NAME, PROC_NAME, PRODUCT_NAME, REGION_NAME, fmtPct, type Lang } from './lang';
import { opsFiltered, procStats } from './views/Operational';
import type { View } from './shared';

export interface Alert {
  id: string;
  sev: Exclude<Rag, 'good'>;
  view: View;
  title: string;
  detail: string;
  action: string;
  patch?: Partial<Filters>;
  focus?: string;
}

export function computeAlerts(flt: Filters, ops: ItemState[], now: number, lang: Lang): Alert[] {
  const T = (th: string, en: string) => (lang === 'th' ? th : en);
  const n = (pair: [string, string]) => (lang === 'th' ? pair[0] : pair[1]);
  const out: Alert[] = [];
  const months = periodMonths(flt.asOf, flt.mode);
  const rows = select(months, flt);

  // Lens 1 – product growth vs target
  for (const [p, a] of groupAgg(rows, (f) => f.p)) {
    const r = ratios(a);
    const g = rag(r.ach);
    if (g !== 'good') out.push({
      id: `gwp-${p}`, sev: g, view: 'strategic',
      title: T(`GWP ${n(PRODUCT_NAME[p])} ต่ำกว่าเป้า`, `${n(PRODUCT_NAME[p])} GWP below target`),
      detail: T(`ทำได้ ${fmtPct(r.ach, lang, 0)} ของเป้า`, `${fmtPct(r.ach, lang, 0)} of target`),
      action: T('ทบทวนแผนขายและแคมเปญของสายนี้กับฝ่ายขาย', 'Review sales plan and campaigns for this line with Sales'),
      patch: { product: p },
    });
  }
  // Lens 4 – loss-ratio hot spots by product × region
  const hot = [...groupAgg(rows, (f) => `${f.p}|${f.rg}`)].map(([k, a]) => ({ k, a, r: ratios(a) }))
    .filter((x) => x.a.nep > 5 && ragLower(x.r.lr, x.r.lrPlan) !== 'good')
    .sort((x, y) => (y.r.lr - y.r.lrPlan) - (x.r.lr - x.r.lrPlan)).slice(0, 4);
  for (const x of hot) {
    const [p, rg] = x.k.split('|') as [(typeof PRODUCTS)[number], (typeof REGIONS)[number]];
    out.push({
      id: `lr-${x.k}`, sev: ragLower(x.r.lr, x.r.lrPlan) as Alert['sev'], view: 'analytical', focus: 'heat',
      title: T(`Loss Ratio สูง: ${n(PRODUCT_NAME[p])} · ${n(REGION_NAME[rg])}`, `High loss ratio: ${n(PRODUCT_NAME[p])} · ${n(REGION_NAME[rg])}`),
      detail: T(`${fmtPct(x.r.lr, lang, 0)} เทียบแผน ${fmtPct(x.r.lrPlan, lang, 0)}`, `${fmtPct(x.r.lr, lang, 0)} vs plan ${fmtPct(x.r.lrPlan, lang, 0)}`),
      action: p === 'health'
        ? T('ตรวจเคลมรายใหญ่และทบทวนอัตราเบี้ยตอนต่ออายุ', 'Audit large claims and reprice at renewal')
        : T('ตรวจสอบเหตุการณ์ภัยพิบัติ/เคลมก้อนใหญ่ และพิจารณาปรับเกณฑ์รับประกันในพื้นที่', 'Check catastrophe events / large losses and tighten underwriting in the area'),
      patch: { product: p, region: rg },
    });
  }
  // Lens 3 – sales units far behind target and channel notice SLA
  for (const [u, a] of groupAgg(rows, (f) => f.u)) {
    const r = ratios(a);
    if (rag(r.achNb) === 'bad') out.push({
      id: `unit-${u}`, sev: 'bad', view: 'tactical',
      title: T(`${UNITS[u].th} ยอดงานใหม่ต่ำกว่าเป้า`, `${UNITS[u].en} new business behind target`),
      detail: T(`ทำได้ ${fmtPct(r.achNb, lang, 0)} ของเป้า`, `${fmtPct(r.achNb, lang, 0)} of target`),
      action: T('นัดคุยแผนรายสัปดาห์ เพิ่ม Lead และโค้ชทีมขาย', 'Weekly pipeline review, add leads, coach the team'),
      patch: { channel: UNITS[u].ch },
    });
  }
  for (const c of CHANNELS) {
    const a = groupAgg(rows.filter((f) => f.ch === c), () => 0).get(0);
    if (!a) continue;
    const r = ratios(a);
    const g = rag(r.n60 / 0.95);
    if (g !== 'good') out.push({
      id: `notice-${c}`, sev: g, view: 'tactical',
      title: T(`แจ้งต่ออายุล่วงหน้าไม่ถึง SLA: ${n(CHANNEL_NAME[c])}`, `Renewal notice below SLA: ${n(CHANNEL_NAME[c])}`),
      detail: T(`แจ้ง ≥60 วัน ${fmtPct(r.n60, lang, 0)} (เป้า 95%)`, `Noticed ≥60 days: ${fmtPct(r.n60, lang, 0)} (goal 95%)`),
      action: T('ตั้งระบบส่งใบแจ้งอัตโนมัติ และติดตามรายชื่อที่ยังไม่แจ้ง', 'Automate notices and chase the un-noticed list'),
      patch: { channel: c },
    });
  }
  // Lens 2 – operations, last 7 days
  const from = now - 7 * 86400000;
  for (const p of [...UW_PROCS, ...CLAIM_PROCS]) {
    const st = procStats(opsFiltered(ops, flt.product, flt.channel), p, from);
    const met = st.closed ? st.met / st.closed : 1;
    const g = rag(met);
    if (g !== 'good' || st.over > 0) out.push({
      id: `ops-${p}`, sev: g === 'bad' || st.over >= 10 ? 'bad' : 'warn', view: 'operational', focus: p,
      title: st.over > 0
        ? T(`${n(PROC_NAME[p])}: ${st.over} งานเกิน SLA`, `${n(PROC_NAME[p])}: ${st.over} items overdue`)
        : T(`${n(PROC_NAME[p])}: งานตาม SLA ต่ำกว่า 95%`, `${n(PROC_NAME[p])}: below 95% within SLA`),
      detail: T(`ตาม SLA ${fmtPct(met, lang, 0)} (7 วัน)`, `${fmtPct(met, lang, 0)} within SLA (7 days)`),
      action: T('กระจายงานค้างให้เจ้าหน้าที่ที่ว่าง และเร่งรายการที่เกินก่อน', 'Rebalance the queue and clear overdue items first'),
    });
  }
  const order = { bad: 0, warn: 1 };
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}
