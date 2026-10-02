# Partner Desk: LINE OA สำหรับคู่ค้าประกันภัย

ชุดไฟล์ Rich Menu และ Mockup สำหรับ LINE OA ที่ให้บริการนายหน้า ตัวแทน และดีลเลอร์

## ในชุดนี้มีอะไร

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `index.html` | Mockup หน้าแชทแบบกดได้ เปิดด้วยเบราว์เซอร์ได้เลย ฝั่งขวามีสเปกสำหรับทีมพัฒนา |
| `richmenu/richmenu-main.png` | ภาพ Rich Menu หลังยืนยันตัวตน 2500×1686 px (6 ช่อง) |
| `richmenu/richmenu-pre.png` | ภาพ Rich Menu ก่อนยืนยันตัวตน 2500×843 px (2 ช่อง) |
| `richmenu/richmenu-main.json` | โครงสร้าง Rich Menu หลัก (bounds + action) สำหรับ Messaging API |
| `richmenu/richmenu-pre.json` | โครงสร้าง Rich Menu ก่อนยืนยันตัวตน |
| `scripts/deploy-richmenu.sh` | สคริปต์สร้างเมนู อัปโหลดภาพ ตั้งเมนูเริ่มต้น และสร้าง alias |

## ผังปุ่มเมนูหลัก

| ช่อง | ปุ่ม | Action |
|---|---|---|
| A | เช็คเบี้ยประกัน | `uri` → LIFF `/quote` |
| B | งานต่ออายุ (เดือนนี้/เดือนหน้า) | `postback` `action=renewal&month=current` |
| C | ขอสำเนากรมธรรม์ | `postback` `action=policy_copy` |
| D | รับชำระ / Credit Limit | `postback` `action=credit_status` |
| E | ข้อมูลคู่ค้า | `postback` `action=partner_profile` |
| F | ติดต่อเจ้าหน้าที่ | `message` “ติดต่อเจ้าหน้าที่” |

## วิธีติดตั้งเมนู

```bash
CHANNEL_ACCESS_TOKEN=xxxx LIFF_ID=xxxx ./scripts/deploy-richmenu.sh
```

สคริปต์ตั้ง `partner-pre` เป็นเมนูเริ่มต้นของทุกคน เมื่อคู่ค้ายืนยันตัวตนสำเร็จ ให้ backend ผูก `partner-main` กับผู้ใช้คนนั้น:

```bash
curl -X POST -H "Authorization: Bearer $CHANNEL_ACCESS_TOKEN" \
  https://api.line.me/v2/bot/user/{userId}/richmenu/{MAIN_ID}
```

ต้องมี `curl` และ `jq` ก่อนรันสคริปต์

## หมายเหตุ

- ข้อมูลใน Mockup เป็นตัวอย่างสมมติทั้งหมด
- ภาพ Rich Menu เป็นภาพนิ่ง ตัวเลขอย่างจำนวนงานต่ออายุให้ส่งเป็น push message ต้นเดือน
- ทุกคำขอข้อมูลกรมธรรม์และการเงินต้องตรวจว่า LINE userId ผูกกับรหัสคู่ค้า และลูกค้าเป็นของคู่ค้ารายนั้น
- ภาพแต่ละไฟล์ต้องไม่เกิน 1 MB (ไฟล์ในชุดนี้ประมาณ 680 KB และ 420 KB)
