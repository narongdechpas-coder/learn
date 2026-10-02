// รายการยี่ห้อ/รุ่นรถ (ตัวอย่างสำหรับเดโม)
// แต่ละรุ่น: [ชื่อรุ่น, ประเภทตัวถัง, ราคาประเมินเริ่มต้น (บาท), ปีที่เริ่มขายในไทย (ค.ศ.)]
// - ประเภทตัวถัง: eco | sedan | suv | pickup (ตาม QUOTE_CONFIG ของดีไซน์ ABI)
// - ปีที่เริ่มขาย: ปีรถที่เลือกได้ต้องไม่เก่ากว่าปีนี้ (เช่น Toyota bZ4X เริ่มขายในไทยปี 2025)
// ราคาและปีเป็นค่าประมาณ ควรตรวจสอบกับข้อมูลจริงของบริษัทก่อนใช้งาน
const RAW = [
  ['Toyota', [
    ['Yaris', 'eco', 599000, 2006], ['Yaris Ativ', 'eco', 649000, 2017], ['Corolla Altis', 'sedan', 929000, 2001],
    ['Camry', 'sedan', 1565000, 1990], ['Yaris Cross', 'suv', 789000, 2023], ['Corolla Cross', 'suv', 999000, 2020],
    ['Veloz', 'suv', 795000, 2022], ['Fortuner', 'suv', 1859000, 2005], ['bZ4X', 'suv', 1839000, 2025],
    ['Hilux Revo', 'pickup', 899000, 2015], ['Hilux Champ', 'pickup', 459000, 2023],
  ]],
  ['Honda', [
    ['Brio', 'eco', 459000, 2011], ['City', 'eco', 599000, 1996], ['City Hatchback', 'eco', 619000, 2021],
    ['Civic', 'sedan', 964000, 1990], ['Accord', 'sedan', 1499000, 1990], ['WR-V', 'suv', 759000, 2023],
    ['HR-V', 'suv', 999000, 2014], ['BR-V', 'suv', 889000, 2016], ['CR-V', 'suv', 1399000, 1996],
  ]],
  ['Isuzu', [['MU-X', 'suv', 1300000, 2013], ['D-Max', 'pickup', 879000, 2002]]],
  ['Mazda', [
    ['Mazda2', 'eco', 679000, 2009], ['Mazda3', 'sedan', 979000, 2005], ['CX-3', 'suv', 919000, 2015],
    ['CX-30', 'suv', 1029000, 2020], ['CX-5', 'suv', 1390000, 2013], ['BT-50', 'pickup', 859000, 2006],
  ]],
  ['Nissan', [
    ['Almera', 'eco', 549000, 2011], ['Note', 'eco', 624000, 2017], ['Sylphy', 'sedan', 879000, 2012],
    ['Kicks', 'suv', 889000, 2020], ['X-Trail', 'suv', 1399000, 2003], ['Terra', 'suv', 1199000, 2018],
    ['Navara', 'pickup', 849000, 2007],
  ]],
  ['MG', [
    ['MG3', 'eco', 579000, 2014], ['MG4 Electric', 'eco', 869000, 2022], ['MG5', 'sedan', 689000, 2015],
    ['ZS', 'suv', 689000, 2017], ['ZS EV', 'suv', 949000, 2019], ['HS', 'suv', 949000, 2019],
    ['Extender', 'pickup', 779000, 2019],
  ]],
  ['Mitsubishi', [
    ['Mirage', 'eco', 479000, 2012], ['Attrage', 'eco', 539000, 2013], ['Xpander', 'suv', 799000, 2018],
    ['Pajero Sport', 'suv', 1399000, 2008], ['Triton', 'pickup', 849000, 2005],
  ]],
  ['Ford', [['Everest', 'suv', 1599000, 2003], ['Ranger', 'pickup', 899000, 1998]]],
  ['Suzuki', [
    ['Swift', 'eco', 599000, 2009], ['Ciaz', 'eco', 529000, 2015], ['Ertiga', 'suv', 689000, 2013], ['XL7', 'suv', 759000, 2020],
  ]],
  ['BYD', [
    ['Dolphin', 'eco', 699000, 2023], ['Seal', 'sedan', 1325000, 2023], ['Atto 3', 'suv', 1099000, 2022],
    ['M6', 'suv', 949000, 2024], ['Sealion 6', 'suv', 1099000, 2024],
  ]],
  ['GWM', [['ORA Good Cat', 'eco', 829000, 2021], ['Haval Jolion', 'suv', 849000, 2021], ['Haval H6', 'suv', 1099000, 2021]]],
  ['Tesla', [['Model 3', 'sedan', 1599000, 2022], ['Model Y', 'suv', 1759000, 2022]]],
  ['BMW', [
    ['3 Series', 'sedan', 2599000, 1990], ['5 Series', 'sedan', 3299000, 1990], ['X1', 'suv', 2299000, 2010],
    ['X3', 'suv', 3099000, 2004], ['iX3', 'suv', 3099000, 2022],
  ]],
  ['Mercedes-Benz', [
    ['C-Class', 'sedan', 2690000, 1994], ['E-Class', 'sedan', 3290000, 1995], ['EQS', 'sedan', 6900000, 2022],
    ['GLA', 'suv', 2290000, 2014], ['GLC', 'suv', 3290000, 2016],
  ]],
];

const CATALOG = RAW.map(([brand, models]) => ({
  brand,
  models: models.map(([name, body, value, since]) => ({ name, body, value, since })),
}));

// ปีรถที่เลือกได้ย้อนหลังสูงสุด (ปีปัจจุบันลบ 13 = 14 ปี ตามดีไซน์ ปี 2556–2569)
const MAX_CAR_AGE = 13;

function findModel(brand, model) {
  return CATALOG.find((b) => b.brand === brand)?.models.find((m) => m.name === model) ?? null;
}

// ปีที่เลือกได้ของรุ่นนี้ (ใหม่ → เก่า) ไม่เก่ากว่าปีที่เริ่มขาย
function yearsFor(modelInfo, thisYear = new Date().getFullYear()) {
  const oldest = Math.max(modelInfo.since, thisYear - MAX_CAR_AGE);
  const years = [];
  for (let y = thisYear; y >= oldest; y--) years.push(y);
  return years;
}

module.exports = { CATALOG, MAX_CAR_AGE, findModel, yearsFor };
