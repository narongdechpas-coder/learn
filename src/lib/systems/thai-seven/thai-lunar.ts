// Thai lunar calendar (ปฏิทินจันทรคติไทย) conversion.
//
// Ported from github.com/KranaxALT/thailunar (MIT), itself a port of pythaidate
// by Mark Hollow (MIT). The algorithm follows the classical สุริยยาตร texts:
// หรคุณ (horakhun), กัมมัชพล (kammacapon), อวมาน (avoman) and ดิถี (tithi).

const DAYS_IN_800_YEARS = 292207;
const TIME_UNITS_IN_ONE_DAY = 800;
const EPOCH_OFFSET = 373;
// Julian Day Number of day 1 of จ.ศ. 0.
const CS_JULIAN_DAY_OFFSET = 1954167;

export const NAKSATR_NAMES = [
  "", "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
] as const;

// Slot → lunar month. The year starts at month 5; 88 is the second month 8.
const LUNAR_MONTHS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 8, 88, 5, 6];

type CalType = "A" | "B" | "C" | "c";

/** Integer division truncating toward zero, like Go's `/` on ints. */
const div = (a: number, b: number) => Math.trunc(a / b);

/** Always non-negative modulo, like Python's `%`. */
const floorMod = (a: number, b: number) => ((a % b) + b) % b;

export function gregorianToJulianDay(year: number, month: number, day: number): number {
  const yearp = month <= 2 ? year - 1 : year;
  const monthp = month <= 2 ? month + 12 : month;
  let b = 0;
  if (!(year < 1582 || (year === 1582 && month < 10) || (year === 1582 && month === 10 && day < 15))) {
    const a = Math.trunc(yearp / 100);
    b = 2 - a + Math.trunc(a / 4);
  }
  const c = yearp < 0 ? Math.trunc(365.25 * yearp - 0.75) : Math.trunc(365.25 * yearp);
  const d = Math.trunc(30.6001 * (monthp + 1));
  return Math.trunc(b + c + d + day + 1720994.5 + 0.5);
}

interface LSYear {
  horakhun: number;
  kammacapon: number;
  avoman: number;
  tithi: number;
  weekday: number;
  langsak: number;
  nyd: number;
  nextNyd: number;
  leapday: boolean;
  calType: CalType;
  offset: boolean;
}

function newLSYear(year: number): LSYear {
  const horakhun = div(year * DAYS_IN_800_YEARS + EPOCH_OFFSET, TIME_UNITS_IN_ONE_DAY) + 1;
  const kammacapon =
    TIME_UNITS_IN_ONE_DAY - floorMod(year * DAYS_IN_800_YEARS + EPOCH_OFFSET, TIME_UNITS_IN_ONE_DAY);

  const avoQuot = div(horakhun * 11 + 650, 692);
  let avoman = floorMod(horakhun * 11 + 650, 692);
  if (avoman === 0) avoman = 692;
  let tithi = floorMod(avoQuot + horakhun, 30);
  if (avoman === 692) tithi--;
  const weekday = floorMod(horakhun, 7);

  const horakhun1 = div((year + 1) * DAYS_IN_800_YEARS + EPOCH_OFFSET, TIME_UNITS_IN_ONE_DAY) + 1;
  const tithi1 = floorMod(div(horakhun1 * 11 + 650, 692) + horakhun1, 30);

  const langsak = Math.max(tithi, 1);
  let nydDays = langsak;
  if (nydDays < 6) nydDays += 29;
  const nyd = floorMod(weekday - nydDays + 1 + 35, 7);

  const leapday = kammacapon <= 207;

  let calType: CalType = "A";
  if (tithi > 24 || tithi < 6) calType = "C";
  if (tithi === 25 && tithi1 === 5) calType = "A";
  if ((leapday && avoman <= 126) || (!leapday && avoman <= 137)) {
    calType = calType !== "C" ? "B" : "c";
  }

  const nextNyd = floorMod(nyd + (calType === "A" ? 4 : calType === "B" ? 5 : 6), 7);

  return { horakhun, kammacapon, avoman, tithi, weekday, langsak, nyd, nextNyd, leapday, calType, offset: false };
}

interface CSYear0 extends LSYear {
  offsetDays: number;
}

