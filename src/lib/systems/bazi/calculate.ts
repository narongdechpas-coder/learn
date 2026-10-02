import { Solar, type EightChar } from "lunar-typescript";
import {
  BRANCHES, CONTROLLED_BY, CONTROLS, DAY_MASTER_TEXT, ELEMENTS, ELEMENT_INFO, PRODUCED_BY, PRODUCES, STEMS, TEN_GODS,
  type BranchInfo, type Element, type StemInfo,
} from "./names";

export type Gender = "male" | "female";

export interface BaziInput {
  /** ค.ศ. */
  year: number;
  month: number;
  day: number;
  /** เวลาเกิดตามนาฬิกาไทย "HH:MM" (ไม่บังคับ ถ้าไม่ใส่จะไม่มีเสาชั่วโมง) */
  time?: string;
  /** ใช้คำนวณวัยจร (大运) ถ้าไม่ใส่จะไม่แสดงวัยจร */
  gender?: Gender;
}

export interface HiddenStem {
  gan: string;
  stem: StemInfo;
  tenGod: string;
}

export interface Pillar {
  key: "hour" | "day" | "month" | "year";
  label: string;
  gan: string;
  zhi: string;
  stem: StemInfo;
  branch: BranchInfo;
  /** เทพทั้งสิบของก้านฟ้า (เสาวันเป็น "日主" คือตัวเรา) */
  tenGod: string;
  hidden: HiddenStem[];
  nayin: string;
}

export interface LuckPillar {
  ganZhi: string;
  startYear: number;
  endYear: number;
  /** อายุ (ปีเต็ม) ตอนเริ่มวัยจรนี้ */
  startAge: number;
  stemElement: Element;
  favorable: boolean;
  current: boolean;
}

export interface BaziResult {
  input: BaziInput;
  /** เรียงแบบดั้งเดิม: ชั่วโมง วัน เดือน ปี (ไม่มีเสาชั่วโมงถ้าไม่ใส่เวลา) */
  pillars: Pillar[];
  dayMaster: { gan: string; stem: StemInfo };
  elementCounts: Record<Element, number>;
  strong: boolean;
  /** สัดส่วนกำลังสนับสนุนธาตุประจำตัว 0–1 */
  supportRatio: number;
  favorable: Element[];
  unfavorable: Element[];
  luck: LuckPillar[] | null;
}

// วันเปลี่ยนสารท (節氣) อิงเวลาปักกิ่ง UTC+8 ซึ่งเร็วกว่าไทย 1 ชั่วโมง
const BEIJING_OFFSET_MIN = 60;
// เวลาสุริยะท้องถิ่นของกรุงเทพฯ (ลองจิจูด 100.5°E) ช้ากว่าเวลามาตรฐานไทย (105°E) ราว 18 นาที
const SOLAR_OFFSET_MIN = -18;

