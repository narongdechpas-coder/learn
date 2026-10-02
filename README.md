# ✦ Horoscope Hub

รวมศาสตร์ดูดวงจากไทย ตะวันตก และจีน ไว้ในที่เดียว ทำงานในเบราว์เซอร์ทั้งหมด **ไม่ต้องใช้ API key และไม่ต้องมี server**

| ศาสตร์ | สถานะ |
| --- | --- |
| 🇹🇭 เลข 7 ตัว (ทักษา 4 ฐาน) | ✅ ใช้งานได้ |
| 🃏 ไพ่ป๊อก 52 ใบ (ไพ่ประจำวัน / อดีต-ปัจจุบัน-อนาคต) | ✅ ใช้งานได้ |
| 🔮 ไพ่ยิปซี (Tarot) Rider-Waite 78 ใบ (1 / 3 / ความรัก 5 / Celtic Cross 10 ใบ) | ✅ ใช้งานได้ |
| 🀄 ปาจื้อ (Bazi) สี่เสา ธาตุทั้งห้า วัยจร 10 ปี | ✅ ใช้งานได้ |

## เริ่มใช้งาน

```bash
npm install
npm run dev        # เปิด http://localhost:3000
```

คำสั่งอื่น ๆ

```bash
npm test           # unit tests (Vitest)
npm run lint       # ตรวจ type ด้วย TypeScript
npm run build      # สร้างเว็บแบบ static ไว้ที่โฟลเดอร์ out/
npm start          # เปิดเว็บจาก out/
```

โฟลเดอร์ `out/` เป็นไฟล์ static ล้วน นำไปวางบน GitHub Pages, Netlify หรือ Vercel ได้ทันที

## หลักการทำงาน

- **โค้ดคำนวณดวง** ด้วยฟังก์ชันที่ให้ผลเหมือนเดิมทุกครั้งและมีเทสต์ครอบคลุม
- **คำทำนาย** มาจากกฎและข้อความที่เขียนไว้ล่วงหน้า (`meanings.ts`, `deck.ts`) จึงไม่ต้องเรียก AI
- **แชร์ผลได้ด้วยลิงก์** วันเกิดหรือ seed ของไพ่เก็บอยู่ใน URL คนที่เปิดลิงก์จะเห็นผลเดียวกัน

### ปาจื้อ (Bazi)
- คำนวณสี่เสาด้วย [lunar-typescript](https://github.com/6tail/lunar-typescript) (MIT)
- เสาปีและเสาเดือนเปลี่ยนตามสารทจีน จึงแปลงเวลาไทยเป็นเวลาปักกิ่ง (+1 ชม.) ปีเปลี่ยนที่ลี่ชุน
- เสาวันและเสาชั่วโมงใช้เวลาสุริยะของกรุงเทพฯ (ช้ากว่านาฬิกาไทยราว 18 นาที)
- กำลังดวง: นับอักษรที่เป็นธาตุเดียวกับตัวเราหรือธาตุที่ให้กำเนิด โดยกิ่งเดือนมีน้ำหนัก 2 เท่า ถ้าได้ ≥ 50% ถือว่าดวงแข็ง ซึ่งเป็นวิธีแบบย่อ

### เลข 7 ตัว
1. แปลงวันเกิดเป็นวันทางจันทรคติไทยด้วยอัลกอริทึมสุริยยาตร (หรคุณ อวมาน ดิถี) รองรับปีอธิกมาส (8-8) และปีอธิกวาร
2. วันเริ่มเมื่อพระอาทิตย์ขึ้น (06:00) และวันพุธหลัง 18:00 นับเป็นราหู
3. แถว 1/2/3 เริ่มจากเลขวัน (อาทิตย์ = 1) เดือนจันทรคติ และปีนักษัตร (ชวด = 1) ตามลำดับ เลขที่เกิน 7 ให้ลบ 7 ออก แล้วนับเพิ่มทีละหนึ่งจนครบ 7 หลัก ส่วนแถว 4 คือผลรวมของแต่ละหลัก

## โครงสร้าง

```
src/
  app/                       # หน้าเว็บ (Next.js App Router, static export)
  components/
  lib/systems/
    registry.ts              # รายชื่อศาสตร์ทั้งหมด
    thai-seven/              # thai-lunar.ts, calculate.ts, meanings.ts + tests
    playing-cards/           # deck.ts, draw.ts, spreads.ts + tests
    tarot/                   # deck.ts (ความหมายไทย 78 ใบ), spreads.ts + tests
    bazi/                    # names.ts, calculate.ts + tests
  lib/random.ts              # PRNG แบบใส่ seed ใช้ร่วมกันทุกศาสตร์ไพ่
public/tarot/                # ภาพไพ่ยิปซี (WebP)
scripts/prepare-tarot-images.mjs
```

**เพิ่มศาสตร์ใหม่:** สร้าง `lib/systems/<id>/` และ `app/<id>/` แล้วเปลี่ยนรายการใน `registry.ts` เป็น `available: true`

## เครดิต

`thai-lunar.ts` พอร์ตมาจาก [KranaxALT/thailunar](https://github.com/KranaxALT/thailunar) (MIT) ซึ่งพอร์ตมาจาก [pythaidate](https://github.com/hmmbug/pythaidate) โดย Mark Hollow (MIT) อีกต่อหนึ่ง ผลลัพธ์ตรงกับ pythaidate ทุกวันตั้งแต่ ค.ศ. 1900–2100

ภาพไพ่ยิปซีเป็นสำรับ Rider-Waite ต้นฉบับปี 1909 (public domain) นำมาจากแพ็กเกจ [@cometpisces/tarot-kit-images](https://www.npmjs.com/package/@cometpisces/tarot-kit-images) แล้วแปลงเป็น WebP ด้วย `npm run tarot:images`

> คำทำนายทั้งหมดเพื่อความบันเทิง
