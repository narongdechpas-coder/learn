import type { BodyType, Brand, CarModel, Staff, UsageCode, Vehicle } from '../types';

export const CURRENT_YEAR = 2026;

export const BRANDS: Brand[] = [
  { id: 'toyota', name: 'Toyota' },
  { id: 'honda', name: 'Honda' },
  { id: 'isuzu', name: 'Isuzu' },
  { id: 'mazda', name: 'Mazda' },
  { id: 'nissan', name: 'Nissan' },
  { id: 'mitsubishi', name: 'Mitsubishi' },
  { id: 'ford', name: 'Ford' },
  { id: 'mg', name: 'MG' },
  { id: 'byd', name: 'BYD' },
  { id: 'suzuki', name: 'Suzuki' },
  { id: 'hyundai', name: 'Hyundai' },
];

/** Codes a customer can pick in the catalogue flow. */
export const CATALOGUE_CODES: UsageCode[] = ['110', '210', '320'];
/** Codes offered for cars outside the catalogue (quote only). */
export const ALL_CODES: UsageCode[] = ['110', '120', '210', '220', '320', '340'];

const codesFor = (body: BodyType): UsageCode[] => (body === 'pickup' ? ['320', '110'] : body === 'van' ? ['210'] : ['110']);

const m = (
  brandId: string,
  id: string,
  name: string,
  body: CarModel['body'],
  yearFrom: number,
  yearTo: number,
  newPrice: number,
  noPackage = false,
): CarModel => ({ id: `${brandId}-${id}`, brandId, name, body, codes: codesFor(body), yearFrom, yearTo, newPrice, noPackage });

/** Sample catalogue. yearFrom/yearTo is the period the model was sold in Thailand. */
export const MODELS: CarModel[] = [
  m('toyota', 'yaris-ativ', 'Yaris Ativ', 'sedan', 2017, 2026, 609000),
  m('toyota', 'corolla-cross', 'Corolla Cross', 'suv', 2020, 2026, 1099000),
  m('toyota', 'camry', 'Camry', 'sedan', 2012, 2026, 1509000),
  m('toyota', 'hilux-revo', 'Hilux Revo', 'pickup', 2015, 2026, 859000),
  m('toyota', 'fortuner', 'Fortuner', 'suv', 2015, 2026, 1529000),
  m('toyota', 'commuter', 'Hiace Commuter', 'van', 2012, 2026, 1329000),
  m('toyota', 'majesty', 'Majesty', 'van', 2019, 2026, 1659000),
  m('honda', 'city', 'City', 'sedan', 2014, 2026, 649000),
  m('honda', 'civic', 'Civic', 'sedan', 2016, 2026, 1059000),
  m('honda', 'hr-v', 'HR-V', 'suv', 2014, 2026, 1009000),
  m('honda', 'cr-v', 'CR-V', 'suv', 2012, 2026, 1529000),
  m('honda', 'accord', 'Accord', 'sedan', 2013, 2026, 1649000),
  m('isuzu', 'd-max', 'D-Max', 'pickup', 2012, 2026, 819000),
  m('isuzu', 'mu-x', 'MU-X', 'suv', 2014, 2026, 1339000),
  m('mazda', 'mazda2', 'Mazda2', 'sedan', 2015, 2026, 609000),
  m('mazda', 'cx-30', 'CX-30', 'suv', 2020, 2026, 1099000),
  m('mazda', 'mx-5', 'MX-5', 'sedan', 2016, 2026, 2590000, true),
  m('nissan', 'almera', 'Almera', 'sedan', 2012, 2026, 599000),
  m('nissan', 'kicks', 'Kicks e-Power', 'suv', 2020, 2026, 959000),
  m('nissan', 'navara', 'Navara', 'pickup', 2014, 2026, 849000),
  m('nissan', 'urvan', 'Urvan', 'van', 2013, 2022, 1189000),
  m('mitsubishi', 'attrage', 'Attrage', 'sedan', 2013, 2026, 459000),
  m('mitsubishi', 'xpander', 'Xpander', 'suv', 2018, 2026, 859000),
  m('mitsubishi', 'triton', 'Triton', 'pickup', 2015, 2026, 799000),
  m('ford', 'ranger', 'Ranger', 'pickup', 2012, 2026, 899000),
  m('ford', 'everest', 'Everest', 'suv', 2015, 2026, 1599000),
  m('ford', 'ranger-raptor', 'Ranger Raptor', 'pickup', 2019, 2026, 1899000, true),
  m('mg', 'zs', 'MG ZS', 'suv', 2017, 2026, 699000),
  m('mg', 'mg5', 'MG5', 'sedan', 2021, 2026, 559000),
  m('mg', 'mg4', 'MG4 Electric', 'ev', 2023, 2026, 899000),
  m('byd', 'atto3', 'Atto 3', 'ev', 2022, 2026, 999000),
  m('byd', 'dolphin', 'Dolphin', 'ev', 2023, 2026, 699000),
  m('byd', 'seal', 'Seal', 'ev', 2023, 2026, 1325000, true),
  m('suzuki', 'swift', 'Swift', 'sedan', 2012, 2026, 549000),
  m('suzuki', 'ciaz', 'Ciaz', 'sedan', 2015, 2024, 549000),
  m('suzuki', 'ertiga', 'Ertiga', 'suv', 2019, 2026, 699000),
  m('hyundai', 'creta', 'Creta', 'suv', 2023, 2026, 899000),
  m('hyundai', 'h1', 'H-1', 'van', 2012, 2022, 1399000),
  m('hyundai', 'staria', 'Staria', 'van', 2021, 2026, 1659000),
];

