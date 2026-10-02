import { toThaiLunar, type ThaiLunarDate } from "./thai-lunar";
import { DAY_NAMES, HOUSES, PLANETS, THAI_MONTH_NAMES, TOPICS } from "./meanings";

export interface SevenInput {
  /** ค.ศ. */
  year: number;
  month: number;
  day: number;
  /** เวลาเกิด "HH:MM" (ไม่บังคับ) */
  time?: string;
}

export interface SevenCell {
  value: number;
  house: string;
  meaning: string;
  negative: boolean;
}

export interface SevenResult {
  input: SevenInput;
  /** เลขวันแบบไทย อาทิตย์ = 1 … เสาร์ = 7 */
  dayNumber: number;
  dayName: string;
  /** เกิดวันพุธหลัง 18:00 (พุธกลางคืน/ราหู) */
  isRahu: boolean;
  /** เกิดก่อน 06:00 จึงนับเป็นวันก่อนหน้าตามหลักโหราศาสตร์ไทย */
  shiftedToPreviousDay: boolean;
  lunar: ThaiLunarDate;
  monthName: string;
  /** แถว 1–3 แถวละ 7 ช่อง */
  rows: SevenCell[][];
  /** แถว 4: ผลรวมของแต่ละหลัก (ฐานกำลัง) */
  sums: number[];
}

/** เลข 1–12 ลดให้อยู่ในช่วง 1–7 */
const toSeven = (n: number) => ((n - 1) % 7) + 1;

function parseTime(time?: string): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isValidDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function calculateSeven(input: SevenInput): SevenResult {
  const { year, month, day } = input;
  if (!isValidDate(year, month, day) || year < 1900 || year > 2100) {
    throw new RangeError("วันเกิดไม่ถูกต้อง (รองรับ ค.ศ. 1900–2100)");
  }

  // วันทางโหราศาสตร์ไทยเริ่มเมื่อพระอาทิตย์ขึ้น (ถือ 06:00) เกิดก่อนหน้านั้นนับเป็นวันก่อน
  const minutes = parseTime(input.time);
  const shiftedToPreviousDay = minutes !== null && minutes < 6 * 60;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (shiftedToPreviousDay) date.setUTCDate(date.getUTCDate() - 1);

  const dayNumber = date.getUTCDay() + 1;
  const isRahu = dayNumber === 4 && minutes !== null && minutes >= 18 * 60;
  const lunar = toThaiLunar(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

  const starts = [dayNumber, toSeven(lunar.month), toSeven(lunar.naksatr)];
  const rows = starts.map((start, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const h = HOUSES[r][c];
      return { value: toSeven(start + c), house: h.name, meaning: h.meaning, negative: !!h.negative };
    }),
  );
  const sums = Array.from({ length: 7 }, (_, c) => rows.reduce((s, row) => s + row[c].value, 0));

  return {
    input,
    dayNumber,
    dayName: isRahu ? "พุธกลางคืน (ราหู)" : DAY_NAMES[dayNumber],
    isRahu,
    shiftedToPreviousDay,
    lunar,
    monthName: lunar.isSecondEighth ? "เดือน 8-8 (8 หลัง)" : THAI_MONTH_NAMES[lunar.month],
    rows,
    sums,
  };
}

export type Level = "สูง" | "กลาง" | "ต่ำ";

/** ผลรวมของหลัก (3–21) แบ่งเป็นระดับ */
export function sumLevel(sum: number): Level {
  if (sum >= 14) return "สูง";
  if (sum >= 9) return "กลาง";
  return "ต่ำ";
}

export interface Reading {
  heading: string;
  body: string;
}

function columnText(result: SevenResult, c: number): string {
  const level = sumLevel(result.sums[c]);
  const houses = result.rows.map((row) => row[c]);
  const good = houses.filter((h) => !h.negative).map((h) => h.house);
  const bad = houses.filter((h) => h.negative).map((h) => h.house);
  const parts: string[] = [];
  if (good.length) {
    parts.push(
      level === "สูง"
        ? `เรื่อง${good.join("/")}เป็นจุดแข็ง ได้รับการหนุนดี`
        : level === "ต่ำ"
          ? `เรื่อง${good.join("/")}ต้องออกแรงมากกว่าคนอื่น`
          : `เรื่อง${good.join("/")}อยู่ในเกณฑ์พอดี`,
    );
  }
  if (bad.length) {
    parts.push(
      level === "สูง"
        ? `แต่ด้าน${bad.join("/")}มีบทบาทมาก ควรระวัง`
        : level === "ต่ำ"
          ? `ด้าน${bad.join("/")}เบาบาง เป็นผลดี`
          : `ด้าน${bad.join("/")}มีบ้างพอประมาณ`,
    );
  }
  return parts.join(" ");
}

/** สร้างคำทำนายจากผลคำนวณ โดยใช้กฎและข้อความที่เขียนไว้ล่วงหน้า (ไม่ใช้ AI) */
export function interpretSeven(result: SevenResult): Reading[] {
  const readings: Reading[] = [];
  const self = PLANETS[result.dayNumber];
  readings.push({
    heading: "ภาพรวม",
    body:
      `คุณเกิดวัน${result.dayName} ${result.lunar.phase} ${result.lunar.kham} ค่ำ ${result.monthName} ปี${result.lunar.naksatrName} ` +
      `ดาวประจำตัวคือดาว${self.name}: ${self.trait}`,
  });

  for (const topic of TOPICS) {
    const lines = topic.houses.map(([r, c]) => {
      const cell = result.rows[r][c];
      const planet = PLANETS[cell.value];
      return `ภพ${cell.house} (${cell.meaning}) มีดาว${planet.name} (${cell.value}) สถิต: ${planet.trait}`;
    });
    const cols = [...new Set(topic.houses.map(([, c]) => c))];
    const strength = cols.map((c) => columnText(result, c)).join(" ");
    readings.push({ heading: topic.title, body: `${lines.join(" · ")} — ${strength}` });
  }

  const ranked = result.sums.map((s, c) => ({ s, c })).sort((a, b) => b.s - a.s);
  const best = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const name = (c: number) => result.rows.map((row) => row[c].house).join("-");
  readings.push({
    heading: "หลักที่เด่นและหลักที่อ่อน",
    body:
      `หลักที่มีกำลังมากที่สุดคือ ${name(best.c)} (ผลรวม ${best.s}): ${columnText(result, best.c)} ` +
      `ส่วนหลักที่กำลังน้อยที่สุดคือ ${name(weakest.c)} (ผลรวม ${weakest.s}): ${columnText(result, weakest.c)}`,
  });
  return readings;
}
