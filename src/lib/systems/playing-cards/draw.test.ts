import { describe, expect, it } from "vitest";
import { DECK } from "./deck";
import { drawCards } from "./draw";
import { readSpread } from "./spreads";

describe("deck", () => {
  it("has 52 unique cards with meanings", () => {
    expect(DECK).toHaveLength(52);
    expect(new Set(DECK.map((c) => `${c.suit}${c.rank}`)).size).toBe(52);
    expect(DECK.every((c) => c.meaning.length > 0)).toBe(true);
  });
});

describe("drawCards", () => {
  it("is deterministic for a seed", () => {
    expect(drawCards(12345, 3)).toEqual(drawCards(12345, 3));
  });

  it("never repeats a card", () => {
    for (let seed = 0; seed < 500; seed++) {
      const ids = drawCards(seed, 3).map((c) => c.id);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it("reaches every card", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 2000; seed++) seen.add(drawCards(seed, 1)[0].id);
    expect(seen.size).toBe(52);
  });
});

describe("readSpread", () => {
  it("fills every position and writes a summary", () => {
    const r = readSpread("three", 42);
    expect(r.cards.map((c) => c.position)).toEqual(["อดีต", "ปัจจุบัน", "อนาคต"]);
    expect(r.summary.length).toBeGreaterThan(20);
  });

  it("falls back to the daily spread for unknown ids", () => {
    expect(readSpread("nope", 1).cards).toHaveLength(1);
  });
});

describe("seed compatibility", () => {
  it("keeps the draws of links shared before the shared random module", () => {
    expect([1, 42, 12345, 4294967295].map((s) => drawCards(s, 3).map((c) => c.id))).toEqual([
      [32, 1, 28], [31, 23, 44], [50, 16, 26], [46, 10, 37],
    ]);
  });
});