function parseTime(time?: string): { h: number; m: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

export function isValidDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function eightCharAt(base: number, offsetMin: number): EightChar {
  const d = new Date(base + offsetMin * 60_000);
  return Solar.fromYmdHms(
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0,
  ).getLunar().getEightChar();
}

/** เทพทั้งสิบของธาตุ `target` เมื่อเทียบกับธาตุประจำตัว `dm` */
export function tenGodOf(dm: StemInfo, target: StemInfo): string {
  const same = dm.yang === target.yang;
  if (target.element === dm.element) return same ? "比肩" : "劫财";
  if (PRODUCES[dm.element] === target.element) return same ? "食神" : "伤官";
  if (CONTROLS[dm.element] === target.element) return same ? "偏财" : "正财";
  if (CONTROLLED_BY[dm.element] === target.element) return same ? "七杀" : "正官";
  return same ? "偏印" : "正印";
}

export function calculateBazi(input: BaziInput, now: Date = new Date()): BaziResult {
  const { year, month, day } = input;
  if (!isValidDate(year, month, day) || year < 1900 || year > 2100) {
    throw new RangeError("วันเกิดไม่ถูกต้อง (รองรับ ค.ศ. 1900–2100)");
  }
  const t = parseTime(input.time);
  const base = Date.UTC(year, month - 1, day, t?.h ?? 12, t?.m ?? 0);

  // เสาปีและเสาเดือนขึ้นกับวันเปลี่ยนสารท จึงใช้เวลาปักกิ่ง
  // ส่วนเสาวันและเสาชั่วโมงขึ้นกับตำแหน่งดวงอาทิตย์ จึงใช้เวลาสุริยะท้องถิ่น
  const seasonal = eightCharAt(base, BEIJING_OFFSET_MIN);
  const solar = t ? eightCharAt(base, SOLAR_OFFSET_MIN) : seasonal;

  const dmGan = solar.getDayGan();
  const dm = STEMS[dmGan];

  const raw: { key: Pillar["key"]; label: string; gz: string; hide: string[]; nayin: string }[] = [
    ...(t ? [{ key: "hour" as const, label: "ชั่วโมง", gz: solar.getTime(), hide: solar.getTimeHideGan(), nayin: solar.getTimeNaYin() }] : []),
    { key: "day", label: "วัน", gz: solar.getDay(), hide: solar.getDayHideGan(), nayin: solar.getDayNaYin() },
    { key: "month", label: "เดือน", gz: seasonal.getMonth(), hide: seasonal.getMonthHideGan(), nayin: seasonal.getMonthNaYin() },
    { key: "year", label: "ปี", gz: seasonal.getYear(), hide: seasonal.getYearHideGan(), nayin: seasonal.getYearNaYin() },
  ];

  const pillars: Pillar[] = raw.map(({ key, label, gz, hide, nayin }) => {
    const gan = gz[0];
    const zhi = gz[1];
    return {
      key,
      label,
      gan,
      zhi,
      stem: STEMS[gan],
      branch: BRANCHES[zhi],
      tenGod: key === "day" ? "日主" : tenGodOf(dm, STEMS[gan]),
      hidden: hide.map((h) => ({ gan: h, stem: STEMS[h], tenGod: tenGodOf(dm, STEMS[h]) })),
      nayin,
    };
  });

  const elementCounts = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  for (const p of pillars) {
    elementCounts[p.stem.element]++;
    elementCounts[p.branch.element]++;
  }

  // กำลังของธาตุประจำตัว: นับอักษรที่เป็นธาตุเดียวกันหรือธาตุที่ให้กำเนิด
  // กิ่งดินของเสาเดือน (ฤดูเกิด) มีน้ำหนัก 2 เท่า และไม่นับก้านฟ้าของเสาวันเอง
  const supporters = new Set<Element>([dm.element, PRODUCED_BY[dm.element]]);
  let total = 0;
  let support = 0;
  for (const p of pillars) {
    const chars: [Element, number][] = [[p.branch.element, p.key === "month" ? 2 : 1]];
    if (p.key !== "day") chars.push([p.stem.element, 1]);
    for (const [el, w] of chars) {
      total += w;
      if (supporters.has(el)) support += w;
    }
  }
  const supportRatio = support / total;
  const strong = supportRatio >= 0.5;
  const drain = [PRODUCES[dm.element], CONTROLS[dm.element], CONTROLLED_BY[dm.element]];
  const favorable = strong ? drain : [PRODUCED_BY[dm.element], dm.element];
  const unfavorable = strong ? [PRODUCED_BY[dm.element], dm.element] : drain;

  let luck: LuckPillar[] | null = null;
  if (input.gender) {
    const yun = seasonal.getYun(input.gender === "male" ? 1 : 0);
    const nowYear = now.getFullYear();
    luck = yun
      .getDaYun(9)
      .slice(1)
      .map((d) => {
        const stemElement = STEMS[d.getGanZhi()[0]].element;
        return {
          ganZhi: d.getGanZhi(),
          startYear: d.getStartYear(),
          endYear: d.getEndYear(),
          startAge: d.getStartYear() - year,
          stemElement,
          favorable: favorable.includes(stemElement),
          current: d.getStartYear() <= nowYear && nowYear <= d.getEndYear(),
        };
      });
  }

  return {
    input,
    pillars,
    dayMaster: { gan: dmGan, stem: dm },
    elementCounts,
    strong,
    supportRatio,
    favorable,
    unfavorable,
    luck,
  };
}

export interface Reading {
  heading: string;
  body: string;
}

const el = (e: Element) => `ธาตุ${ELEMENT_INFO[e].th}`;
const list = (es: Element[]) => es.map(el).join(" ");

/** คำทำนายจากกฎที่เขียนไว้ล่วงหน้า (ไม่ใช้ AI) */
export function interpretBazi(r: BaziResult): Reading[] {
  const readings: Reading[] = [];
  const dm = r.dayMaster;

  readings.push({
    heading: "ธาตุประจำตัว",
    body: `คุณคือ ${dm.gan} (${dm.stem.th}) ${DAY_MASTER_TEXT[dm.gan]}`,
  });

  const sorted = [...ELEMENTS].sort((a, b) => r.elementCounts[b] - r.elementCounts[a]);
  const missing = ELEMENTS.filter((e) => r.elementCounts[e] === 0);
  const top = sorted[0];
  readings.push({
    heading: "สมดุลธาตุทั้งห้า",
    body:
      `ในดวงมี${el(top)}มากที่สุด (${r.elementCounts[top]} ตัว) เด่นเรื่อง${ELEMENT_INFO[top].trait} ` +
      (missing.length
        ? `ส่วน${list(missing)}ไม่ปรากฏในดวงเลย ควรเติมด้วยสี ทิศ หรือกิจกรรมของธาตุนั้น`
        : "ดวงมีครบทั้งห้าธาตุ ถือว่ามีพื้นฐานที่สมดุล"),
  });

  const fav = r.favorable;
  readings.push({
    heading: r.strong ? "ดวงธาตุประจำตัวแข็ง" : "ดวงธาตุประจำตัวอ่อน",
    body:
      (r.strong
        ? "ธาตุประจำตัวได้รับการสนับสนุนมาก มีพลัง มั่นใจ พึ่งพาตัวเองได้ ควรระบายพลังออกไปในทางสร้างสรรค์ "
        : "ธาตุประจำตัวได้รับการสนับสนุนน้อย ควรหาแรงหนุนจากผู้ใหญ่ ความรู้ และคนที่ไว้ใจได้ ") +
      `ธาตุที่ส่งเสริมคุณคือ ${list(fav)} สีมงคลได้แก่ ${fav.map((e) => ELEMENT_INFO[e].color).join(" / ")} ` +
      `ทิศที่ดีคือ ${[...new Set(fav.map((e) => ELEMENT_INFO[e].direction))].join(" ")} ` +
      `ส่วนธาตุที่ควรเลี่ยงคือ ${list(r.unfavorable)}`,
  });

  // เทพทั้งสิบที่เด่น: ก้านฟ้าทุกเสา (ยกเว้นเสาวัน) + ชี่หลักของกิ่งดิน
  const gods = new Map<string, number>();
  for (const p of r.pillars) {
    if (p.key !== "day") gods.set(p.tenGod, (gods.get(p.tenGod) ?? 0) + 1);
    const main = p.hidden[0];
    if (main) gods.set(main.tenGod, (gods.get(main.tenGod) ?? 0) + 1);
  }
  const [godTop] = [...gods.entries()].sort((a, b) => b[1] - a[1]);
  if (godTop) {
    const info = TEN_GODS[godTop[0]];
    readings.push({
      heading: "ดาวเด่นในดวง",
      body: `ดาวที่ปรากฏมากที่สุดคือ ${godTop[0]} “${info.th}” (${godTop[1]} ตำแหน่ง): ${info.meaning}`,
    });
  }

  if (r.luck) {
    const cur = r.luck.find((l) => l.current);
    const next = cur ? r.luck[r.luck.indexOf(cur) + 1] : r.luck[0];
    const parts: string[] = [];
    if (cur) {
      parts.push(
        `ตอนนี้อยู่ในวัยจร ${cur.ganZhi} (${cur.startYear}–${cur.endYear}) ก้านฟ้าเป็น${el(cur.stemElement)} ` +
          (cur.favorable ? "ซึ่งส่งเสริมดวง เป็นช่วงที่เหมาะกับการเริ่มต้นและขยายงาน" : "ซึ่งไม่ใช่ธาตุที่ส่งเสริม ควรค่อยเป็นค่อยไปและระวังการเสี่ยง"),
      );
    }
    if (next) {
      parts.push(
        `วัยจรถัดไป ${next.ganZhi} เริ่มปี ${next.startYear} (อายุราว ${next.startAge} ปี) เป็น${el(next.stemElement)} ` +
          (next.favorable ? "เป็นช่วงขาขึ้น" : "ควรเตรียมตัวรับมือ"),
      );
    }
    readings.push({ heading: "วัยจร (10 ปี)", body: parts.join(" ") });
  }
  return readings;
}
