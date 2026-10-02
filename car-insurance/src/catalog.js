// รายการยี่ห้อ/รุ่นรถยอดนิยมในไทย (ตัวอย่างสำหรับเดโม)
// type = ประเภทรถที่ระบบจะเลือกให้อัตโนมัติ (ผู้ใช้เปลี่ยนเองได้): sedan | suv | pickup | ev
const CATALOG = [
  ['Toyota', [
    ['Yaris', 'sedan'], ['Yaris Ativ', 'sedan'], ['Corolla Altis', 'sedan'], ['Corolla Cross', 'suv'],
    ['Camry', 'sedan'], ['Veloz', 'suv'], ['Fortuner', 'suv'], ['Hilux Revo', 'pickup'],
    ['Hilux Champ', 'pickup'], ['bZ4X', 'ev'],
  ]],
  ['Honda', [
    ['City', 'sedan'], ['City Hatchback', 'sedan'], ['Civic', 'sedan'], ['Accord', 'sedan'],
    ['WR-V', 'suv'], ['HR-V', 'suv'], ['BR-V', 'suv'], ['CR-V', 'suv'],
  ]],
  ['Isuzu', [['D-Max', 'pickup'], ['MU-X', 'suv']]],
  ['Mitsubishi', [
    ['Mirage', 'sedan'], ['Attrage', 'sedan'], ['Xpander', 'suv'], ['Pajero Sport', 'suv'], ['Triton', 'pickup'],
  ]],
  ['Nissan', [['Almera', 'sedan'], ['Kicks', 'suv'], ['Terra', 'suv'], ['Navara', 'pickup']]],
  ['Mazda', [
    ['Mazda2', 'sedan'], ['Mazda3', 'sedan'], ['CX-3', 'suv'], ['CX-30', 'suv'], ['CX-5', 'suv'], ['BT-50', 'pickup'],
  ]],
  ['Ford', [['Ranger', 'pickup'], ['Everest', 'suv']]],
  ['Suzuki', [['Swift', 'sedan'], ['Ciaz', 'sedan'], ['Ertiga', 'suv'], ['XL7', 'suv']]],
  ['MG', [
    ['MG3', 'sedan'], ['MG5', 'sedan'], ['ZS', 'suv'], ['HS', 'suv'], ['Extender', 'pickup'],
    ['MG4 Electric', 'ev'], ['ZS EV', 'ev'],
  ]],
  ['BYD', [['Dolphin', 'ev'], ['Atto 3', 'ev'], ['Seal', 'ev'], ['M6', 'ev'], ['Sealion 6', 'suv']]],
  ['GWM', [['ORA Good Cat', 'ev'], ['Haval Jolion', 'suv'], ['Haval H6', 'suv']]],
  ['Tesla', [['Model 3', 'ev'], ['Model Y', 'ev']]],
  ['BMW', [['3 Series', 'sedan'], ['5 Series', 'sedan'], ['X1', 'suv'], ['X3', 'suv'], ['iX3', 'ev']]],
  ['Mercedes-Benz', [['C-Class', 'sedan'], ['E-Class', 'sedan'], ['GLA', 'suv'], ['GLC', 'suv'], ['EQS', 'ev']]],
].map(([brand, models]) => ({ brand, models: models.map(([name, type]) => ({ name, type })) }));

function findModel(brand, model) {
  return CATALOG.find((b) => b.brand === brand)?.models.find((m) => m.name === model) ?? null;
}

module.exports = { CATALOG, findModel };
