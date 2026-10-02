import { Solar } from "lunar-typescript";
import { describe, expect, it } from "vitest";
import { calculateBazi, interpretBazi, tenGodOf } from "./calculate";
import { STEMS } from "./names";

const gz = (r: ReturnType<typeof calculateBazi>) => r.pillars.map((p) => p.gan + p.zhi).join(" ");

describe("calculateBazi", () => {
  it("builds the four pillars in hour-day-month-year order", () => {
    // 1 ม.ค. 2000 เที่ยง: ปี 己卯 (ก่อนลี่ชุน) เดือน 丙子 (ก่อนเสี่ยวหาน) วัน 戊午
    const r = calculateBazi({ year: 2000, month: 1, day: 1, time: "12:00" });
    expect(gz(r)).toBe("戊午 戊午 丙子 己卯");
    expect(r.dayMaster.gan).toBe("戊");
    expect(r.pillars[1].tenGod).toBe("日主");
  });

  it("omits the hour pillar without a birth time", () => {
    const r = calculateBazi({ year: 2000, month: 1, day: 1 });
    expect(r.pillars.map((p) => p.key)).toEqual(["day", "month", "year"]);
  });

  it("changes year at ลี่ชุน using Beijing time (2024-02-04 16:27 UTC+8)", () => {
    // 15:20 ไทย = 16:20 ปักกิ่ง ยังไม่ถึงลี่ชุน, 15:30 ไทย = 16:30 ปักกิ่ง ผ่านแล้ว
    expect(calculateBazi({ year: 2024, month: 2, day: 4, time: "15:20" }).pillars.at(-1)!.gan).toBe("癸");
    expect(calculateBazi({ year: 2024, month: 2, day: 4, time: "15:30" }).pillars.at(-1)!.gan).toBe("甲");
  });

  it("uses Bangkok solar time (−18 min) for the hour pillar", () => {
    expect(calculateBazi({ year: 2000, month: 1, day: 1, time: "11:10" }).pillars[0].zhi).toBe("巳");
    expect(calculateBazi({ year: 2000, month: 1, day: 1, time: "11:20" }).pillars[0].zhi).toBe("午");
  });

  it("counts eight characters across the five elements", () => {
    const r = calculateBazi({ year: 2000, month: 1, day: 1, time: "12:00" });
    expect(Object.values(r.elementCounts).reduce((a, b) => a + b, 0)).toBe(8);
    // 戊午 戊午 丙子 己卯 → ดิน 3, ไฟ 3, น้ำ 1, ไม้ 1
    expect(r.elementCounts).toEqual({ wood: 1, fire: 3, earth: 3, metal: 0, water: 1 });
    expect(r.strong).toBe(true);
    expect(r.favorable).toEqual(["metal", "water", "wood"]);
  });

  it("computes luck pillars forward for a yang-year male", () => {
    const r = calculateBazi({ year: 1990, month: 8, day: 15, time: "19:30", gender: "male" }, new Date(2026, 0, 1));
    expect(gz(r)).toBe("庚戌 壬子 甲申 庚午");
    expect(r.luck![0]).toMatchObject({ ganZhi: "乙酉", startYear: 1998, startAge: 8 });
    expect(r.luck!.filter((l) => l.current)).toHaveLength(1);
  });

  it("skips luck pillars without a gender", () => {
    expect(calculateBazi({ year: 1990, month: 8, day: 15 }).luck).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(() => calculateBazi({ year: 2023, month: 2, day: 29 })).toThrow();
  });

  it("writes every reading section", () => {
    const r = calculateBazi({ year: 1990, month: 8, day: 15, time: "19:30", gender: "female" });
    const headings = interpretBazi(r).map((x) => x.heading);
    expect(headings).toContain("ธาตุประจำตัว");
    expect(headings).toContain("วัยจร (10 ปี)");
  });
});

describe("tenGodOf", () => {
  it("matches lunar-typescript for every stem pair", () => {
    // หาวันที่ครอบคลุมก้านฟ้าวันทั้ง 10 แล้วเทียบกับผลของไลบรารี
    for (let i = 0; i < 400; i++) {
      const ec = Solar.fromYmdHms(1980, 1, 1, 0, 0, 0).next(i * 7).getLunar().getEightChar();
      const dm = STEMS[ec.getDayGan()];
      expect(tenGodOf(dm, STEMS[ec.getMonthGan()])).toBe(ec.getMonthShiShenGan());
      expect(tenGodOf(dm, STEMS[ec.getYearGan()])).toBe(ec.getYearShiShenGan());
    }
  });
});
