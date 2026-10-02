/* ABI Mobile App — mock data (individual motor customer, Thai-first) */

/* รูปรถ (ไฟล์ใน app/assets/photos — ตอน build แบบไฟล์เดียวจะถูกฝังเป็น data URI) */
window.CAR_PHOTOS = window.CAR_PHOTOS || {
  mine: 'assets/photos/car-mine.jpg',
  eco: 'assets/photos/car-eco.jpg',
  sedan: 'assets/photos/car-sedan.jpg',
  suv: 'assets/photos/car-suv.jpg',
  pickup: 'assets/photos/car-pickup.jpg',
};

window.ABI_DATA = {
  user: {
    name: 'ธนกร วงศ์สว่าง',
    firstName: 'ธนกร',
    memberId: 'ABI-2569-004182',
    since: '2562',
    tier: 'สมาชิก Prime',
    age: 38,
    phone: '081-234-5678',
    email: 'thanakorn.w@email.com',
  },

  // Policies held by the customer
  policies: [
    {
      id: 'motor1',
      kind: 'motor',
      icon: 'car',
      photo: 'mine',
      accent: 'navy',
      line: 'ประกันรถยนต์ ชั้น 1',
      title: 'Toyota Corolla Cross',
      sub: '1.8 HEV Premium · ปี 2566',
      plate: '1กก 2569',
      province: 'กรุงเทพมหานคร',
      policyNo: 'MOT-1-25690418',
      premium: 20800,
      sumInsured: 850000,
      start: '15 มี.ค. 2569',
      end: '15 มี.ค. 2570',
      daysLeft: 281,
      status: 'active',
      repairType: 'ซ่อมห้าง',
      garage: 'Toyota สุขุมวิท',
      coverage: [
        { label: 'ความเสียหายต่อรถยนต์ (สูญหาย/ไฟไหม้)', value: '850,000 บาท' },
        { label: 'รถยนต์เสียหายส่วนแรก', value: 'ไม่มี' },
        { label: 'บุคคลภายนอก / ชีวิต (ต่อคน)', value: '1,000,000 บาท' },
        { label: 'ทรัพย์สินบุคคลภายนอก', value: '5,000,000 บาท' },
        { label: 'อุบัติเหตุส่วนบุคคล (ต่อคน)', value: '200,000 บาท' },
        { label: 'ค่ารักษาพยาบาล (ต่อคน)', value: '200,000 บาท' },
        { label: 'ประกันตัวผู้ขับขี่', value: '300,000 บาท' },
      ],
    },
    {
      id: 'cmi',
      kind: 'cmi',
      icon: 'badge-check',
      photo: 'mine',
      accent: 'navy',
      line: 'พ.ร.บ. (ภาคบังคับ)',
      title: 'พ.ร.บ. รถยนต์',
      sub: 'Toyota Corolla Cross',
      plate: '1กก 2569',
      province: 'กรุงเทพมหานคร',
      policyNo: 'CMI-25690418',
      premium: 645.21,
      sumInsured: 0,
      start: '15 มี.ค. 2569',
      end: '15 มี.ค. 2570',
      daysLeft: 281,
      status: 'active',
      coverage: [
        { label: 'เสียชีวิต / ทุพพลภาพถาวร', value: '500,000 บาท' },
        { label: 'ค่ารักษาพยาบาล (ตามจริง)', value: '80,000 บาท' },
        { label: 'ชดเชยรายวัน (200 บาท/วัน)', value: 'สูงสุด 20 วัน' },
      ],
    },
    {
      id: 'pa',
      kind: 'pa',
      icon: 'heart-pulse',
      photo: null,
      accent: 'red',
      line: 'Buddy P.A. Plan',
      title: 'ประกันอุบัติเหตุส่วนบุคคล',
      sub: 'จ่าย 1 คุ้มครองถึง 2',
      plate: null,
      province: null,
      policyNo: 'PA-25690092',
      premium: 1200,
      sumInsured: 600000,
      start: '02 ก.พ. 2569',
      end: '22 มิ.ย. 2569',
      daysLeft: 15,
      status: 'expiring',
      coverage: [
        { label: 'เสียชีวิต / สูญเสียอวัยวะ (อบ.1)', value: '600,000 บาท' },
        { label: 'ค่ารักษาพยาบาลต่ออุบัติเหตุ', value: '60,000 บาท' },
        { label: 'คุ้มครองคู่สมรส (จ่าย 1 ได้ 2)', value: '300,000 บาท' },
      ],
    },
  ],

  // PHYD safe-driving snapshot
  phyd: {
    score: 88,
    grade: 'ดีเยี่ยม',
    discount: 18,
    nextDiscount: 22,
    trips: 142,
    km: 4820,
    metrics: [
      { label: 'เบรกนุ่มนวล', icon: 'gauge', score: 92, note: 'ดีเยี่ยม' },
      { label: 'ความเร็วเหมาะสม', icon: 'gauge-circle', score: 86, note: 'ดี' },
      { label: 'เข้าโค้งนุ่มนวล', icon: 'navigation', score: 90, note: 'ดีเยี่ยม' },
      { label: 'ขับช่วงกลางวัน', icon: 'sun', score: 84, note: 'ดี' },
    ],
    weeks: [72, 80, 76, 85, 88, 83, 91, 88],
  },

  // Recent activity / notifications
  activity: [
    { id: 'a1', icon: 'file-check-2', tone: 'success', title: 'ออกกรมธรรม์เรียบร้อย', desc: 'ประกันรถยนต์ ชั้น 1 · MOT-1-25690418', time: 'วันนี้ 09:24' },
    { id: 'a2', icon: 'receipt', tone: 'navy', title: 'ได้รับชำระเบี้ยประกัน', desc: '฿20,800 · บัตรเครดิต •••• 4827', time: 'เมื่อวาน' },
    { id: 'a3', icon: 'bell-ring', tone: 'warning', title: 'แจ้งเตือนต่ออายุ', desc: 'Buddy P.A. Plan จะหมดอายุใน 15 วัน', time: '2 วันก่อน' },
  ],

  notifications: [
    { id: 'n1', icon: 'clock-alert', tone: 'warning', title: 'กรมธรรม์ใกล้หมดอายุ', desc: 'Buddy P.A. Plan ของคุณจะหมดอายุใน 15 วัน แตะเพื่อต่ออายุทันที', time: '2 ชม.', unread: true, action: 'renew-pa' },
    { id: 'n2', icon: 'gift', tone: 'red', title: 'ส่วนลด PHYD เพิ่มเป็น 18%', desc: 'คะแนนขับขี่เดือนนี้ของคุณดีเยี่ยม รับส่วนลดต่ออายุสูงสุด 22% ในปีหน้า', time: 'วันนี้ 08:10', unread: true, action: 'phyd' },
    { id: 'n3', icon: 'file-check-2', tone: 'success', title: 'ออกกรมธรรม์เรียบร้อย', desc: 'ประกันรถยนต์ ชั้น 1 · MOT-1-25690418 พร้อมใช้งานในกระเป๋ากรมธรรม์', time: 'วันนี้ 09:24', unread: false },
    { id: 'n4', icon: 'receipt', tone: 'navy', title: 'ชำระเบี้ยประกันสำเร็จ', desc: '฿20,800 ผ่านบัตรเครดิต •••• 4827 ดูใบเสร็จได้ในเมนูเอกสาร', time: 'เมื่อวาน', unread: false },
    { id: 'n5', icon: 'megaphone', tone: 'navy', title: 'โปรโมชันประกันบ้าน Happy Home', desc: 'รับส่วนลด 15% เมื่อซื้อประกันบ้านคู่กับประกันรถยนต์ ภายในเดือนนี้', time: '3 วันก่อน', unread: false, action: 'home' },
  ],

  hotline: '1292',
};

/* แคตตาล็อกรถ ผลิตภัณฑ์ และสูตรคำนวณเบี้ย ย้ายไปอยู่ที่ src/catalog.js และ src/premium.js
   (ใช้ร่วมกับเซิร์ฟเวอร์) — หน้าแอปโหลดผ่าน window.ABI_API.options() และ window.Premium */
