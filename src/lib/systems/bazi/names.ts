// ชื่อภาษาไทยและความหมายสำหรับปาจื้อ (Bazi)

export type Element = "wood" | "fire" | "earth" | "metal" | "water";

export const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];

export interface ElementInfo {
  th: string;
  zh: string;
  color: string;
  direction: string;
  trait: string;
  /** กิจกรรมที่ช่วยเติมธาตุนี้ */
  activities: string;
}

export const ELEMENT_INFO: Record<Element, ElementInfo> = {
  wood: { th: "ไม้", zh: "木", color: "เขียว", direction: "ทิศตะวันออก", trait: "การเติบโต ความเมตตา ความคิดสร้างสรรค์", activities: "ปลูกต้นไม้ อ่านหนังสือ เรียนสิ่งใหม่" },
  fire: { th: "ไฟ", zh: "火", color: "แดง ชมพู ม่วง", direction: "ทิศใต้", trait: "ความกระตือรือร้น การแสดงออก ชื่อเสียง", activities: "ออกกำลังกาย รับแดดยามเช้า พบปะผู้คน" },
  earth: { th: "ดิน", zh: "土", color: "เหลือง น้ำตาล ครีม", direction: "ตรงกลาง/ภายในบ้าน", trait: "ความมั่นคง ความน่าเชื่อถือ ความอดทน", activities: "จัดบ้าน ทำสวน ทำอาหาร วางแผนชีวิตให้เป็นระบบ" },
  metal: { th: "ทอง", zh: "金", color: "ขาว เทา เงิน ทอง", direction: "ทิศตะวันตก", trait: "ความเด็ดขาด ระเบียบ ความยุติธรรม", activities: "จัดระเบียบของ วางแผนการเงิน ฝึกวินัยให้ตัวเอง" },
  water: { th: "น้ำ", zh: "水", color: "ดำ น้ำเงิน กรมท่า", direction: "ทิศเหนือ", trait: "สติปัญญา การปรับตัว การสื่อสาร", activities: "เดินทาง ว่ายน้ำ นั่งสมาธิ ฟังเพลง" },
};

/** ธาตุที่ "ให้กำเนิด" ธาตุนี้ (วงจรก่อเกิด: ไม้→ไฟ→ดิน→ทอง→น้ำ→ไม้) */
export const PRODUCED_BY: Record<Element, Element> = {
  wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
};
/** ธาตุที่ธาตุนี้ให้กำเนิด */
export const PRODUCES: Record<Element, Element> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
/** ธาตุที่ธาตุนี้ข่ม (วงจรข่ม: ไม้→ดิน→น้ำ→ไฟ→ทอง→ไม้) */
export const CONTROLS: Record<Element, Element> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};
/** ธาตุที่ข่มธาตุนี้ */
export const CONTROLLED_BY: Record<Element, Element> = {
  earth: "wood", water: "earth", fire: "water", metal: "fire", wood: "metal",
};

export interface StemInfo {
  th: string;
  element: Element;
  yang: boolean;
}

/** ก้านฟ้า 10 */
export const STEMS: Record<string, StemInfo> = {
  甲: { th: "เจี่ย", element: "wood", yang: true },
  乙: { th: "อี่", element: "wood", yang: false },
  丙: { th: "ปิ่ง", element: "fire", yang: true },
  丁: { th: "ติง", element: "fire", yang: false },
  戊: { th: "อู้", element: "earth", yang: true },
  己: { th: "จี่", element: "earth", yang: false },
  庚: { th: "เกิง", element: "metal", yang: true },
  辛: { th: "ซิน", element: "metal", yang: false },
  壬: { th: "เหริน", element: "water", yang: true },
  癸: { th: "กุ่ย", element: "water", yang: false },
};

export interface BranchInfo {
  th: string;
  animal: string;
  element: Element;
}

/** กิ่งดิน 12 */
export const BRANCHES: Record<string, BranchInfo> = {
  子: { th: "จื่อ", animal: "ชวด (หนู)", element: "water" },
  丑: { th: "โฉ่ว", animal: "ฉลู (วัว)", element: "earth" },
  寅: { th: "อิ๋น", animal: "ขาล (เสือ)", element: "wood" },
  卯: { th: "เหม่า", animal: "เถาะ (กระต่าย)", element: "wood" },
  辰: { th: "เฉิน", animal: "มะโรง (มังกร)", element: "earth" },
  巳: { th: "ซื่อ", animal: "มะเส็ง (งู)", element: "fire" },
  午: { th: "อู่", animal: "มะเมีย (ม้า)", element: "fire" },
  未: { th: "เว่ย", animal: "มะแม (แพะ)", element: "earth" },
  申: { th: "เซิน", animal: "วอก (ลิง)", element: "metal" },
  酉: { th: "โหย่ว", animal: "ระกา (ไก่)", element: "metal" },
  戌: { th: "ซวี", animal: "จอ (หมา)", element: "earth" },
  亥: { th: "ไฮ่", animal: "กุน (หมู)", element: "water" },
};

