import { describe, expect, it } from "vitest";
import { calculateSeven, interpretSeven } from "./calculate";

describe("calculateSeven", () => {
  // 11 พ.ค. 2025 = วันอาทิตย์ ขึ้น 15 ค่ำ เดือน 6 ปีมะเส็ง
  const r = calculateSeven({ year: 2025, month: 5, day: 11 });

  it("builds the four rows", () => {
    expect(r.dayNumber).toBe(1);
    expect(r.lunar.month).toBe(6);
    expect(r.lunar.naksatrName).toBe("มะเส็ง");
    expect(r.rows.map((row) => row.map((c) => c.value))).toEqual([
      [1, 2, 3, 4, 5, 6, 7],
      [6, 7, 1, 2, 3, 4, 5],
      [6, 7, 1, 2, 3, 4, 5],
    ]);
    expect(r.sums).toEqual([13, 16, 5, 8, 11, 14, 17]);
  });

  it("labels the houses", () => {
    expect(r.rows[0][0].house).toBe("อัตตะ");
    expect(r.rows[1][6].house).toBe("ปัตนิ");
    expect(r.rows[2][2].house).toBe("กัมมะ");
  });

  it("reduces months above 7 (เดือน 12 → 5)", () => {
    // 5 พ.ย. 2025 = ขึ้น 15 ค่ำ เดือน 12, วันพุธ
    const n = calculateSeven({ year: 2025, month: 11, day: 5 });
    expect(n.lunar.month).toBe(12);
    expect(n.rows[1][0].value).toBe(5);
    expect(n.dayNumber).toBe(4);
  });

  it("counts births before 06:00 as the previous day", () => {
    const early = calculateSeven({ year: 2025, month: 5, day: 12, time: "05:30" });
    expect(early.shiftedToPreviousDay).toBe(true);
    expect(early.dayNumber).toBe(1);
    expect(calculateSeven({ year: 2025, month: 5, day: 12, time: "06:00" }).dayNumber).toBe(2);
  });

  it("marks Wednesday night as ราหู", () => {
    const w = calculateSeven({ year: 2025, month: 5, day: 14, time: "19:00" });
    expect(w.isRahu).toBe(true);
    expect(w.dayName).toContain("ราหู");
    expect(calculateSeven({ year: 2025, month: 5, day: 14, time: "12:00" }).isRahu).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(() => calculateSeven({ year: 2025, month: 2, day: 30 })).toThrow();
    expect(() => calculateSeven({ year: 1800, month: 1, day: 1 })).toThrow();
  });

  it("produces a reading for every topic", () => {
    const readings = interpretSeven(r);
    expect(readings.map((x) => x.heading)).toEqual([
      "ภาพรวม", "ตัวตนและบุคลิก", "การงาน", "การเงิน", "ความรัก", "สุขภาพ", "หลักที่เด่นและหลักที่อ่อน",
    ]);
    expect(readings.every((x) => x.body.length > 20)).toBe(true);
  });
});
