// Simulated transaction-level work items for the operational lens (Underwriting + Claim).
// Items are generated relative to page-load time; open/closed and overdue state is derived
// from "now", so the board keeps moving while it stays open.
import { CHANNELS, rng, type Channel, type Product } from './data';

export type Team = 'uw' | 'claim';
export type Proc = 'quote' | 'issue' | 'endorse' | 'survey' | 'approve' | 'settle';
export const UW_PROCS: Proc[] = ['quote', 'issue', 'endorse'];
export const CLAIM_PROCS: Proc[] = ['survey', 'approve', 'settle'];
export const TEAM_OF: Record<Proc, Team> = { quote: 'uw', issue: 'uw', endorse: 'uw', survey: 'claim', approve: 'claim', settle: 'claim' };
/** 'work' = business minutes (Mon–Fri 08:30–17:30), 'cal' = elapsed clock minutes. */
export const CLOCK: Record<Proc, 'work' | 'cal'> = { quote: 'work', issue: 'work', endorse: 'work', survey: 'cal', approve: 'work', settle: 'cal' };
const WORK_DAY = 540;
/** SLA target in minutes of that process's clock. */
export function slaTarget(proc: Proc, p: Product): number {
  const motor = p === 'motor';
  switch (proc) {
    case 'quote': return motor ? 120 : 2 * WORK_DAY;
    case 'issue': return WORK_DAY;
    case 'endorse': return 2 * WORK_DAY;
    case 'survey': return motor ? 45 : 24 * 60;
    case 'approve': return motor ? WORK_DAY : 5 * WORK_DAY;
    case 'settle': return 15 * 24 * 60;
  }
}

export interface Staff { id: string; team: Team; th: string; en: string; speed: number; hit: number }
export const STAFF: Staff[] = [
  { id: 'U1', team: 'uw', th: 'กมลวรรณ ศรีสุข', en: 'Kamonwan S.', speed: 0.85, hit: 1.1 },
  { id: 'U2', team: 'uw', th: 'ธนพล วงศ์ใหญ่', en: 'Thanapon W.', speed: 0.95, hit: 1.0 },
  { id: 'U3', team: 'uw', th: 'ปิยะนุช แก้วมณี', en: 'Piyanuch K.', speed: 1.0, hit: 1.05 },
  { id: 'U4', team: 'uw', th: 'วีรยุทธ ทองดี', en: 'Weerayut T.', speed: 1.32, hit: 0.85 },
  { id: 'U5', team: 'uw', th: 'สุภาวดี ใจงาม', en: 'Supawadee J.', speed: 0.9, hit: 0.95 },
  { id: 'U6', team: 'uw', th: 'อนุชา เพชรรัตน์', en: 'Anucha P.', speed: 1.12, hit: 0.9 },
  { id: 'U7', team: 'uw', th: 'ณัฐธิดา บุญมา', en: 'Nattida B.', speed: 0.92, hit: 1.15 },
  { id: 'U8', team: 'uw', th: 'ศุภชัย มั่นคง', en: 'Supachai M.', speed: 1.05, hit: 1.0 },
  { id: 'C1', team: 'claim', th: 'จิราพร สายทอง', en: 'Jiraporn S.', speed: 0.88, hit: 1 },
  { id: 'C2', team: 'claim', th: 'ประเสริฐ นาคดี', en: 'Prasert N.', speed: 1.0, hit: 1 },
  { id: 'C3', team: 'claim', th: 'มณีรัตน์ ชัยมงคล', en: 'Maneerat C.', speed: 0.93, hit: 1 },
  { id: 'C4', team: 'claim', th: 'สมศักดิ์ รุ่งเรือง', en: 'Somsak R.', speed: 1.38, hit: 1 },
  { id: 'C5', team: 'claim', th: 'อรอุมา พูลสวัสดิ์', en: 'Ornuma P.', speed: 0.97, hit: 1 },
  { id: 'C6', team: 'claim', th: 'ชยพล ศรีวงศ์', en: 'Chayapol S.', speed: 1.15, hit: 1 },
  { id: 'C7', team: 'claim', th: 'พรทิพย์ อินทร์แก้ว', en: 'Porntip I.', speed: 0.9, hit: 1 },
  { id: 'C8', team: 'claim', th: 'เกียรติศักดิ์ ดวงดี', en: 'Kiattisak D.', speed: 1.02, hit: 1 },
];
export const staffById = new Map(STAFF.map((s) => [s.id, s]));

export interface Item {
  id: string;
  proc: Proc;
  p: Product;
  ch: Channel;
  staff: string;
  /** absolute ms */
  created: number;
  /** minutes (process clock) the job takes / took */
  duration: number;
  target: number;
  /** quotation converted to a policy */
  hit: boolean;
}

