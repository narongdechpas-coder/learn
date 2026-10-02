// ตรวจสอบข้อมูลผู้เอาประกันและรถ

function isValidThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

function isValidLuhn(number) {
  if (!/^\d{12,19}$/.test(number)) return false;
  let sum = 0;
  for (let i = 0; i < number.length; i++) {
    let d = Number(number[number.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function validateOrderDetails(body, now = new Date()) {
  const errors = [];
  const h = body.holder || {};
  const v = body.vehicle || {};

  const holder = {
    title: str(h.title, 20),
    firstName: str(h.firstName, 80),
    lastName: str(h.lastName, 80),
    idCard: str(h.idCard, 20).replace(/[-\s]/g, ''),
    phone: str(h.phone, 20).replace(/[-\s]/g, ''),
    email: str(h.email, 120).toLowerCase(),
    address: str(h.address, 300),
  };
  if (!holder.firstName || !holder.lastName) errors.push('กรุณาระบุชื่อและนามสกุล');
  if (!isValidThaiId(holder.idCard)) errors.push('เลขบัตรประชาชนไม่ถูกต้อง');
  if (!/^0\d{8,9}$/.test(holder.phone)) errors.push('เบอร์โทรศัพท์ไม่ถูกต้อง');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holder.email)) errors.push('อีเมลไม่ถูกต้อง');
  if (holder.address.length < 10) errors.push('กรุณาระบุที่อยู่ให้ครบถ้วน');

  const vehicle = {
    plate: str(v.plate, 30),
    plateProvince: str(v.plateProvince, 50),
    chassisNo: str(v.chassisNo, 30).toUpperCase(),
  };
  if (!vehicle.plate) errors.push('กรุณาระบุทะเบียนรถ');
  if (!vehicle.plateProvince) errors.push('กรุณาระบุจังหวัดทะเบียนรถ');
  if (!/^[A-Z0-9]{10,20}$/.test(vehicle.chassisNo)) errors.push('เลขตัวถังไม่ถูกต้อง (ตัวอักษรอังกฤษ/ตัวเลข 10–20 หลัก)');

  const today = toIsoDate(now);
  const maxStart = toIsoDate(new Date(now.getTime() + 90 * 86400_000));
  const startDate = str(body.startDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate < today || startDate > maxStart) {
    errors.push('วันเริ่มคุ้มครองต้องอยู่ภายใน 90 วันนับจากวันนี้');
  }

  return { errors, holder, vehicle, startDate };
}

module.exports = { isValidThaiId, isValidLuhn, validateOrderDetails, toIsoDate };
