export type Origin = "thai" | "western" | "chinese";

export interface SystemInfo {
  id: string;
  name: string;
  origin: Origin;
  description: string;
  /** false = แสดงเป็น "เร็ว ๆ นี้" */
  available: boolean;
  href: string;
}

export const ORIGIN_LABELS: Record<Origin, string> = {
  thai: "ศาสตร์ไทย",
  western: "ศาสตร์ตะวันตก",
  chinese: "ศาสตร์จีน",
};

// เพิ่มศาสตร์ใหม่: สร้างโฟลเดอร์ใน lib/systems/<id> และหน้าใน app/<id> แล้วลงทะเบียนที่นี่
export const SYSTEMS: SystemInfo[] = [
  {
    id: "thai-seven",
    name: "เลข 7 ตัว",
    origin: "thai",
    description: "ทักษาเลข 7 ตัว 4 ฐาน คำนวณจากวัน เดือนจันทรคติ และปีนักษัตรเกิด",
    available: true,
    href: "/thai-seven",
  },
  {
    id: "playing-cards",
    name: "ไพ่ป๊อก",
    origin: "western",
    description: "เปิดไพ่ 52 ใบ ดูดวงประจำวัน หรืออดีต ปัจจุบัน อนาคต",
    available: true,
    href: "/playing-cards",
  },
  {
    id: "tarot",
    name: "ไพ่ยิปซี (Tarot)",
    origin: "western",
    description: "สำรับ Rider-Waite 78 ใบ มีไพ่ประจำวัน ความรัก และ Celtic Cross",
    available: true,
    href: "/tarot",
  },
  {
    id: "bazi",
    name: "ปาจื้อ (Bazi)",
    origin: "chinese",
    description: "สี่เสาดวงชะตาจากปีเดือนวันเวลาเกิด ธาตุทั้งห้า และวัยจรทุก 10 ปี",
    available: true,
    href: "/bazi",
  },
];