const DAY = 86400000;
const PER_DAY: Record<Proc, number> = { quote: 110, issue: 85, endorse: 34, survey: 92, approve: 68, settle: 52 };
const MEDIAN: Record<Proc, number> = { quote: 0.5, issue: 0.48, endorse: 0.63, survey: 0.55, approve: 0.57, settle: 0.6 };
const WINDOW: Record<Proc, number> = { quote: 31, issue: 31, endorse: 31, survey: 31, approve: 35, settle: 50 };
const PMIX: [Product, number][] = [['motor', 0.62], ['fire', 0.1], ['marine', 0.04], ['health', 0.16], ['misc', 0.08]];

function bkk(ms: number) {
  const d = new Date(ms + 7 * 3600000);
  return { dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
/** Business minutes between two instants (Mon–Fri 08:30–17:30 Bangkok, no holidays). */
export function workMinutes(from: number, to: number): number {
  if (to <= from) return 0;
  let total = 0;
  const dayStart = (ms: number) => ms - (bkk(ms).min * 60000) - (new Date(ms).getUTCSeconds() * 1000 + new Date(ms).getUTCMilliseconds());
  for (let d = dayStart(from); d < to; d += DAY) {
    const { dow } = bkk(d);
    if (dow === 0 || dow === 6) continue;
    const a = Math.max(from, d + 510 * 60000);
    const b = Math.min(to, d + 1050 * 60000);
    if (b > a) total += (b - a) / 60000;
  }
  return total;
}
/** Instant reached after `minutes` business minutes from `from`. */
export function addWorkMinutes(from: number, minutes: number): number {
  let left = minutes;
  let t = from;
  for (let guard = 0; guard < 400; guard++) {
    const { dow, min } = bkk(t);
    const dayStart = t - min * 60000 - (t % 60000);
    if (dow === 0 || dow === 6 || min >= 1050) { t = dayStart + DAY + 510 * 60000; continue; }
    if (min < 510) { t = dayStart + 510 * 60000; continue; }
    const avail = 1050 - min;
    if (left <= avail) return t + left * 60000;
    left -= avail;
    t = dayStart + DAY + 510 * 60000;
  }
  return t;
}
export function elapsed(it: Item, now: number) {
  return CLOCK[it.proc] === 'cal' ? Math.max(0, (now - it.created) / 60000) : workMinutes(it.created, now);
}

export function buildItems(anchor: number): Item[] {
  const r = rng(4242);
  const nrm = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const pick = (): Product => {
    let x = r();
    for (const [p, w] of PMIX) if ((x -= w) <= 0) return p;
    return 'motor';
  };
  const out: Item[] = [];
  let seq = 1000;
  for (const proc of [...UW_PROCS, ...CLAIM_PROCS]) {
    const team = proc === 'quote' || proc === 'issue' || proc === 'endorse' ? 'uw' : 'claim';
    const staff = STAFF.filter((s) => s.team === team);
    for (let back = WINDOW[proc]; back >= 0; back--) {
      const day = anchor - back * DAY;
      const { dow } = bkk(day);
      const weekend = dow === 0 || dow === 6;
      if (weekend && team === 'uw') continue;
      const n = Math.round(PER_DAY[proc] * (weekend ? 0.35 : 1) * (0.85 + r() * 0.3));
      for (let i = 0; i < n; i++) {
        const p = proc === 'survey' ? (r() < 0.86 ? 'motor' : pick()) : pick();
        const st = staff[Math.floor(r() * staff.length)];
        // office hours for business-clock work, round the clock for accident reports
        const minute = CLOCK[proc] === 'work' || proc === 'settle' ? 510 + r() * 540 : r() * 1440;
        const created = day - bkk(day).min * 60000 + minute * 60000;
        if (created > anchor) continue;
        const target = slaTarget(proc, p);
        const weak = (proc === 'settle' && p !== 'motor' ? 1.25 : 1) * (proc === 'endorse' && p === 'fire' ? 1.2 : 1);
        const duration = Math.max(3, target * MEDIAN[proc] * st.speed * weak * Math.exp(0.5 * nrm()));
        const ch = CHANNELS[Math.floor(r() * CHANNELS.length)];
        const hit = proc === 'quote' && r() < (p === 'motor' ? 0.46 : 0.31) * st.hit;
        out.push({ id: `${proc === 'quote' ? 'Q' : proc === 'issue' ? 'P' : proc === 'endorse' ? 'E' : proc === 'survey' ? 'S' : proc === 'approve' ? 'A' : 'L'}-${seq++}`, proc, p, ch, staff: st.id, created, duration, target, hit });
      }
    }
  }
  return out;
}

export interface ItemState { it: Item; el: number; open: boolean; over: boolean; closedAt?: number }
/** Resolve each item's state at `now`. */
export function resolve(items: Item[], now: number): ItemState[] {
  return items.map((it) => {
    const el = elapsed(it, now);
    const open = it.duration > el;
    const closedAt = open ? undefined : CLOCK[it.proc] === 'cal' ? it.created + it.duration * 60000 : addWorkMinutes(it.created, it.duration);
    return { it, el, open, over: open ? el > it.target : it.duration > it.target, closedAt };
  });
}