export const STAFF: Staff[] = [
  { id: 's1', th: 'ปิยะนุช ศรีสุข', en: 'Piyanuch Srisuk', pace: 0.7 },
  { id: 's2', th: 'ธนกร วงศ์ใหญ่', en: 'Thanakorn Wongyai', pace: 0.9 },
  { id: 's3', th: 'กมลวรรณ ทองดี', en: 'Kamonwan Thongdee', pace: 1.0 },
  { id: 's4', th: 'ณัฐพล แก้วมณี', en: 'Nattapon Kaewmanee', pace: 1.35 },
  { id: 's5', th: 'สุภาวดี จันทร์เพ็ญ', en: 'Supawadee Janpen', pace: 1.7 },
];

export const PROVINCES = ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'ชลบุรี', 'เชียงใหม่', 'ขอนแก่น', 'นครราชสีมา', 'ภูเก็ต', 'สงขลา'];

export const brandById = (id: string) => BRANDS.find((b) => b.id === id)!;
export const modelById = (id: string) => MODELS.find((x) => x.id === id)!;
export const modelsOf = (brandId: string, code?: UsageCode) => MODELS.filter((x) => x.brandId === brandId && (!code || x.codes.includes(code)));
export const brandsFor = (code: UsageCode) => BRANDS.filter((b) => MODELS.some((x) => x.brandId === b.id && x.codes.includes(code)));
export const bodyForCode = (code: UsageCode): BodyType => (code === '320' || code === '340' ? 'pickup' : code === '210' || code === '220' ? 'van' : 'sedan');
export const staffById = (id?: string) => STAFF.find((s) => s.id === id);

export function yearsOf(model: CarModel): number[] {
  const out: number[] = [];
  for (let y = model.yearTo; y >= model.yearFrom; y--) out.push(y);
  return out;
}

/**
 * Suggested sum insured at today's value: showroom price depreciated ~10%/year
 * (5% in the first year), never below 30%, rounded down to 10,000 THB.
 */
export function suggestedSumInsured(model: CarModel, year: number): number {
  const age = Math.max(0, CURRENT_YEAR - year);
  const factor = Math.max(0.3, 0.95 * Math.pow(0.9, age));
  return Math.floor((model.newPrice * factor) / 10000) * 10000;
}

/** Customers may move the suggested sum insured by this much either way (trim levels differ). */
export const SI_FLEX = 0.05;
export const siRange = (suggested: number) => ({
  min: Math.ceil((suggested * (1 - SI_FLEX)) / 1000) * 1000,
  max: Math.floor((suggested * (1 + SI_FLEX)) / 1000) * 1000,
});

export const vehicleLabel = (modelId: string, year: number) => {
  const md = modelById(modelId);
  return `${brandById(md.brandId).name} ${md.name} ${year}`;
};

export const CUSTOM_MODEL_ID = 'custom';
export const MIN_CUSTOM_YEAR = 1990;

/** Catalogue model for a vehicle, or a stand-in built from what the customer typed. */
export function modelOfVehicle(v: Vehicle): CarModel {
  if (!v.custom) return modelById(v.modelId);
  return { id: CUSTOM_MODEL_ID, brandId: v.brandId, name: v.custom.model, body: bodyForCode(v.usage), codes: [v.usage], yearFrom: v.year, yearTo: v.year, newPrice: 0, noPackage: true };
}

export const vehicleText = (v: Vehicle) => (v.custom ? `${v.custom.brand} ${v.custom.model} ${v.year}` : vehicleLabel(v.modelId, v.year));
