/* ABI Mobile App — Quote calculator wizard (real premium calculation) */
const { Icon: QIcon, Button: QButton, Badge: QBadge, Select: QSelect, Switch: QSwitch, Input: QInput } = window.AioiBangkokInsuranceDesignSystem_cf9069;

const baht = (n) => '฿' + Number(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

/* ---- Flow header with progress dots ---- */
function QuoteHeader({ title, sub, step, total, onBack }) {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '48px 16px 22px', overflow: 'hidden' }}>
      <window.Shard />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QIcon name="arrow-left" size={21} stroke={2.2} color="#fff" />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.2 }}>{title}</div>
            {sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>{sub}</div>}
          </div>
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? 'var(--red-500)' : 'rgba(255,255,255,0.2)', transition: 'background .2s ease' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Sticky bottom action bar ---- */
function StickyBar({ children }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid var(--ink-100)', padding: '12px 16px 30px' }}>
      {children}
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy-900)' }}>{children}</span>
      {hint && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-400)' }}>{hint}</span>}
    </div>
  );
}

const sbaht = (satang) => baht(satang / 100);
const beYear = (y) => 'ปี ' + (Number(y) + 543);

/* ปีที่เลือกได้ของรุ่น — ถ้าปีเดิมอยู่นอกช่วง ให้ขยับเข้าหาปีที่ใกล้ที่สุด */
function clampYear(model, year) {
  const ys = model.years;
  if (ys.includes(year)) return year;
  return year > ys[0] ? ys[0] : ys[ys.length - 1];
}

