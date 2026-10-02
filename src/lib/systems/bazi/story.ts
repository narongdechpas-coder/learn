// คำทำนายปาจื้อแบบเล่าเรื่อง: ใช้ภาษาธรรมดา ไม่มีอักษรจีนหรือศัพท์เทคนิค และมีคำแนะนำทุกหัวข้อ

import type { BaziResult } from "./calculate";
import { DAY_MASTER_TEXT, ELEMENTS, ELEMENT_INFO, type Element } from "./names";

export interface Reading {
  heading: string;
  body: string;
  advice?: string;
}

/** จุดเด่นตามดาวที่ปรากฏมากที่สุด (คีย์คือชื่อจีนจากการคำนวณ ไม่ได้แสดงผล) */
const TALENT: Record<string, { story: string; advice: string }> = {
  比肩: {
    story: "คุณเป็นคนพึ่งพาตัวเองได้ มีความเป็นตัวของตัวเองสูง และมักมีเพื่อนที่คอยอยู่ข้าง ๆ",
    advice: "ทำงานเป็นทีมกับคนที่ไว้ใจได้ จะไปได้ไกลกว่าลุยคนเดียว",
  },
  劫财: {
    story: "คุณเป็นคนกล้าได้กล้าเสีย ชอบการแข่งขัน และไม่ยอมแพ้ง่าย ๆ",
    advice: "ระวังเรื่องเงินกับคนใกล้ตัว โดยเฉพาะการค้ำประกันหรือการให้ยืม",
  },
  食神: {
    story: "คุณมีฝีมือและความคิดสร้างสรรค์ รู้จักใช้ชีวิตให้มีความสุข และทำให้คนรอบตัวสบายใจ",
    advice: "เปลี่ยนงานอดิเรกหรือฝีมือที่มีให้เป็นรายได้เสริม คุณทำได้ดีกว่าที่คิด",
  },
  伤官: {
    story: "คุณฉลาด หัวไว กล้าคิดนอกกรอบ และมีพรสวรรค์ในการแสดงออก",
    advice: "เลือกคำพูดให้นุ่มนวลขึ้นอีกนิด ไอเดียดี ๆ จะได้รับการยอมรับง่ายขึ้น",
  },
  偏财: {
    story: "คุณมีโชคเรื่องเงินนอกเหนือจากงานประจำ มองเห็นโอกาสทางธุรกิจได้เร็ว",
    advice: "ลงทุนได้ แต่กำหนดเพดานความเสี่ยงไว้ก่อนทุกครั้ง",
  },
  正财: {
    story: "คุณเป็นคนขยัน รับผิดชอบ และบริหารเงินได้ดี รายได้มั่นคงจากความตั้งใจของตัวเอง",
    advice: "ออมและลงทุนแบบสม่ำเสมอ ระยะยาวจะเห็นผลชัดเจน",
  },
  七杀: {
    story: "คุณกล้าตัดสินใจ ทำงานได้ดีภายใต้แรงกดดัน และมีความทะเยอทะยานสูง",
    advice: "หาเวลาพักให้ใจได้ผ่อนคลาย อย่าแบกทุกอย่างไว้คนเดียว",
  },
  正官: {
    story: "คุณเป็นคนมีระเบียบ ซื่อตรง และได้รับความไว้วางใจให้รับผิดชอบเรื่องสำคัญ",
    advice: "งานที่มีโครงสร้างชัดเจนหรือองค์กรใหญ่จะช่วยให้คุณเติบโตได้เร็ว",
  },
  偏印: {
    story: "คุณมีความคิดลึกซึ้ง สัญชาตญาณดี และสนใจความรู้เฉพาะทางที่คนอื่นมองข้าม",
    advice: "พัฒนาความเชี่ยวชาญเฉพาะด้านให้ลึก จะกลายเป็นจุดขายของคุณ",
  },
  正印: {
    story: "คุณรักการเรียนรู้ มีผู้ใหญ่คอยเมตตา และมักได้รับการสนับสนุนในยามจำเป็น",
    advice: "ลงทุนกับการเรียนหรือใบรับรองเพิ่ม จะเปิดประตูโอกาสใหม่ ๆ",
  },
};

