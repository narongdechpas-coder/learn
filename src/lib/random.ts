/** Deterministic PRNG (mulberry32): the same seed always gives the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed for a new reading. */
export function newSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/**
 * Draw `count` distinct items with a partial Fisher–Yates shuffle, using `rand`.
 * The generator is passed in so callers can keep drawing from the same sequence.
 */
export function drawFrom<T>(items: readonly T[], rand: () => number, count: number): T[] {
  if (count < 1 || count > items.length) throw new RangeError("จำนวนไพ่ไม่ถูกต้อง");
  const deck = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count);
}

/** Shuffle the whole deck. Its first n items equal drawFrom(items, rand, n) for the same generator. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  return drawFrom(items, rand, items.length);
}

/**
 * Parse the cards a user picked from a shuffled deck, e.g. "12,3,40".
 * Returns null unless there are exactly `count` distinct indices within the deck.
 */
export function parsePicks(raw: string | null, deckSize: number, count: number): number[] | null {
  if (!raw) return null;
  const picks = raw.split(",").map(Number);
  const valid =
    picks.length === count &&
    picks.every((p) => Number.isInteger(p) && p >= 0 && p < deckSize) &&
    new Set(picks).size === count;
  return valid ? picks : null;
}