/* ===== STEP 1 — Car (dropdown: ยี่ห้อ → รุ่น → ปี) ===== */
function StepCar({ form, set, P }) {
  const brand = P.catalog.find(b => b.brand === form.brand);
  const model = brand.models.find(m => m.name === form.model);
  const body = P.bodyTypes.find(b => b.id === model.body);

  const modelPatch = (m) => ({ model: m.name, year: clampYear(m, form.year), sumInsured: m.value });
  const onBrand = (v) => { const b = P.catalog.find(x => x.brand === v); if (b) set({ brand: b.brand, ...modelPatch(b.models[0]) }); };
  const onModel = (v) => { const m = brand.models.find(x => x.name === v); if (m) set(modelPatch(m)); };

  return (
    <div style={{ padding: '18px 16px 0' }}>
      {/* รถที่เลือก + ประเภทตัวถัง (เลือกให้อัตโนมัติจากรุ่น) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1.5px solid var(--ink-200)', borderRadius: 16, padding: 10, marginBottom: 18 }}>
        <img src={window.CAR_PHOTOS[body.id]} alt={body.label} style={{ width: 92, height: 64, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--navy-900)', lineHeight: 1.2 }}>{form.brand} {form.model}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)' }}>{beYear(form.year)} · {body.label} ({body.sub})</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 22 }}>
        <QSelect label="ยี่ห้อรถ" value={form.brand} placeholder="เลือกยี่ห้อ"
          options={P.catalog.map(b => ({ value: b.brand, label: b.brand }))}
          onChange={e => onBrand(e.target.value)} />
        <QSelect label="รุ่นรถ" value={form.model} placeholder="เลือกรุ่น"
          options={brand.models.map(m => ({ value: m.name, label: m.name }))}
          onChange={e => onModel(e.target.value)} />
        <QSelect label="ปีรถ" value={String(form.year)} placeholder="เลือกปี"
          options={model.years.map(y => ({ value: String(y), label: beYear(y) }))}
          hint={model.since === model.years[model.years.length - 1] ? `${form.brand} ${form.model} เริ่มขายในไทยปี ${model.since + 543}` : undefined}
          onChange={e => set({ year: Number(e.target.value) })} />
      </div>

      <div>
        <FieldLabel hint="ใช้คำนวณเบี้ยประกัน">ทุนประกัน (มูลค่ารถ)</FieldLabel>
        <QInput value={form.sumInsured ? Number(form.sumInsured).toLocaleString() : ''} iconLeft="wallet" suffix="บาท"
          inputMode="numeric" error={form.sumInsured < P.sumInsured.min || form.sumInsured > P.sumInsured.max}
          hint={`${P.sumInsured.min.toLocaleString()} – ${P.sumInsured.max.toLocaleString()} บาท`}
          onChange={e => set({ sumInsured: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} />
        <input type="range" min="200000" max="3000000" step="10000" aria-label="ปรับทุนประกัน"
          value={Math.min(3000000, Math.max(200000, form.sumInsured || 200000))}
          onChange={e => set({ sumInsured: Number(e.target.value) })}
          style={{ width: '100%', marginTop: 12, accentColor: 'var(--navy-600)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)' }}>
          <span>2 แสน</span><span>3 ล้าน</span>
        </div>
      </div>
    </div>
  );
}

/* ===== STEP 2 — Coverage class (with live premium preview) ===== */
function StepClass({ form, set, P }) {
  let est = {};
  try { est = Object.fromEntries(window.Premium.estimateClasses(form).map(c => [c.id, c.total])); } catch (e) { /* ข้อมูลยังไม่ครบ */ }
  return (
    <div style={{ padding: '18px 16px 0' }}>
      <FieldLabel hint="ราคาประเมินต่อปี">เลือกระดับความคุ้มครอง</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {P.classes.map(cl => {
          const on = form.coverageClass === cl.id;
          return (
            <button key={cl.id} onClick={() => set({ coverageClass: cl.id })} style={{
              border: on ? '2px solid var(--red-500)' : '1.5px solid var(--ink-200)', cursor: 'pointer',
              background: '#fff', borderRadius: 16, padding: '14px 15px', textAlign: 'left', position: 'relative',
              boxShadow: on ? '0 6px 18px rgba(219,32,23,0.12)' : 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, marginTop: 2, border: on ? 'none' : '2px solid var(--ink-300)', background: on ? 'var(--red-500)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <QIcon name="check" size={15} stroke={3} color="#fff" />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--navy-900)' }}>{cl.label}</span>
                    {cl.popular && <QBadge tone="red" variant="soft" icon="star">ยอดนิยม</QBadge>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)', marginTop: 1 }}>{cl.tagline}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 9 }}>
                    {cl.perks.map((p, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-600)' }}>
                        <QIcon name={i === cl.perks.length - 1 && !cl.theft ? 'minus' : 'check'} size={13} stroke={2.4} color={i === cl.perks.length - 1 && cl.id !== '1' && cl.id !== '2plus' ? 'var(--ink-400)' : 'var(--green-500)'} />{p}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--ink-400)' }}>เริ่มต้น</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: on ? 'var(--red-600)' : 'var(--navy-900)', lineHeight: 1.1 }}>{est[cl.id] ? sbaht(est[cl.id]) : '–'}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--ink-400)' }}>/ปี</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===== STEP 3 — Options ===== */
function StepOptions({ form, set, P }) {
  const toggleAddon = (id) => {
    const has = form.addons.includes(id);
    set({ addons: has ? form.addons.filter(a => a !== id) : [...form.addons, id] });
  };
  const adjustAge = (d) => set({ driverAge: Math.min(80, Math.max(18, Number(form.driverAge) + d)) });
  return (
    <div style={{ padding: '18px 16px 0' }}>
      <FieldLabel>ประเภทการซ่อม</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {P.repair.map(r => {
          const on = form.repair === r.id;
          return (
            <button key={r.id} onClick={() => set({ repair: r.id })} style={{
              border: on ? '2px solid var(--navy-600)' : '1.5px solid var(--ink-200)', cursor: 'pointer',
              background: on ? 'var(--navy-50)' : '#fff', borderRadius: 14, padding: '13px 14px', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <QIcon name={r.id === 'dealer' ? 'building-2' : 'wrench'} size={20} stroke={2} color={on ? 'var(--navy-700)' : 'var(--ink-500)'} />
                {on && <QIcon name="check-circle" size={18} stroke={2.2} color="var(--navy-700)" />}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy-900)', marginTop: 8 }}>{r.label}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)' }}>{r.sub}</div>
            </button>
          );
        })}
      </div>

      <FieldLabel>อายุผู้ขับขี่หลัก</FieldLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1.5px solid var(--ink-200)', borderRadius: 14, padding: '10px 14px', marginBottom: 22 }}>
        <QIcon name="user-round" size={20} stroke={2} color="var(--ink-500)" />
        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink-600)' }}>{form.driverAge} ปี</span>
        <button aria-label="ลดอายุ" onClick={() => adjustAge(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--ink-200)', background: 'var(--ink-50)', cursor: 'pointer', fontSize: 20, color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <button aria-label="เพิ่มอายุ" onClick={() => adjustAge(1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--ink-200)', background: 'var(--ink-50)', cursor: 'pointer', fontSize: 20, color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>

      <FieldLabel hint="เลือกได้หลายรายการ">ความคุ้มครองเสริม</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {P.addons.map(a => {
          const on = form.addons.includes(a.id);
          return (
            <div key={a.id} onClick={() => toggleAddon(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              border: on ? '1.5px solid var(--red-300)' : '1.5px solid var(--ink-200)',
              background: on ? 'var(--red-50)' : '#fff', borderRadius: 14, padding: '12px 14px',
            }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: on ? 'var(--red-100)' : 'var(--navy-50)', color: on ? 'var(--red-600)' : 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><QIcon name={a.icon} size={20} stroke={2} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>{a.label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)' }}>{a.sub}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: a.discountPct ? 'var(--green-600)' : 'var(--navy-700)', whiteSpace: 'nowrap', marginRight: 4 }}>{a.discountPct ? '−' + Math.round(a.discountPct * 100) + '%' : '+' + baht(a.price)}</span>
              <QSwitch checked={on} onChange={() => toggleAddon(a.id)} />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid var(--ink-200)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><QIcon name="badge-check" size={20} stroke={2} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>รวม พ.ร.บ. (ภาคบังคับ)</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)' }}>+{sbaht(P.cmi)} ต่อปี</div>
        </div>
        <QSwitch checked={form.withCmi} onChange={() => set({ withCmi: !form.withCmi })} />
      </div>
    </div>
  );
}

/* ===== STEP 4 — Result / breakdown ===== */
function StepResult({ form, q, P, jump }) {
  const b = q.price;
  const body = P.bodyTypes.find(x => x.id === q.input.body);
  const repair = P.repair.find(r => r.id === form.repair);
  const line = (label, value, opts = {}) => (
    <div key={opts.k || label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: opts.last ? 'none' : '1px solid var(--ink-100)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: opts.color || 'var(--ink-600)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: opts.bold ? 800 : 600, fontSize: opts.bold ? 16 : 14.5, color: opts.color || 'var(--navy-900)' }}>{value}</span>
    </div>
  );
  return (
    <div style={{ padding: '0 0 8px' }}>
      <div style={{ position: 'relative', background: 'linear-gradient(135deg, var(--navy-600), var(--navy-900))', padding: '22px 20px 24px', color: '#fff', overflow: 'hidden' }}>
        <window.Shard />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>เบี้ยประกันรวมต่อปี</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 42, lineHeight: 1.1, marginTop: 2 }}>{sbaht(b.total)}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '5px 14px', fontFamily: 'var(--font-body)', fontSize: 12.5 }}>
            <QIcon name="calendar-clock" size={15} stroke={2} color="var(--sky-200)" />ผ่อน 0% ได้ {sbaht(b.monthly)}/เดือน
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <Chip icon="shield-check" text={'ประกัน' + b.classLabel} />
          <Chip icon="car" text={`${form.brand} ${form.model} · ${beYear(form.year)}`} />
          <Chip icon={repair.id === 'dealer' ? 'building-2' : 'wrench'} text={repair.label} />
          {b.phydDiscount > 0 && <Chip icon="gauge" text="PHYD" tone="green" />}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '4px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0 9px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, color: 'var(--navy-900)' }}>รายละเอียดเบี้ยประกัน</span>
            <button onClick={() => jump(0)} style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--navy-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>แก้ไข<QIcon name="pencil" size={13} stroke={2.2} /></button>
          </div>
          <div style={{ borderTop: '1px solid var(--ink-100)' }}>
            {line('ทุนประกัน · ' + body.label, baht(q.input.sumInsured))}
            {line('เบี้ยประกันภาคสมัครใจ ' + b.classLabel, sbaht(b.base))}
            {b.addons.map(a => line(a.label, '+' + sbaht(a.price), { k: a.id }))}
            {b.phydDiscount > 0 && line('ส่วนลด PHYD (−' + Math.round(b.phydPct * 100) + '%)', '−' + sbaht(b.phydDiscount), { color: 'var(--green-600)' })}
            {b.cmi > 0 && line('พ.ร.บ. (ภาคบังคับ)', sbaht(b.cmi))}
            {line('รวมทั้งสิ้น', sbaht(b.total), { bold: true, last: true })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '14px 4px 0' }}>
          <QIcon name="info" size={15} stroke={2} color="var(--ink-400)" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-400)', lineHeight: 1.5 }}>ราคารวมภาษีและอากรแสตมป์แล้ว · ราคาประเมินเบื้องต้นจากข้อมูลที่กรอก เบี้ยจริงขึ้นกับการตรวจสภาพรถและเงื่อนไขกรมธรรม์</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text, tone = 'navy' }) {
  const c = tone === 'green' ? ['var(--green-50)', 'var(--green-700)'] : ['var(--navy-50)', 'var(--navy-700)'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c[0], color: c[1], borderRadius: 99, padding: '5px 11px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5 }}>
      <QIcon name={icon} size={14} stroke={2} />{text}
    </span>
  );
}

/* Build a checkout order from the server-locked quote */
function motorOrder(quote) {
  const b = quote.price;
  const i = quote.input;
  return {
    quoteId: quote.quoteId,
    lineLabel: 'ประกันรถยนต์ ' + b.classLabel,
    title: `${i.brand} ${i.model}`,
    sub: beYear(i.year),
    photoKey: i.body, icon: 'car', badge: '1 ปี',
    rows: [
      { label: 'เบี้ยภาคสมัครใจ ' + b.classLabel, value: sbaht(b.base + b.addonTotal) },
      b.phydDiscount > 0 && { label: 'ส่วนลด PHYD (−' + Math.round(b.phydPct * 100) + '%)', value: '−' + sbaht(b.phydDiscount), green: true },
      b.cmi > 0 && { label: 'พ.ร.บ. (ภาคบังคับ)', value: sbaht(b.cmi) },
    ].filter(Boolean),
    total: b.total / 100, monthly: b.monthly / 100,
    quote,
  };
}

/* Build a renewal order from an existing policy */
function renewOrder(data, p) {
  const isMotor = p.kind === 'motor';
  const voluntary = p.premium;
  const pct = isMotor ? data.phyd.discount / 100 : 0.05;
  const discount = Math.round(voluntary * pct);
  const total = Math.max(0, Math.round(voluntary - discount));
  return {
    lineLabel: p.line, title: p.title, photoKey: p.photo, icon: p.icon, badge: 'ต่ออีก 1 ปี',
    rows: [
      { label: 'เบี้ยต่ออายุ', value: baht(voluntary) },
      { label: isMotor ? 'ส่วนลด PHYD (' + data.phyd.discount + '%)' : 'ส่วนลดลูกค้าต่อเนื่อง (5%)', value: '−' + baht(discount), green: true },
    ],
    total, monthly: Math.round(total / 10), voluntary, discount, pct, isMotor,
  };
}

/* ===== Renewal confirm screen ===== */
function RenewConfirm({ data, p, order, onClose, onConfirm }) {
  const src = p.photo && window.CAR_PHOTOS ? window.CAR_PHOTOS[p.photo] : null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
      <QuoteHeader title="ต่ออายุกรมธรรม์" sub={p.line} total={0} onBack={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {/* policy summary */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
              <span style={{ width: 54, height: 54, borderRadius: 13, overflow: 'hidden', flexShrink: 0, background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <QIcon name={p.icon} size={26} stroke={2} color={p.accent === 'red' ? 'var(--red-500)' : 'var(--navy-700)'} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.03em', color: 'var(--red-500)', textTransform: 'uppercase' }}>{p.line}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--navy-900)', lineHeight: 1.2 }}>{p.title}</div>
                {p.plate && <window.Mono style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>{p.plate}</window.Mono>}
              </div>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--ink-100)' }}>
              <div style={{ flex: 1, padding: '11px 14px', borderRight: '1px solid var(--ink-100)' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)' }}>หมดอายุเดิม</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--navy-900)' }}>{p.end}</div>
              </div>
              <div style={{ flex: 1, padding: '11px 14px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)' }}>คุ้มครองต่อ</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--green-600)' }}>อีก 1 ปี</div>
              </div>
            </div>
          </div>
        </div>

        {/* coverage retained */}
        <div style={{ padding: '20px 16px 0' }}>
          <window.SectionHead title="ความคุ้มครองที่ได้รับต่อ" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '4px 16px' }}>
            {p.coverage.map((c, i) => <window.CoverageLine key={i} label={c.label} value={c.value} last={i === p.coverage.length - 1} />)}
          </div>
        </div>

        {/* price breakdown */}
        <div style={{ padding: '20px 16px 0' }}>
          <window.SectionHead title="สรุปเบี้ยต่ออายุ" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '6px 16px 10px' }}>
            {order.rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: r.green ? 'var(--green-600)' : 'var(--ink-600)' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: r.green ? 'var(--green-600)' : 'var(--navy-900)' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 9px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, color: 'var(--navy-900)' }}>รวมทั้งสิ้น</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--navy-900)' }}>{baht(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
      <StickyBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-400)' }}>รวมต่อปี</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1 }}>{baht(order.total)}</div>
          </div>
          <QButton variant="primary" block size="lg" iconRight="arrow-right" onClick={onConfirm}>ต่ออายุเลย</QButton>
        </div>
      </StickyBar>
    </div>
  );
}