function calculateYear0(year: number): CSYear0 {
  const y = [-2, -1, 0, 1, 2].map((d) => newLSYear(year + d));

  for (let i = 0; i <= 4; i++) {
    if (y[2].tithi === 24 && y[3].tithi === 6) {
      y[i].calType = "C";
      y[i].nextNyd = floorMod(y[i].nextNyd + 2, 7);
    }
  }

  for (let i = 1; i <= 3; i++) {
    if (y[i].calType === "c") {
      const j = y[i].nyd === y[i - 1].nextNyd ? 1 : -1;
      y[i + j].calType = "B";
      y[i + j].nextNyd = floorMod(y[i + j].nextNyd + 1, 7);
    }
  }

  for (let i = 1; i <= 3; i++) {
    if (y[i - 1].nextNyd !== y[i].nyd && y[i].nextNyd !== y[i + 1].nyd) {
      y[i].offset = true;
      y[i].langsak++;
      y[i].nyd = floorMod(y[i].nyd + 6, 7);
      y[i].nextNyd = floorMod(y[i].nextNyd + 6, 7);
    }
  }

  if (y[2].calType === "c") y[2].calType = "C";

  let offsetDays = y[2].langsak;
  if (offsetDays < 6 + (y[2].offset ? 1 : 0)) offsetDays += 29;
  return { ...y[2], offsetDays };
}

const FIND_DATE_TABLE: Record<"A" | "B" | "C", [number, number][]> = {
  A: [[383, 16], [354, 15], [324, 12], [295, 11], [265, 10], [236, 9], [206, 8], [177, 7], [147, 6], [118, 5], [88, 4], [59, 3], [29, 2]],
  B: [[384, 16], [355, 15], [325, 12], [296, 11], [266, 10], [237, 9], [207, 8], [178, 7], [148, 6], [119, 5], [89, 4], [59, 3], [29, 2]],
  C: [[384, 15], [354, 12], [325, 11], [295, 10], [266, 9], [236, 8], [207, 7], [177, 6], [148, 5], [118, 14], [88, 13], [59, 3], [29, 2]],
};

function findDate(cal: CalType, days: number): { month: number; day: number } {
  const table = FIND_DATE_TABLE[cal === "c" ? "C" : cal];
  for (const [limit, slot] of table) {
    if (days > limit) return { month: LUNAR_MONTHS[slot], day: days - limit };
  }
  return { month: LUNAR_MONTHS[1], day: days };
}

export interface ThaiLunarDate {
  /** จุลศักราช */
  csYear: number;
  /** 1–12; the second month 8 of a leap-month year is also 8 */
  month: number;
  /** true in the second month 8 ("8-8") of an อธิกมาส year */
  isSecondEighth: boolean;
  /** ขึ้น or แรม */
  phase: "ขึ้น" | "แรม";
  /** ค่ำ, 1–15 */
  kham: number;
  /** ปีนักษัตร number, ชวด = 1 … กุน = 12 */
  naksatr: number;
  naksatrName: string;
}

function fromYD(startYear: number, startDays: number): ThaiLunarDate {
  let year = startYear;
  let days = startDays;
  let year0 = calculateYear0(year);
  let daysInYear = year0.leapday ? 366 : 365;
  while (days > daysInYear) {
    year++;
    days -= daysInYear;
    year0 = calculateYear0(year);
    daysInYear = year0.leapday ? 366 : 365;
  }
  const { month, day } = findDate(year0.calType, year0.offsetDays + days);
  let naksatr = floorMod(year + 11, 12);
  if (naksatr === 0) naksatr = 12;
  return {
    csYear: year,
    month: month === 88 ? 8 : month,
    isSecondEighth: month === 88,
    phase: day > 15 ? "แรม" : "ขึ้น",
    kham: day > 15 ? day - 15 : day,
    naksatr,
    naksatrName: NAKSATR_NAMES[naksatr],
  };
}

/** Convert a Gregorian date (CE year, month 1–12, day 1–31) to a Thai lunar date. */
export function toThaiLunar(year: number, month: number, day: number): ThaiLunarDate {
  const hk = gregorianToJulianDay(year, month, day) - CS_JULIAN_DAY_OFFSET;
  if (hk < 1) throw new RangeError("วันที่อยู่ก่อนจุลศักราช คำนวณไม่ได้");
  let csYear = div(hk * 800 - 373, DAYS_IN_800_YEARS);
  let days: number;
  if (floorMod(hk, DAYS_IN_800_YEARS) === 95333) {
    csYear--;
    days = 365;
  } else {
    days = hk - calculateYear0(csYear).horakhun;
  }
  return fromYD(csYear, days);
}
