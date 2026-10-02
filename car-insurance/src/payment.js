// Payment gateway จำลอง (mock)
// โครงสร้างเลียนแบบ gateway จริงในไทย เช่น Omise / 2C2P / GB Prime Pay:
//   1) ฝั่งเบราว์เซอร์ส่งข้อมูลบัตรไป "tokenize" ที่ gateway → ได้ token (เซิร์ฟเวอร์เราไม่เห็นเลขบัตร)
//   2) เซิร์ฟเวอร์เราสร้าง charge ด้วย token + ยอดเงิน (ยอดเงินคิดฝั่งเซิร์ฟเวอร์เสมอ)
//   3) PromptPay: ได้ QR → ลูกค้าสแกนจ่าย → gateway ยิง webhook กลับมาแจ้งผล
// เมื่อจะใช้งานจริง ให้แทนที่ไฟล์นี้ด้วย SDK ของ gateway โดยคง interface เดิม
const crypto = require('node:crypto');
const { isValidLuhn } = require('./validation');

const DEMO_BILLER_ID = '010753600031508'; // Biller ID ตัวอย่าง (ไม่ใช่บัญชีจริง)

// บัตรทดสอบ: ลงท้าย 0002 = ถูกปฏิเสธ, อื่น ๆ ที่ผ่าน Luhn = สำเร็จ
const DECLINED_SUFFIX = '0002';

const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

function cardBrand(number) {
  if (/^4/.test(number)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(number)) return 'Mastercard';
  if (/^35/.test(number)) return 'JCB';
  if (/^3[47]/.test(number)) return 'Amex';
  return 'Card';
}

function crc16(payload) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

// สร้าง payload Thai QR Payment (EMVCo, Bill Payment tag 30)
function promptPayPayload({ billerId, ref1, ref2 = '', amountSatang }) {
  const merchant =
    tlv('00', 'A000000677010112') + tlv('01', billerId) + tlv('02', ref1) + (ref2 ? tlv('03', ref2) : '');
  const body =
    tlv('00', '01') +
    tlv('01', '12') + // dynamic QR (ใช้ครั้งเดียว)
    tlv('30', merchant) +
    tlv('53', '764') +
    tlv('54', (amountSatang / 100).toFixed(2)) +
    tlv('58', 'TH') +
    '6304';
  return body + crc16(body);
}

class MockGateway {
  constructor(store, { onChargeCompleted } = {}) {
    this.store = store;
    this.onChargeCompleted = onChargeCompleted || (() => {});
  }

  // จำลอง endpoint tokenize ของ gateway (ของจริงเบราว์เซอร์จะเรียกตรงไปที่ gateway)
  createToken({ number, name, expMonth, expYear, cvc }, now = new Date()) {
    const num = String(number || '').replace(/\s/g, '');
    const errors = [];
    if (!isValidLuhn(num)) errors.push('หมายเลขบัตรไม่ถูกต้อง');
    if (!name || String(name).trim().length < 2) errors.push('กรุณาระบุชื่อบนบัตร');
    const m = Number(expMonth);
    let y = Number(expYear);
    if (y < 100) y += 2000;
    const expEnd = new Date(y, m, 1); // วันแรกของเดือนถัดไป
    if (!(m >= 1 && m <= 12) || !(expEnd > now)) errors.push('บัตรหมดอายุหรือวันหมดอายุไม่ถูกต้อง');
    if (!/^\d{3,4}$/.test(String(cvc || ''))) errors.push('CVV ไม่ถูกต้อง');
    if (errors.length) return { error: errors.join(', ') };

    const token = {
      id: newId('tokn'),
      brand: cardBrand(num),
      last4: num.slice(-4),
      // เก็บเฉพาะผลลัพธ์ที่ gateway จะตัดสิน ไม่เก็บเลขบัตร/CVV
      willDecline: num.endsWith(DECLINED_SUFFIX),
      used: false,
    };
    this.store.put('tokens', token.id, token);
    return { id: token.id, brand: token.brand, last4: token.last4 };
  }

  createCharge({ orderId, amountSatang, method, tokenId, ref1 }) {
    const charge = {
      id: newId('chrg'),
      orderId,
      amount: amountSatang,
      currency: 'THB',
      method,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (method === 'card') {
      const token = this.store.get('tokens', tokenId);
      if (!token || token.used) return { error: 'token ไม่ถูกต้องหรือถูกใช้ไปแล้ว' };
      token.used = true;
      this.store.put('tokens', token.id, token);
      charge.card = { brand: token.brand, last4: token.last4 };
      charge.status = token.willDecline ? 'failed' : 'successful';
      if (token.willDecline) charge.failureMessage = 'ธนาคารผู้ออกบัตรปฏิเสธรายการ';
      charge.paidAt = charge.status === 'successful' ? new Date().toISOString() : undefined;
    } else if (method === 'promptpay') {
      charge.qrPayload = promptPayPayload({ billerId: DEMO_BILLER_ID, ref1, amountSatang });
      charge.expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    } else {
      return { error: 'วิธีชำระเงินไม่รองรับ' };
    }

    this.store.put('charges', charge.id, charge);
    return { charge };
  }

  getCharge(id) {
    return this.store.get('charges', id);
  }

  // จำลองการที่ลูกค้าสแกนจ่ายสำเร็จ → gateway ส่ง webhook มาที่ระบบเรา
  simulatePromptPayPaid(chargeId) {
    const charge = this.getCharge(chargeId);
    if (!charge || charge.method !== 'promptpay') return { error: 'ไม่พบรายการ' };
    if (charge.status !== 'pending') return { charge };
    if (new Date(charge.expiresAt) < new Date()) {
      charge.status = 'expired';
    } else {
      charge.status = 'successful';
      charge.paidAt = new Date().toISOString();
    }
    this.store.put('charges', charge.id, charge);
    this.onChargeCompleted(charge);
    return { charge };
  }
}

module.exports = { MockGateway, promptPayPayload, crc16 };