export interface TenGodInfo {
  th: string;
  meaning: string;
}

/** เทพทั้งสิบ (十神) เทียบกับธาตุประจำตัว */
export const TEN_GODS: Record<string, TenGodInfo> = {
  比肩: { th: "เพื่อนร่วมทาง", meaning: "ความเป็นตัวของตัวเอง เพื่อนฝูง พี่น้อง ความมั่นใจ" },
  劫财: { th: "คู่แข่ง", meaning: "การแข่งขัน ความกล้าเสี่ยง แต่ระวังการเสียทรัพย์เพราะคนใกล้ตัว" },
  食神: { th: "เทพแห่งผลผลิต", meaning: "ความสุขในชีวิต ฝีมือ ความคิดสร้างสรรค์ การกินดีอยู่ดี" },
  伤官: { th: "ดาวแห่งพรสวรรค์", meaning: "ความฉลาดหลักแหลม การแสดงออก กล้าท้าทายกฎเกณฑ์" },
  偏财: { th: "ทรัพย์จร", meaning: "โชคลาภ การลงทุน รายได้นอกเหนือจากงานประจำ" },
  正财: { th: "ทรัพย์ประจำ", meaning: "รายได้มั่นคง ความขยัน การบริหารเงินอย่างรอบคอบ" },
  七杀: { th: "ดาวอำนาจเด็ดขาด", meaning: "ความกล้าตัดสินใจ ความกดดัน ความทะเยอทะยาน" },
  正官: { th: "ดาวขุนนาง", meaning: "ตำแหน่งหน้าที่ ความรับผิดชอบ ชื่อเสียงที่ได้รับการยอมรับ" },
  偏印: { th: "ผู้อุปถัมภ์นอกแบบ", meaning: "ความรู้เฉพาะทาง สัญชาตญาณ ความสนใจในศาสตร์ลึกลับ" },
  正印: { th: "ผู้อุปถัมภ์", meaning: "การเรียนรู้ ความเมตตาจากผู้ใหญ่ การได้รับการสนับสนุน" },
};

/** บุคลิกตามธาตุประจำตัว (ก้านฟ้าของเสาวัน) */
export const DAY_MASTER_TEXT: Record<string, string> = {
  甲: "ไม้หยาง เปรียบเหมือนต้นไม้ใหญ่ ตรงไปตรงมา มีหลักการ ชอบเป็นผู้นำและช่วยเหลือผู้อื่น แต่อาจดื้อและไม่ยอมโอนอ่อน",
  乙: "ไม้หยิน เปรียบเหมือนไม้เลื้อยหรือดอกไม้ อ่อนโยน ปรับตัวเก่ง เข้ากับคนง่าย ใช้ความนุ่มนวลไปถึงเป้าหมาย",
  丙: "ไฟหยาง เปรียบเหมือนดวงอาทิตย์ ร่าเริง ใจกว้าง เปิดเผย ชอบเป็นจุดสนใจ แต่อาจใจร้อนและหมดไฟเร็ว",
  丁: "ไฟหยิน เปรียบเหมือนแสงเทียน อบอุ่น ละเอียดอ่อน ช่างสังเกต เป็นที่พึ่งทางใจของคนรอบตัว",
  戊: "ดินหยาง เปรียบเหมือนภูเขา หนักแน่น น่าเชื่อถือ อดทน เป็นหลักให้คนอื่นได้ แต่อาจเปลี่ยนแปลงช้า",
  己: "ดินหยิน เปรียบเหมือนดินในสวน ใส่ใจรายละเอียด เลี้ยงดูผู้อื่นเก่ง ประนีประนอม แต่อาจคิดมาก",
  庚: "ทองหยาง เปรียบเหมือนดาบหรือเหล็กกล้า เด็ดเดี่ยว ยุติธรรม กล้าได้กล้าเสีย แต่อาจพูดตรงจนแข็งกระด้าง",
  辛: "ทองหยิน เปรียบเหมือนเครื่องประดับ ประณีต รักความสวยงาม มีรสนิยม แต่อาจอ่อนไหวต่อคำวิจารณ์",
  壬: "น้ำหยาง เปรียบเหมือนแม่น้ำหรือมหาสมุทร ฉลาด มองการณ์ไกล ชอบอิสระและการเดินทาง แต่อาจไม่อยู่นิ่ง",
  癸: "น้ำหยิน เปรียบเหมือนฝนหรือน้ำค้าง มีจินตนาการ ญาณหยั่งรู้ดี อ่อนโยน แต่อาจเก็บความรู้สึกไว้คนเดียว",
};
