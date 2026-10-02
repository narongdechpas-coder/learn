import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "./deck";
import { TAROT_SPREADS, drawTarot, pickTarot, readTarot } from "./spreads";

describe("TAROT_DECK", () => {
  it("has 22 major and 56 minor cards with unique ids", () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(TAROT_DECK.filter((c) => c.arcana === "major")).toHaveLength(22);
    expect(new Set(TAROT_DECK.map((c) => c.id)).size).toBe(78);
  });

  it("has Thai meanings for both orientations", () => {
    for (const c of TAROT_DECK) {
      expect(c.nameTh && c.keyword && c.upright && c.reversed, c.id).toBeTruthy();
    }
  });

  it("has an image file for every card", () => {
    for (const c of TAROT_DECK) {
      expect(existsSync(path.join("public", c.image)), c.image).toBe(true);
    }
  });
});

describe("drawTarot", () => {
  it("is deterministic for a seed, orientation included", () => {
    expect(drawTarot(2024, 10)).toEqual(drawTarot(2024, 10));
  });

  it("never repeats a card in a Celtic Cross", () => {
    for (let seed = 0; seed < 300; seed++) {
      expect(new Set(drawTarot(seed, 10).map((d) => d.card.id)).size).toBe(10);
    }
  });

  it("reaches every card and both orientations", () => {
    const seen = new Set<string>();
    let reversed = 0;
    for (let seed = 0; seed < 3000; seed++) {
      const [d] = drawTarot(seed, 1);
      seen.add(d.card.id);
      if (d.reversed) reversed++;
    }
    expect(seen.size).toBe(78);
    expect(reversed / 3000).toBeGreaterThan(0.4);
    expect(reversed / 3000).toBeLessThan(0.6);
  });
});

describe("readTarot", () => {
  it.each(TAROT_SPREADS.map((s) => [s.id, s.positions.length] as const))("%s fills %i positions", (id, n) => {
    const r = readTarot(id, 7);
    expect(r.cards).toHaveLength(n);
    expect(r.summary.at(-1)).toContain(r.spread.positions[r.spread.outcomeIndex].name);
  });

  it("falls back to the daily spread for unknown ids", () => {
    expect(readTarot("nope", 1).spread.id).toBe("daily");
  });
});

describe("pickTarot", () => {
  it("gives each deck position a fixed orientation, whichever card is picked first", () => {
    const a = pickTarot(5, 2, [10, 70]);
    const b = pickTarot(5, 2, [70, 10]);
    expect(a[0]).toEqual(b[1]);
    expect(a[1]).toEqual(b[0]);
  });

  it("keeps old links without picks unchanged", () => {
    expect(pickTarot(2024, 3)).toEqual(drawTarot(2024, 3));
  });

  it("supports a full Celtic Cross pick", () => {
    const r = readTarot("celtic", 3, [77, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(r.cards.map((c) => c.card.id)).size).toBe(10);
  });
});