/* ===== Flow controller (dispatcher — no hooks) ===== */
function QuoteFlow(props) {
  if (props.mode === 'renew' && props.prefill) return <RenewFlow {...props} />;
  return <QuoteWizard {...props} />;
}

/* --- Renewal: confirm real policy → checkout --- */
function RenewFlow({ data, prefill, onClose, toast }) {
  const [checkout, setCheckout] = React.useState(false);
  const order = renewOrder(data, prefill);
  if (checkout) {
    return <window.CheckoutScreen data={data} order={order} mode="renew" prefill={prefill}
      onBack={() => setCheckout(false)} onClose={onClose} toast={toast} />;
  }
  return <RenewConfirm data={data} p={prefill} order={order} onClose={onClose} onConfirm={() => setCheckout(true)} />;
}

/* --- New-quote wizard --- */
function QuoteWizard({ data, onClose, toast, onPurchased }) {
  const u = data.user;
  const [P, setP] = React.useState(null);          // ผลิตภัณฑ์ + แคตตาล็อก จาก /api/options
  const [form, setForm] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [checkout, setCheckout] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const [loadError, setLoadError] = React.useState('');
  const load = () => {
    setLoadError('');
    window.ABI_API.options().then((opts) => {
      const toyota = opts.catalog.find(b => b.brand === 'Toyota') || opts.catalog[0];
      const m = toyota.models.find(x => x.name === 'Corolla Cross') || toyota.models[0];
      const thisYear = new Date().getFullYear();
      setP(opts);
      setForm({ brand: toyota.brand, model: m.name, year: clampYear(m, thisYear - 2), sumInsured: m.value,
        coverageClass: '1', repair: 'garage', driverAge: u.age, addons: ['phyd'], withCmi: true });
    }).catch((e) => setLoadError(e.message || 'โหลดข้อมูลไม่สำเร็จ'));
  };
  React.useEffect(load, []);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  let q = null;
  try { if (form) q = window.Premium.calculateQuote(form); } catch (e) { q = null; }

  if (checkout) {
    return <window.CheckoutScreen data={data} order={motorOrder(checkout)} mode="quote"
      onBack={() => setCheckout(null)} onClose={onClose} toast={toast} onPurchased={onPurchased} />;
  }

  const titles = ['ข้อมูลรถของคุณ', 'ระดับความคุ้มครอง', 'ปรับแต่งแผน', 'สรุปเบี้ยประกัน'];
  const back = () => { if (step === 0) onClose(); else setStep(s => s - 1); };
  const next = async () => {
    if (step < 3) return setStep(s => s + 1);
    // ล็อกราคาที่เซิร์ฟเวอร์ (คำนวณใหม่ฝั่งเซิร์ฟเวอร์ ไม่ใช้ราคาจากหน้าจอ)
    setBusy(true);
    try { setCheckout({ ...(await window.ABI_API.createQuote(form)) }); }
    catch (e) { toast(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
      <QuoteHeader title="เช็คเบี้ย · ซื้อประกัน" sub={titles[step]} step={step} total={4} onBack={back} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>
        {!P && !loadError && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--ink-500)' }}>กำลังโหลด…</div>}
        {!P && loadError && (
          <div role="alert" style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <QIcon name="wifi-off" size={32} stroke={2} color="var(--ink-400)" />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-900)' }}>โหลดข้อมูลรถไม่สำเร็จ</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)' }}>ตรวจสอบการเชื่อมต่อแล้วลองใหม่ ({loadError})</div>
            <QButton variant="outline" iconLeft="refresh-cw" onClick={load}>ลองใหม่</QButton>
          </div>
        )}
        {P && step === 0 && <StepCar form={form} set={set} P={P} />}
        {P && step === 1 && <StepClass form={form} set={set} P={P} />}
        {P && step === 2 && <StepOptions form={form} set={set} P={P} />}
        {P && step === 3 && q && <StepResult form={form} q={q} P={P} jump={setStep} />}
      </div>
      <StickyBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step >= 1 && q && (
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-400)' }}>{step === 3 ? 'รวมต่อปี' : 'ประเมิน'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1 }}>{sbaht(q.price.total)}</div>
            </div>
          )}
          <QButton variant="primary" block size="lg" iconRight="arrow-right" disabled={!q || busy} onClick={next}>
            {busy ? 'กำลังคำนวณ…' : step < 3 ? 'ถัดไป' : 'ซื้อเลย'}
          </QButton>
        </div>
      </StickyBar>
    </div>
  );
}

Object.assign(window, { QuoteFlow, QuoteHeader, StickyBar, RenewConfirm });
window.baht = baht;
