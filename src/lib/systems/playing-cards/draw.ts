import { drawFrom, mulberry32 } from "@/lib/random";
import { DECK, type Card } from "./deck";

export { newSeed } from "@/lib/random";

/** Draw `count` distinct playing cards for a seed. */
export function drawCards(seed: number, count: number): Card[] {
  return drawFrom(DECK, mulberry32(seed), count);
}
