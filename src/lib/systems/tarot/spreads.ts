import { drawFrom, mulberry32 } from "@/lib/random";
import { TAROT_DECK, TAROT_SUITS, type TarotCard, type TarotSuit } from "./deck";

export interface Position {
  name: string;
  hint: string;
}

export interface TarotSpread {
  id: string;
  name: string;
  description: string;
  positions: Position[];
  /** ตำแหน่งที่ใช้สรุปผลลัพธ์/แนวโน้ม */
  outcomeIndex: number;
}

export const TAROT_SPREADS: TarotSpread[] = [
  {
    id: "daily",
    name: "ไพ่ประจำวัน",
    description: "1 ใบ ดูพลังของวันนี้",
    positions: [{ name: "วันนี้", hint: "พลังที่จะมีผลกับวันนี้" }],
    outcomeIndex: 0,
  },
  {
    id: "three",
    name: "อดีต ปัจจุบัน อนาคต",
    description: "3 ใบ ดูเส้นทางของเรื่องที่ถาม",
    positions: [
      { name: "อดีต", hint: "สิ่งที่ส่งผลมาถึงตอนนี้" },
      { name: "ปัจจุบัน", hint: "สถานการณ์ตอนนี้" },
      { name: "อนาคต", hint: "แนวโน้มที่จะเกิดขึ้น" },
    ],
    outcomeIndex: 2,
  },
  {
    id: "love",
    name: "ความรัก",
    description: "5 ใบ ดูความสัมพันธ์ของคุณกับอีกฝ่าย",
    positions: [
      { name: "คุณ", hint: "ความรู้สึกและท่าทีของคุณ" },
      { name: "อีกฝ่าย", hint: "ความรู้สึกและท่าทีของเขา/เธอ" },
      { name: "ความสัมพันธ์", hint: "สภาพความสัมพันธ์ตอนนี้" },
      { name: "อุปสรรค", hint: "สิ่งที่ต้องก้าวผ่าน" },
      { name: "แนวโน้ม", hint: "ทิศทางของความสัมพันธ์" },
    ],
    outcomeIndex: 4,
  },
  {
    id: "celtic",
    name: "Celtic Cross",
    description: "10 ใบ ดูเรื่องที่ถามอย่างละเอียดทุกมุม",
    positions: [
      { name: "สถานการณ์", hint: "แก่นของเรื่องตอนนี้" },
      { name: "สิ่งที่ขวางทาง", hint: "อุปสรรคหรือแรงต้าน" },
      { name: "รากฐาน", hint: "ต้นเหตุที่ซ่อนอยู่ลึก ๆ" },
      { name: "อดีตที่เพิ่งผ่าน", hint: "สิ่งที่กำลังจะผ่านไป" },
      { name: "เป้าหมาย", hint: "สิ่งที่คุณหวังหรือคิดอยู่" },
      { name: "อนาคตอันใกล้", hint: "สิ่งที่กำลังจะเข้ามา" },
      { name: "ตัวคุณ", hint: "ท่าทีของคุณต่อเรื่องนี้" },
      { name: "สิ่งแวดล้อม", hint: "คนรอบตัวและปัจจัยภายนอก" },
      { name: "ความหวังและความกลัว", hint: "สิ่งที่อยู่ในใจลึก ๆ" },
      { name: "ผลลัพธ์", hint: "บทสรุปที่มีแนวโน้มจะเกิด" },
    ],
    outcomeIndex: 9,
  },
];

export function getTarotSpread(id: string): TarotSpread {
  return TAROT_SPREADS.find((s) => s.id === id) ?? TAROT_SPREADS[0];
}

export interface DrawnTarot {
  position: Position;
  card: TarotCard;
  reversed: boolean;
}

export interface TarotReading {
  spread: TarotSpread;
  seed: number;
  cards: DrawnTarot[];
  summary: string[];
}

/** สับไพ่ด้วย seed แล้วสุ่มทิศทาง (ตั้ง/กลับหัว) ต่อจากลำดับเดียวกัน */
export function drawTarot(seed: number, count: number): { card: TarotCard; reversed: boolean }[] {
  const rand = mulberry32(seed);
  const cards = drawFrom(TAROT_DECK, rand, count);
  return cards.map((card) => ({ card, reversed: rand() < 0.5 }));
}

export function readTarot(spreadId: string, seed: number): TarotReading {
  const spread = getTarotSpread(spreadId);
  const drawn = drawTarot(seed, spread.positions.length);
  const cards = drawn.map((d, i) => ({ ...d, position: spread.positions[i] }));
  return { spread, seed, cards, summary: summarize(spread, cards) };
}

function summarize(spread: TarotSpread, cards: DrawnTarot[]): string[] {
  const n = cards.length;
  const lines: string[] = [];

  const majors = cards.filter((c) => c.card.arcana === "major").length;
  const reversed = cards.filter((c) => c.reversed).length;

  if (n > 1) {
    if (majors / n >= 0.5) lines.push(`ไพ่ชุดใหญ่ (Major Arcana) ออกมาถึง ${majors} ใบ เรื่องนี้เป็นจุดเปลี่ยนสำคัญที่ส่งผลต่อชีวิตในระยะยาว`);
    else if (majors === 0) lines.push("ไม่มีไพ่ชุดใหญ่เลย เรื่องนี้อยู่ในมือคุณ เปลี่ยนแปลงได้ด้วยการกระทำในชีวิตประจำวัน");

    const counts = new Map<TarotSuit, number>();
    for (const c of cards) if (c.card.suit) counts.set(c.card.suit, (counts.get(c.card.suit) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2 && top[1] / n >= 0.3) {
      const s = TAROT_SUITS[top[0]];
      lines.push(`ไพ่ชุด${s.nameTh} (ธาตุ${s.element}) ออกมา ${top[1]} ใบ เรื่องที่เด่นคือ${s.theme}`);
    }

    if (reversed / n > 0.5) lines.push("ไพ่กลับหัวมากกว่าครึ่ง พลังยังติดขัด อาจต้องแก้ที่ตัวเองหรือรอจังหวะ");
    else if (reversed === 0) lines.push("ไพ่ตั้งทุกใบ พลังไหลลื่น เป็นช่วงที่เหมาะกับการลงมือ");
  }

  const outcome = cards[spread.outcomeIndex];
  const name = `${outcome.card.nameTh}${outcome.reversed ? " (กลับหัว)" : ""}`;
  const meaning = outcome.reversed ? outcome.card.reversed : outcome.card.upright;
  lines.push(`ไพ่ตำแหน่ง “${outcome.position.name}” คือ ${name}: ${meaning}`);
  return lines;
}
