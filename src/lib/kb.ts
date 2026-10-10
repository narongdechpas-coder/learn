import type { CoverRule, Product } from '../types';
import { getCatalog, onSale, priceRange } from '../data/products';
import { CMI_STANDARD, installmentPlan, REQUIRED_DOCS } from '../data/packages';
import { COVER_KEYS, getTravelProducts, getZones, SCHENGEN_MIN_MEDICAL, travelOnSale } from '../data/travel';
import { OCCUPATIONS, PA_COVER_KEYS, getPaProducts, paOnSale } from '../data/pa';
import { BUILDINGS, CONSTRUCTIONS, buildingName, fireOnSale, getFireProducts, getFireSettings } from '../data/fire';
import { COVERAGE_LABEL, DOC_LABEL, translate, type TKey } from '../i18n';

/**
 * The chatbot's knowledge: what is on sale to customers right now, written out as plain text from the
 * same catalogues the website uses (so a price or rule the back office changes is what the bot quotes).
 * Only products open to the customer website are included; nothing about partners, commission or cases.
 */

const baht = (n: number) => `${Math.round(n).toLocaleString('en-US')} บาท`;
const th = (k: TKey) => translate('th', k);
const EXTRA: Record<string, TKey> = { flood: 'pxFlood', roadside: 'pxRoadside', towing: 'pxTowing', courtesyCar: 'pxCourtesy', evBattery: 'pxEvBattery', glass: 'pxGlass' };

function rule(r: CoverRule) {
  switch (r.mode) {
    case 'si':
      return 'เท่าทุนประกัน';
    case 'fixed':
      return baht(r.value);
    case 'pct':
      return `${r.value}% ของทุนประกัน${r.cap ? ` สูงสุด ${baht(r.cap)}` : ''}`;
    default:
      return 'ไม่คุ้มครอง';
  }
}

