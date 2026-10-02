import { SUITS, type Card, type Suit } from "./deck";
import { pickCards } from "./draw";

export interface Spread {
  id: string;
  name: string;
  description: string;
  positions: string[];
}

export const SPREADS: Spread[] = [
  { id: "daily", name: "ไพ่ประจำวัน", description: "เปิด 1 ใบ ดูภาพรวมของวันนี้", positions: ["วันนี้"] },
  {
    id: "three",
    name: "อดีต ปัจจุบัน อนาคต",
    description: "เปิด 3 ใบ ดูเส้นทางของเรื่องที่ถาม",
    positions: ["อดีต", "ปัจจุบัน", "อนาคต"],
  },
];

export function getSpread(id: string): Spread {
  return SPREADS.find((s) => s.id === id) ?? SPREADS[0];
}

export interface CardReading {
  position: string;
  card: Card;
}

export interface SpreadReading {
  spread: Spread;
  seed: number;
  cards: CardReading[];
  summary: string;
}

const TONE_SCORE = { good: 1, neutral: 0, caution: -1 } as const;

/** เปิดไพ่ตาม spread แล้วสรุปคำทำนายจากกฎที่เขียนไว้ล่วงหน้า */
export function readSpread(spreadId: string, seed: number, picks?: number[] | null): SpreadReading {
  const spread = getSpread(spreadId);
  const drawn = pickCards(seed, spread.positions.length, picks);
  const cards = drawn.map((card, i) => ({ position: spread.positions[i], card }));

  const counts = new Map<Suit, number>();
  for (const c of drawn) counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1);
  const [topSuit, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const score = drawn.reduce((s, c) => s + TONE_SCORE[c.tone], 0);

  const parts: string[] = [];
  if (drawn.length === 1) {
    parts.push(`วันนี้พลังมาจากไพ่${SUITS[topSuit].name} เกี่ยวกับ${SUITS[topSuit].theme}`);
  } else if (topCount > 1) {
    parts.push(`ไพ่${SUITS[topSuit].name}ออกมา ${topCount} ใบ เรื่องที่โดดเด่นคือ${SUITS[topSuit].theme}`);
  } else {
    parts.push("ไพ่ออกมาคนละดอก เรื่องนี้เกี่ยวพันกับหลายด้านของชีวิต");
  }
  if (score > 0) parts.push("ภาพรวมเป็นไปในทางที่ดี เหมาะกับการลงมือทำสิ่งที่ตั้งใจไว้");
  else if (score < 0) parts.push("ภาพรวมมีเรื่องให้ระวัง ค่อย ๆ คิด ไม่ต้องรีบตัดสินใจ");
  else parts.push("ภาพรวมทรงตัว ผลลัพธ์ขึ้นอยู่กับการตัดสินใจของคุณเอง");
  if (spread.id === "three") {
    const future = drawn[2];
    parts.push(
      future.tone === "good"
        ? "ไพ่อนาคตเป็นบวก เรื่องนี้มีแนวโน้มจบลงด้วยดี"
        : future.tone === "caution"
          ? "ไพ่อนาคตเตือนให้เตรียมรับมือ ถ้าระวังไว้ก่อนก็ผ่านไปได้"
          : "ไพ่อนาคตเป็นกลาง ยังเปลี่ยนแปลงได้ตามการกระทำของคุณ",
    );
  }
  return { spread, seed, cards, summary: parts.join(" ") };
}