const el = (e: Element) => `ธาตุ${ELEMENT_INFO[e].th}`;
const joinTh = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(" ")} และ${items.at(-1)}`;

/** สร้างคำทำนายแบบเล่าเรื่องจากผลคำนวณ (ไม่ใช้ AI) */
export function interpretBazi(r: BaziResult): Reading[] {
  const dm = r.dayMaster;
  const dmEl = dm.stem.element;
  const readings: Reading[] = [];

  // ตัดคำว่า "ไม้หยาง" ฯลฯ ออก เหลือแค่ส่วนที่เป็นภาพเปรียบ
  const picture = DAY_MASTER_TEXT[dm.gan].replace(/^\S+ /, "");

  // ดาวที่ปรากฏมากที่สุด: ก้านฟ้าทุกเสา (ยกเว้นเสาวัน) + ชี่หลักของกิ่งดิน
  const gods = new Map<string, number>();
  for (const p of r.pillars) {
    if (p.key !== "day") gods.set(p.tenGod, (gods.get(p.tenGod) ?? 0) + 1);
    const main = p.hidden[0];
    if (main) gods.set(main.tenGod, (gods.get(main.tenGod) ?? 0) + 1);
  }
  const top = [...gods.entries()].sort((a, b) => b[1] - a[1])[0];
  const talent = top ? TALENT[top[0]] : undefined;

  readings.push({
    heading: "ตัวตนของคุณ",
    body: `คุณคือคน${el(dmEl)} ${picture}${talent ? ` ${talent.story}` : ""}`,
    advice: talent?.advice,
  });

  const fav = r.favorable;
  readings.push({
    heading: "พลังชีวิตของคุณ",
    body: r.strong
      ? "พลังในตัวคุณค่อนข้างเต็ม มีความมั่นใจและพึ่งพาตัวเองได้ดี สิ่งที่ต้องระวังคือการดื้อหรือทำทุกอย่างคนเดียวจนเหนื่อย พลังที่มีควรถูกปล่อยออกไปในงานหรือความคิดสร้างสรรค์"
      : "พลังในตัวคุณค่อนข้างอ่อนโยนและละเอียดอ่อน คุณจะทำได้ดีที่สุดเมื่อมีคนสนับสนุนหรือมีสภาพแวดล้อมที่ดี การรู้จักขอความช่วยเหลือไม่ใช่ความอ่อนแอ แต่เป็นจุดแข็งของคุณ",
    advice: `ทำกิจกรรมที่เติม${joinTh(fav.map(el))} เช่น ${fav.map((e) => ELEMENT_INFO[e].activities).join(" ")}`,
  });

  const missing = ELEMENTS.filter((e) => r.elementCounts[e] === 0);
  const most = [...ELEMENTS].sort((a, b) => r.elementCounts[b] - r.elementCounts[a])[0];
  readings.push({
    heading: "สมดุลในชีวิต",
    body:
      `ในดวงของคุณมี${el(most)}มากที่สุด ทำให้คุณเด่นเรื่อง${ELEMENT_INFO[most].trait} ` +
      (missing.length
        ? `แต่ขาด${joinTh(missing.map(el))} ซึ่งเกี่ยวกับ${joinTh(missing.map((e) => ELEMENT_INFO[e].trait))} เรื่องเหล่านี้อาจเป็นสิ่งที่คุณต้องตั้งใจฝึกเป็นพิเศษ`
        : "และมีครบทั้งห้าธาตุ ถือว่ามีพื้นฐานชีวิตที่สมดุลดี"),
    advice: missing.length
      ? `เติมสิ่งที่ขาดด้วยการ${missing.map((e) => ELEMENT_INFO[e].activities).join(" ")}`
      : "รักษาสมดุลไว้ด้วยการแบ่งเวลาให้ทั้งงาน ครอบครัว และตัวเอง",
  });

  if (r.luck) {
    const cur = r.luck.find((l) => l.current);
    const next = cur ? r.luck[r.luck.indexOf(cur) + 1] : r.luck[0];
    const parts: string[] = [];
    let advice = "";
    if (cur) {
      parts.push(
        cur.favorable
          ? `ช่วงปี ${cur.startYear}–${cur.endYear} ที่คุณอยู่ตอนนี้เป็นช่วงขาขึ้น พลังรอบตัวช่วยส่งเสริมคุณ`
          : `ช่วงปี ${cur.startYear}–${cur.endYear} ที่คุณอยู่ตอนนี้เป็นช่วงที่ต้องอดทนและค่อยเป็นค่อยไป`,
      );
      advice = cur.favorable
        ? "เป็นจังหวะดีที่จะเริ่มสิ่งใหม่ ขยายงาน หรือตัดสินใจเรื่องใหญ่"
        : "เน้นสะสมความรู้และเงินทุน หลีกเลี่ยงการเสี่ยงใหญ่ แล้วรอจังหวะที่ดีกว่า";
    }
    if (next) {
      parts.push(
        next.favorable
          ? `ช่วงถัดไปตั้งแต่ปี ${next.startYear} (อายุราว ${next.startAge} ปี) จะเป็นช่วงที่ดีขึ้น`
          : `ช่วงถัดไปตั้งแต่ปี ${next.startYear} (อายุราว ${next.startAge} ปี) ควรเตรียมตัวและวางแผนให้รอบคอบ`,
      );
    }
    readings.push({ heading: "จังหวะชีวิต 10 ปี", body: parts.join(" "), advice: advice || undefined });
  }

  readings.push({
    heading: "สิ่งเสริมดวง",
    body: `สิ่งที่ช่วยเสริมพลังให้คุณคือ${joinTh(fav.map(el))}`,
    advice:
      `สีมงคล: ${fav.map((e) => ELEMENT_INFO[e].color).join(" / ")} · ` +
      `ทิศที่ดี: ${[...new Set(fav.map((e) => ELEMENT_INFO[e].direction))].join(" ")}`,
  });
  return readings;
}