function motor(p: Product) {
  const range = priceRange(p);
  const lines = [
    `### ${p.nameTh || COVERAGE_LABEL.th[p.type]} (${COVERAGE_LABEL.th[p.type]})`,
    p.tagTh && `จุดเด่น: ${p.tagTh}`,
    ...p.highlightsTh.map((h) => `- ${h}`),
    range && `เบี้ยประมาณ ${baht(range[0])} – ${baht(range[1])} ต่อปี (ขึ้นกับรุ่นรถ ทุนประกัน และรหัสรถ ต้องเลือกรถบนเว็บเพื่อดูราคาจริง)`,
    p.repair && `การซ่อม: ${p.repair === 'dealer' ? 'ซ่อมห้าง' : 'ซ่อมอู่'}`,
    `ค่าเสียหายส่วนแรก: ${p.deductible ? baht(p.deductible) : 'ไม่มี'}`,
    p.ownDamage.mode !== 'none' && `ความเสียหายต่อตัวรถ: ${rule(p.ownDamage)}`,
    p.fireTheft.mode !== 'none' && `รถหาย / ไฟไหม้: ${rule(p.fireTheft)}`,
    p.tpbiPerson && `บุคคลภายนอก: เสียชีวิต/บาดเจ็บ ${baht(p.tpbiPerson)} ต่อคน ${baht(p.tpbiAccident)} ต่อครั้ง · ทรัพย์สิน ${baht(p.tppd)}`,
    p.pa && `อุบัติเหตุส่วนบุคคล (ร.ย.01) ผู้ขับขี่ ${baht(p.pa)} · ผู้โดยสาร ${baht(p.paPassenger)} ต่อคน · ค่ารักษา (ร.ย.02) ${baht(p.medical)} ต่อคน · ประกันตัว (ร.ย.03) ${baht(p.bail)}`,
    p.extras.length > 0 && `รวมความคุ้มครองเสริม: ${p.extras.map((x) => th(EXTRA[x])).join(', ')}`,
    p.maxAge && `รับรถอายุไม่เกิน ${p.maxAge} ปี`,
    `เอกสาร: ${(p.docs.length ? p.docs : REQUIRED_DOCS[p.type]).map((k) => DOC_LABEL.th[k]).join(', ')}`,
    p.saleUntil && `ขายถึง ${p.saleUntil}`,
    p.termsTh && `เงื่อนไข: ${p.termsTh}`,
    p.exclusionsTh.length > 0 && `ข้อยกเว้น: ${p.exclusionsTh.join(' / ')}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildKnowledge(now = Date.now()): string {
  const out: string[] = [];
  out.push(`# Jacky ประกันภัย (บริษัทสมมติสำหรับเดโม)
ขายผ่านเว็บไซต์: ประกันรถยนต์ ประกันเดินทาง ประกันอุบัติเหตุส่วนบุคคล (PA) และประกันอัคคีภัย (บ้านอยู่อาศัย / ร้านค้า-สำนักงาน)
ติดต่อเจ้าหน้าที่: LINE @jacky-demo · โทร 02-000-0000 · ทุกวัน 08:00–20:00 · แจ้งเหตุ/เคลม 1234 ตลอด 24 ชม.
ชำระเงิน: QR พร้อมเพย์ หรือบัตรเครดิต/เดบิต · ผ่อน 0% ด้วยบัตร: เบี้ยตั้งแต่ ${baht(4000)} ผ่อน 6 เดือน, ตั้งแต่ ${baht(10000)} ผ่อน 10 เดือน (ตัวอย่าง: เบี้ย 12,000 บาท ผ่อน ${installmentPlan(12000)!.monthly.toLocaleString('en-US')} บาท × 10)
รับกรมธรรม์: e-Policy (PDF) ทางอีเมลทันที หรือกรมธรรม์กระดาษส่ง EMS 3–5 วันทำการ (เลือกใช้ที่อยู่ตามบัตรประชาชน หรือระบุที่อยู่เอง)
เอกสารแนบเป็นไฟล์ .jpg ไม่เกิน 3MB · ถ่ายรูปบัตรประชาชนให้ระบบกรอกชื่อ เลขบัตร ที่อยู่ให้อัตโนมัติได้
ติดตามสถานะคำขอได้ที่เมนู "ติดตามคำขอ" ด้วยเลขที่คำขอ (JKY-...) หรือเลขทะเบียนรถ
ราคาทั้งหมดรวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว`);

  // ---- Motor
  const live = getCatalog().filter((p) => onSale(p, 'self', undefined, now));
  out.push(`## ประกันรถยนต์
ขั้นตอนบนเว็บ: เลือกรหัสรถ (110 เก๋ง/รถยนต์นั่ง, 210 รถตู้, 320 กระบะ) ยี่ห้อ รุ่น ปี → ระบบแนะนำทุนประกัน ปรับได้ ±5% → เทียบแพ็กเกจ (ได้สูงสุด 3) → กรอกข้อมูล
- ชั้น 2+, 3+ และ พ.ร.บ. ซื้อเองได้ทันที: แนบสำเนาเล่มรถและบัตรประชาชน ชำระแล้วได้กรมธรรม์ทันที
- ชั้น 1: แนบรูปรถ 4 ด้าน (หน้า หลัง ซ้าย ขวา) สำเนาเล่มรถและบัตรประชาชน แล้วกดยืนยันส่ง เจ้าหน้าที่ตรวจและออกกรมธรรม์
- รถที่ไม่อยู่ในรายการหรือรุ่นที่ไม่มีแพ็กเกจ: ขอใบเสนอราคา เจ้าหน้าที่ติดต่อกลับภายในเวลาทำการ
- ซื้อ พ.ร.บ. เพิ่มคู่กับประกันภาคสมัครใจได้ · พ.ร.บ. ราคามาตรฐาน: 110 = ${baht(CMI_STANDARD['110']!)}, 210 = ${baht(CMI_STANDARD['210']!)}, 320 = ${baht(CMI_STANDARD['320']!)}
- ต่ออายุกับ Jacky ไม่ต้องแนบเอกสารใหม่ · มีส่วนลดไม่มีเคลมประมาณ 5% · ตั้งเตือนต่ออายุล่วงหน้า 60/30/7 วันได้

${live.map(motor).join('\n\n')}`);

  // ---- Travel
  const zones = getZones();
  const travel = getTravelProducts().filter((p) => travelOnSale(p, 'self', undefined, now));
  out.push(`## ประกันเดินทางต่างประเทศ
แบบ: รายเที่ยว 1–180 วัน หรือรายปี (คุ้มครอง 1 ปี เดินทางได้ไม่จำกัดครั้ง ครั้งละไม่เกิน 90 วัน) · 1 คนต่อ 1 กรมธรรม์ · วันเริ่มเดินทางต้องเป็นวันนี้หรือหลังจากนี้
เอกสาร: แนบสำเนาบัตรประชาชนและหนังสือเดินทาง (ระบบอ่านรูปและกรอกข้อมูลให้) ชำระแล้วได้กรมธรรม์และหนังสือรับรองทันที ไม่ต้องรอเจ้าหน้าที่
ประกันเดินทางรายเที่ยวไม่มีการต่ออายุ
วีซ่าเชงเก้น: ใช้ยื่นได้เมื่อโซนรองรับเชงเก้นและค่ารักษาพยาบาลไม่น้อยกว่า ${baht(SCHENGEN_MIN_MEDICAL)} (ประมาณ 30,000 ยูโร) หนังสือรับรองมีข้อความรับรองให้
โซน:
${zones.map((z) => `- ${z.nameTh}: ${z.noteTh}${z.schengen ? ' (ใช้ยื่นวีซ่าเชงเก้นได้)' : ''}`).join('\n')}

${travel
  .map((p) => {
    const cover = COVER_KEYS.map((k) => `${th(({ medical: 'trcMedical', death: 'trcDeath', evacuation: 'trcEvacuation', tripCancel: 'trcTripCancel', baggage: 'trcBaggage', baggageDelay: 'trcBaggageDelay', flightDelay: 'trcFlightDelay', liability: 'trcLiability' } as const)[k])} ${p.cover[k] ? baht(p.cover[k]) : 'ไม่คุ้มครอง'}`).join(' · ');
    const single = p.single.map((r) => `${r.dayFrom}–${r.dayTo} วัน: ${zones.map((z) => (r.prices[z.id] ? `${z.nameTh} ${baht(r.prices[z.id])}` : null)).filter(Boolean).join(', ')}`).join('\n  ');
    const annual = zones.map((z) => (p.annual[z.id] ? `${z.nameTh} ${baht(p.annual[z.id])}` : null)).filter(Boolean).join(', ');
    return [
      `### ${p.nameTh}${p.badge === 'recommended' ? ' (แนะนำ)' : ''}`,
      p.tagTh && `จุดเด่น: ${p.tagTh}`,
      `ความคุ้มครอง: ${cover}`,
      `เบี้ยรายเที่ยวต่อคน:\n  ${single}`,
      annual && `เบี้ยรายปี: ${annual}`,
      `รับอายุไม่เกิน ${p.maxAge} ปี · อายุเกิน ${p.loadAge} ปี เบี้ยเพิ่ม ${p.loadPct}%`,
      p.termsTh && `เงื่อนไข: ${p.termsTh}`,
      p.exclusionsTh.length > 0 && `ข้อยกเว้น: ${p.exclusionsTh.join(' / ')}`,
    ].filter(Boolean).join('\n');
  })
  .join('\n\n')}`);

  // ---- Personal accident
  const pa = getPaProducts().filter((p) => paOnSale(p, 'self', undefined, now));
  const paCover: Record<string, string> = { death: th('pacDeath'), medical: th('pacMedical'), hospitalDaily: th('pacHospital'), funeral: th('pacFuneral') };
  const occ = (cls: number) => OCCUPATIONS.filter((o) => o.cls === cls && !o.other).map((o) => o.th).join(', ');
  out.push(`## ประกันอุบัติเหตุส่วนบุคคล (PA)
คุ้มครองอุบัติเหตุ 24 ชั่วโมงทั่วโลก 1 ปี · 1 คนต่อ 1 กรมธรรม์ ต้องระบุผู้รับประโยชน์ · แนบสำเนาบัตรประชาชน (ระบบอ่านรูปและกรอกข้อมูลให้)
วันเริ่มคุ้มครองต้องเป็นวันนี้หรือหลังจากนี้
ขั้นอาชีพ (เบี้ยต่างกันตามขั้น):
- ขั้น 1 งานในสำนักงาน: ${occ(1)}
- ขั้น 2 งานนอกสถานที่/ขับขี่: ${occ(2)}
- ขั้น 3 ใช้แรงงาน/เครื่องจักร: ${occ(3)}
- อาชีพเสี่ยงสูง ไม่รับประกันออนไลน์ (ติดต่อเจ้าหน้าที่): ${OCCUPATIONS.filter((o) => o.cls === 4).map((o) => o.th).join(', ')}
- อาชีพอื่นๆ ที่ไม่อยู่ในรายการ: เลือก "อื่นๆ (ระบุ)" ราคาเบื้องต้นคิดตามขั้น 2 และเจ้าหน้าที่พิจารณาก่อนออกกรมธรรม์
คำถามสุขภาพ 3 ข้อ: มีความพิการ/สูญเสียอวัยวะ/ทุพพลภาพหรือไม่ · เป็นโรคลมชัก โรคหัวใจ หรือโรคที่ทำให้หมดสติหรือไม่ · เคยถูกปฏิเสธ/เพิ่มเบี้ย/ยกเลิกประกันอุบัติเหตุหรือประกันชีวิตหรือไม่
การออกกรมธรรม์: ตอบ "ไม่ใช่" ทุกข้อและอาชีพขั้น 1–2 → ชำระแล้วออกกรมธรรม์ทันที · ตอบ "ใช่" ข้อใดข้อหนึ่ง อาชีพขั้น 3 หรืออาชีพอื่นๆ → ส่งใบคำขอให้เจ้าหน้าที่พิจารณาภายใน 1 วันทำการ
ขับขี่หรือซ้อนท้ายรถจักรยานยนต์: ไม่คุ้มครองตามปกติ ซื้อความคุ้มครองเพิ่มได้ (เบี้ยเพิ่มตามที่ระบุในแต่ละแผน)
ต่ออายุทุกปีได้ถึงอายุที่ระบุ ราคาเดิม ไม่ต้องตอบคำถามสุขภาพใหม่ · ตั้งเตือนต่ออายุได้

${pa
  .map((p) =>
    [
      `### ${p.nameTh}${p.badge === 'recommended' ? ' (แนะนำ)' : ''}`,
      p.tagTh && `จุดเด่น: ${p.tagTh}`,
      `ความคุ้มครอง: ${PA_COVER_KEYS.map((k) => `${paCover[k]} ${p.cover[k] ? `${baht(p.cover[k])}${k === 'hospitalDaily' ? ' ต่อวัน' : ''}` : 'ไม่คุ้มครอง'}`).join(' · ')}`,
      `เบี้ยต่อปี: ขั้น 1 ${baht(p.prices[1])} · ขั้น 2 ${baht(p.prices[2])} · ขั้น 3 ${baht(p.prices[3])}${p.motorcyclePct ? ` · ซื้อเพิ่มจักรยานยนต์ +${p.motorcyclePct}%` : ''}`,
      `อายุรับประกัน ${p.minAge}–${p.maxAge} ปี ต่ออายุได้ถึง ${p.renewAge} ปี`,
      p.termsTh && `เงื่อนไข: ${p.termsTh}`,
      p.exclusionsTh.length > 0 && `ข้อยกเว้น: ${p.exclusionsTh.join(' / ')}`,
    ].filter(Boolean).join('\n'),
  )
  .join('\n\n')}`);
  // ---- Fire
  const fs = getFireSettings();
  const fire = getFireProducts().filter((p) => fireOnSale(p, 'self', undefined, now));
  const cLabel: Record<string, string> = { concrete: th('fiConcrete'), mixed: th('fiMixed'), wood: th('fiWood') };
  const pLabel: Record<string, string> = { flood: th('fiFlood'), storm: th('fiStorm'), quake: th('fiQuake'), hail: th('fiHail') };
  out.push(`## ประกันอัคคีภัย
แพ็กเกจแยก 2 กลุ่ม: บ้านอยู่อาศัย (${BUILDINGS.home.map((b) => buildingName(b, 'th')).join(', ')}) และร้านค้า/สำนักงาน (${BUILDINGS.shop.map((b) => buildingName(b, 'th')).join(', ')})
ความคุ้มครองหลัก: ไฟไหม้ ฟ้าผ่า ระเบิด ต่อตัวอาคารและทรัพย์สินภายใน (ร้านค้า: สต็อกสินค้าและอุปกรณ์) · เลือกภัยเพิ่มได้: น้ำท่วม ลมพายุ แผ่นดินไหว ลูกเห็บ · คุ้มครอง 1 ปี ต่ออายุได้ (ไม่ต้องแนบเอกสารใหม่) ตั้งเตือนต่ออายุได้
${fs.mode === 'rate' ? `วิธีคิดเบี้ย (ตอนนี้ขายแบบกำหนดทุนเอง): ลูกค้ากรอกทุนอาคารและทุนทรัพย์สินเอง ระบบแนะนำทุนอาคาร = พื้นที่ใช้สอย × ค่าก่อสร้างต่อ ตร.ม. (${(Object.keys(fs.costPerSqm) as (keyof typeof fs.costPerSqm)[]).map((b) => `${buildingName(b, 'th')} ${baht(fs.costPerSqm[b])}`).join(', ')}) · เบี้ย = ทุนรวม ÷ 1,000 × อัตรา (‰) ตามโครงสร้าง + อัตราภัยเพิ่ม ไม่ต่ำกว่าเบี้ยขั้นต่ำ` : 'วิธีคิดเบี้ย (ตอนนี้ขายแบบแผนสำเร็จรูป): ทุนและราคาคงที่ตามแผน ภัยเพิ่มบวกราคาคงที่ต่อภัย'}
ข้อมูลที่ต้องใช้: ที่ตั้งทรัพย์ (ที่อยู่ จังหวัด) ลักษณะอาคาร โครงสร้าง พื้นที่ ปีที่สร้าง เป็นเจ้าของหรือผู้เช่า ผู้รับประโยชน์ (เช่น ธนาคารผู้ให้กู้) ประวัติไฟไหม้/เคลม 3 ปี · แนบสำเนาบัตรประชาชน (ระบบอ่านรูปและกรอกให้) และรูปบ้านด้านหน้า 1 รูป · วันเริ่มคุ้มครองต้องเป็นวันนี้หรือหลังจากนี้
การออกกรมธรรม์: ส่วนใหญ่ชำระแล้วออกทันที · ส่งให้เจ้าหน้าที่พิจารณาก่อน (ภายใน 1 วันทำการ) เมื่อ: ทุนรวมเกิน ${baht(fs.referralSi)}, อาคารไม้ทั้งหลัง, เคยเกิดไฟไหม้หรือเคลมใน 3 ปี, หรือทรัพย์อยู่ในจังหวัดพื้นที่น้ำท่วมบ่อย (${fs.floodProvinces.join(', ')})

${fire
  .map((p) =>
    [
      `### ${p.nameTh}${p.badge === 'recommended' ? ' (แนะนำ)' : ''} (${p.occupancy === 'home' ? 'บ้านอยู่อาศัย' : 'ร้านค้า/สำนักงาน'})`,
      p.tagTh && `จุดเด่น: ${p.tagTh}`,
      p.mode === 'rate'
        ? `อัตราเบี้ยต่อปี: ${CONSTRUCTIONS.map((c) => `${cLabel[c]} ${p.rates[c]}‰`).join(' · ')} · ภัยเพิ่ม: ${p.perils.map((x) => `${pLabel[x]} +${p.perilRates[x]}‰`).join(', ')} · เบี้ยขั้นต่ำ ${baht(p.minPremium)} (ตัวอย่าง: บ้านคอนกรีต ทุนรวม 3,000,000 บาท ไม่มีภัยเพิ่ม = ${baht(Math.max(p.minPremium, Math.round((3000 * p.rates.concrete) / 10) * 10))})`
        : `ทุนอาคาร ${baht(p.planBuildingSi)} · ทุนทรัพย์สิน ${baht(p.planContentsSi)} · ราคา ${baht(p.planPrice)} ต่อปี · ภัยเพิ่ม: ${p.perils.map((x) => `${pLabel[x]} +${baht(p.perilPrices[x])}`).join(', ')}`,
      p.termsTh && `เงื่อนไข: ${p.termsTh}`,
      p.exclusionsTh.length > 0 && `ข้อยกเว้น: ${p.exclusionsTh.join(' / ')}`,
    ].filter(Boolean).join('\n'),
  )
  .join('\n\n')}`);
  return out.join('\n\n');
}
