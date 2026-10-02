import { describe, expect, it } from "vitest";
import { calculateSeven } from "./calculate";
import { HOUSES } from "./meanings";
import { interpretSeven } from "./story";

const JARGON = [...HOUSES.flat().map((h) => h.name), "ภพ", "ดาว", "สถิต", "ฐาน", "หลักที่"];

describe("interpretSeven", () => {
  // ครอบคลุมวันเกิดทุกวันในสัปดาห์ เดือนจันทรคติ และปีนักษัตรหลายแบบ
  const charts = Array.from({ length: 120 }, (_, i) => {
    const d = new Date(Date.UTC(1950, 0, 1 + i * 211));
    return calculateSeven({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  });

  it("covers every life topic with a story and advice", () => {
    const readings = interpretSeven(charts[0]);
    expect(readings.map((r) => r.heading)).toEqual([
      "ตัวตนของคุณ", "การงาน", "การเงิน", "ความรัก", "สุขภาพ", "จุดเด่นและเรื่องที่ต้องใส่ใจ",
    ]);
    for (const r of readings) {
      expect(r.body.length, r.heading).toBeGreaterThan(30);
      expect(r.advice?.length, r.heading).toBeGreaterThan(20);
    }
  });

  it("never uses astrology jargon or chart numbers", () => {
    for (const chart of charts) {
      for (const r of interpretSeven(chart)) {
        const text = `${r.body} ${r.advice}`;
        for (const word of JARGON) expect(text, `${r.heading}: ${text}`).not.toContain(word);
        expect(text).not.toMatch(/[0-9]/);
      }
    }
  });

  it("uses ราหู wording for Wednesday-night births", () => {
    const r = interpretSeven(calculateSeven({ year: 2025, month: 5, day: 14, time: "19:00" }));
    expect(r[0].body).toContain("พุธกลางคืน");
    expect(r[0].advice).toContain("เทาหรือดำ");
  });
});
