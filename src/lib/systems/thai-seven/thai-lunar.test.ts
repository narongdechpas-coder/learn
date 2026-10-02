import { describe, expect, it } from "vitest";
import { toThaiLunar } from "./thai-lunar";

// วันสำคัญทางพุทธศาสนาที่รู้วันที่แน่นอน (ตรงกับชุดทดสอบของ thailunar ต้นฉบับ)
describe("toThaiLunar", () => {
  it.each([
    ["มาฆบูชา 2568", 2025, 2, 12, 3],
    ["วิสาขบูชา 2568", 2025, 5, 11, 6],
    ["อาสาฬหบูชา 2568", 2025, 7, 10, 8],
    ["ลอยกระทง 2568", 2025, 11, 5, 12],
    ["มาฆบูชา 2569 (ปีอธิกมาส ย้ายไปเดือน 4)", 2026, 3, 3, 4],
  ])("%s", (_name, y, m, d, month) => {
    const r = toThaiLunar(y, m, d);
    expect(r).toMatchObject({ month, phase: "ขึ้น", kham: 15 });
  });

  it("2023-08-01 is the second month 8 of an อธิกมาส year", () => {
    expect(toThaiLunar(2023, 8, 1)).toMatchObject({ month: 8, isSecondEighth: true, phase: "ขึ้น", kham: 15 });
  });

  it("2026-07-13 is แรม 14 ค่ำ เดือน 8 ปีมะเมีย", () => {
    expect(toThaiLunar(2026, 7, 13)).toMatchObject({ month: 8, phase: "แรม", kham: 14, naksatrName: "มะเมีย" });
  });

  it("advances one day at a time with no gaps for 30 years", () => {
    const d = new Date(Date.UTC(2000, 0, 1));
    let prev = toThaiLunar(2000, 1, 1);
    for (let i = 0; i < 365 * 30; i++) {
      d.setUTCDate(d.getUTCDate() + 1);
      const cur = toThaiLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      const prevDay = prev.kham + (prev.phase === "แรม" ? 15 : 0);
      const curDay = cur.kham + (cur.phase === "แรม" ? 15 : 0);
      if (curDay === 1) expect(prevDay === 29 || prevDay === 30).toBe(true);
      else expect(curDay).toBe(prevDay + 1);
      prev = cur;
    }
  });
});
