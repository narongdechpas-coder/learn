import { drawFrom, mulberry32, shuffle } from "@/lib/random";
import { DECK, type Card } from "./deck";

export { newSeed } from "@/lib/random";

/** Draw `count` distinct playing cards for a seed. */
export function drawCards(seed: number, count: number): Card[] {
  return drawFrom(DECK, mulberry32(seed), count);
}

/**
 * The cards a user picked from the shuffled deck (indices into the shuffle).
 * Without picks, falls back to the top of the deck, which is how older shared links were drawn.
 */
export function pickCards(seed: number, count: number, picks?: number[] | null): Card[] {
  if (!picks) return drawCards(seed, count);
  const deck = shuffle(DECK, mulberry32(seed));
  return picks.map((i) => deck[i]);
}
