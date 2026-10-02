import { describe, expect, it } from "vitest";
import { calculateBazi } from "./calculate";
import { interpretBazi } from "./story";

// อักษรจีนและศัพท์เทคนิคที่ไม่ควรปรากฏในคำทำนาย
const CJK = /[一-鿿]/;
const JARGON = ["หยาง", "หยิน", "ก้านฟ้า", "กิ่งดิน", "เทพ", "วัยจร", "เสา", "ดาว"];

describe("interpretBazi", () => {
  const charts = Array.from({ length: 80 }, (_, i) => {
    const d = new Date(Date.UTC(1950, 0, 1 + i * 307));
    return calculateBazi(
      { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), time: `${String(i % 24).padStart(2, "0")}:15`, gender: i % 2 ? "male" : "female" },
      new Date(2026, 0, 1),
    );
  });

  it("tells a story with advice for every section", () => {
    const readings = interpretBazi(charts[0]);
    expect(readings.map((r) => r.heading)).toEqual([
      "ตัวตนของคุณ", "พลังชีวิตของคุณ", "สมดุลในชีวิต", "จังหวะชีวิต 10 ปี", "สิ่งเสริมดวง",
    ]);
    for (const r of readings) expect(r.advice, r.heading).toBeTruthy();
  });

  it("never shows Chinese characters or technical terms", () => {
    for (const chart of charts) {
      for (const r of interpretBazi(chart)) {
        const text = `${r.heading} ${r.body} ${r.advice ?? ""}`;
        expect(text).not.toMatch(CJK);
        for (const word of JARGON) expect(text, text).not.toContain(word);
      }
    }
  });

  it("skips the 10-year section without a gender", () => {
    const r = interpretBazi(calculateBazi({ year: 1990, month: 8, day: 15 }));
    expect(r.map((x) => x.heading)).not.toContain("จังหวะชีวิต 10 ปี");
  });
});
