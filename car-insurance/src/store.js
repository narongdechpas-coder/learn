// ที่เก็บข้อมูลแบบง่าย: เก็บในหน่วยความจำและบันทึกลงไฟล์ JSON
// สำหรับ production ควรเปลี่ยนเป็นฐานข้อมูลจริง (PostgreSQL, MySQL ฯลฯ)
const fs = require('node:fs');
const path = require('node:path');

class Store {
  constructor(file) {
    this.file = file;
    this.data = { quotes: {}, orders: {}, charges: {}, tokens: {}, counters: { policy: 0 } };
    if (file && fs.existsSync(file)) {
      Object.assign(this.data, JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  get(collection, id) {
    return this.data[collection][id];
  }

  put(collection, id, value) {
    this.data[collection][id] = value;
    this.save();
    return value;
  }

  nextPolicyNumber(now = new Date()) {
    this.data.counters.policy += 1;
    this.save();
    const beYear = now.getFullYear() + 543;
    return `VMI-${beYear}-${String(this.data.counters.policy).padStart(6, '0')}`;
  }
}

module.exports = { Store };
