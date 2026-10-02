import { describe, expect, it } from "vitest";
import { drawFrom, mulberry32, parsePicks, shuffle } from "./random";

describe("shuffle", () => {
  const items = Array.from({ length: 52 }, (_, i) => i);

  it("is a permutation", () => {
    expect([...shuffle(items, mulberry32(9))].sort((a, b) => a - b)).toEqual(items);
  });

  it("starts with the same cards drawFrom would draw", () => {
    expect(shuffle(items, mulberry32(9)).slice(0, 5)).toEqual(drawFrom(items, mulberry32(9), 5));
  });
});

describe("parsePicks", () => {
  it("accepts distinct in-range indices of the right count", () => {
    expect(parsePicks("12,3,40", 52, 3)).toEqual([12, 3, 40]);
  });

  it.each<[string | null, string]>([
    [null, "missing"],
    ["1,2", "too few"],
    ["1,1,2", "duplicate"],
    ["1,2,52", "out of range"],
    ["1,x,2", "not a number"],
    ["-1,2,3", "negative"],
  ])("rejects %s (%s)", (raw) => {
    expect(parsePicks(raw, 52, 3)).toBeNull();
  });
});
