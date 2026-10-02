/* ABI Mobile App — Checkout + Success (order-driven; used by quote & renewal) */
const { Icon: KIcon, Button: KButton, Badge: KBadge, Input: KInput } = window.AioiBangkokInsuranceDesignSystem_cf9069;
const kbaht = window.baht;

function PayMethod({ icon, label, sub, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
      border: on ? '2px solid var(--navy-600)' : '1.5px solid var(--ink-200)', background: on ? 'var(--navy-50)' : '#fff',
      borderRadius: 14, padding: '13px 14px',
    }}>
      <span style={{ width: 40, height: 40, borderRadius: 11, background: '#fff', border: '1px solid var(--ink-100)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><KIcon name={icon} size={20} stroke={2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-500)' }}>{sub}</div>
      </div>
      <span style={{ width: 22, height: 22, borderRadius: 99, flexShrink: 0, border: on ? 'none' : '2px solid var(--ink-300)', background: on ? 'var(--navy-700)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {on && <KIcon name="check" size={13} stroke={3} color="#fff" />}
      </span>
    </button>
  );
}

/* ต่ออายุ (renewal) — ยังเป็นการจำลองตามดีไซน์เดิม */
function RenewCheckout({ data, order, mode, prefill, onBack, onClose, toast }) {
  const [pay, setPay] = React.useState('card');
  const [plan, setPlan] = React.useState('full'); // full | instal
  const [plate, setPlate] = React.useState(prefill ? (prefill.plate || '') : '');
  const [name, setName] = React.useState(data.user.name);
  const [done, setDone] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  const instalMonthly = order.monthly;
  const policyNo = React.useMemo(() => (mode === 'renew' && prefill ? prefill.policyNo : (order.prefix || 'MOT-1-2569') + Math.floor(1000 + Math.random() * 8999)), []);
  const photo = order.photoKey && window.CAR_PHOTOS ? window.CAR_PHOTOS[order.photoKey] : null;

  const doPay = () => { setProcessing(true); setTimeout(() => { setProcessing(false); setDone(true); }, 1400); };

  if (done) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 75, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>
          <div style={{ position: 'relative', background: 'linear-gradient(160deg, var(--green-500), var(--green-700))', padding: '64px 20px 46px', textAlign: 'center', overflow: 'hidden' }}>
            <window.Shard />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sheetUp .4s ease' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KIcon name="check" size={36} stroke={3} color="var(--green-600)" /></div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff' }}>{mode === 'renew' ? 'ต่ออายุสำเร็จ!' : 'ซื้อประกันสำเร็จ!'}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 4, textWrap: 'pretty' }}>กรมธรรม์ของคุณพร้อมใช้งานแล้วในกระเป๋ากรมธรรม์</div>
            </div>
          </div>

          <div style={{ margin: '-22px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', padding: '16px 18px' }}>
            <Row label="เลขที่กรมธรรม์" mono value={policyNo} />
            <Row label="แผนประกัน" value={order.lineLabel} />
            <Row label="รายการ" value={order.title} />
            <Row label="วิธีชำระเงิน" value={pay === 'card' ? 'บัตรเครดิต •••• 4827' : pay === 'promptpay' ? 'พร้อมเพย์ QR' : 'โอนผ่านบัญชี'} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--ink-100)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-500)' }}>ยอดชำระ</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--navy-900)' }}>{kbaht(plan === 'instal' ? instalMonthly : order.total)}{plan === 'instal' && <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>/เดือน</span>}</span>
            </div>
          </div>

          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--navy-50)', borderRadius: 14, padding: '13px 14px' }}>
              <KIcon name="mail-check" size={20} stroke={2} color="var(--navy-700)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.5 }}>ส่งกรมธรรม์และใบเสร็จไปที่ <strong style={{ color: 'var(--navy-900)' }}>{data.user.email}</strong> เรียบร้อยแล้ว</span>
            </div>
          </div>
        </div>
        <window.StickyBar>
          <div style={{ display: 'flex', gap: 10 }}>
            <KButton variant="outline" block iconLeft="wallet-cards" onClick={() => { onClose(); toast('เปิดกระเป๋ากรมธรรม์'); }}>ดูกรมธรรม์</KButton>
            <KButton variant="primary" block iconLeft="home" onClick={() => { onClose(); toast('ยินดีต้อนรับสู่ความคุ้มครองใหม่ของคุณ'); }}>เสร็จสิ้น</KButton>
          </div>
        </window.StickyBar>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 75, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
      <window.QuoteHeader title="ชำระเงิน" sub="ตรวจสอบและยืนยันคำสั่งซื้อ" total={0} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {/* order summary */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <KIcon name={order.icon || 'shield-check'} size={24} stroke={2} color="var(--navy-700)" />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.03em', color: 'var(--red-500)', textTransform: 'uppercase' }}>{order.lineLabel}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--navy-900)' }}>{order.title}</div>
              </div>
              <KBadge tone="success" variant="soft" icon="shield-check">{order.badge || '1 ปี'}</KBadge>
            </div>
            <div style={{ padding: '6px 14px 10px' }}>
              {order.rows.map((r, i) => <Row key={i} label={r.label} value={r.value} green={r.green} small />)}
            </div>
          </div>
        </div>

        {/* holder */}
        <div style={{ padding: '18px 16px 0' }}>
          <SectionTitle>ผู้เอาประกัน</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KInput label="ชื่อ-นามสกุล" value={name} onChange={e => setName(e.target.value)} iconLeft="user-round" />
            <KInput label="ทะเบียนรถ / เลขอ้างอิง" value={plate} onChange={e => setPlate(e.target.value)} placeholder="เช่น 1กก 2569" iconLeft="car" />
          </div>
        </div>

        {/* payment plan */}
        <div style={{ padding: '18px 16px 0' }}>
          <SectionTitle>รูปแบบการชำระ</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setPlan('full')} style={planBtn(plan === 'full')}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--navy-900)' }}>จ่ายเต็มจำนวน</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--navy-900)', marginTop: 2 }}>{kbaht(order.total)}</div>
            </button>
            <button onClick={() => setPlan('instal')} style={planBtn(plan === 'instal')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--navy-900)' }}>ผ่อน 0%</span><KBadge tone="red" variant="soft">10 ด.</KBadge></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--navy-900)', marginTop: 2 }}>{kbaht(instalMonthly)}<span style={{ fontSize: 12, color: 'var(--ink-500)' }}>/ด.</span></div>
            </button>
          </div>
        </div>

        {/* payment method */}
        <div style={{ padding: '18px 16px 0' }}>
          <SectionTitle>วิธีชำระเงิน</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PayMethod icon="credit-card" label="บัตรเครดิต / เดบิต" sub="Visa •••• 4827" on={pay === 'card'} onClick={() => setPay('card')} />
            <PayMethod icon="qr-code" label="พร้อมเพย์ QR" sub="สแกนจ่ายผ่านแอปธนาคาร" on={pay === 'promptpay'} onClick={() => setPay('promptpay')} />
            <PayMethod icon="building-2" label="โอนผ่านบัญชีธนาคาร" sub="ตัดบัญชีอัตโนมัติ" on={pay === 'bank'} onClick={() => setPay('bank')} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px 0' }}>
          <KIcon name="lock" size={14} stroke={2} color="var(--ink-400)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-400)' }}>ชำระเงินปลอดภัยด้วยการเข้ารหัส SSL 256-bit</span>
        </div>
      </div>

      <window.StickyBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-400)' }}>{plan === 'instal' ? 'ต่อเดือน' : 'ยอดชำระ'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1 }}>{kbaht(plan === 'instal' ? instalMonthly : order.total)}</div>
          </div>
          <KButton variant="primary" block size="lg" iconLeft={processing ? undefined : 'shield-check'} disabled={processing} onClick={doPay}>{processing ? 'กำลังดำเนินการ…' : 'ยืนยันชำระเงิน'}</KButton>
        </div>
      </window.StickyBar>
    </div>
  );
}

function planBtn(on) {
  return { textAlign: 'left', cursor: 'pointer', border: on ? '2px solid var(--navy-600)' : '1.5px solid var(--ink-200)', background: on ? 'var(--navy-50)' : '#fff', borderRadius: 14, padding: '12px 14px' };
}
function SectionTitle({ children }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-900)', marginBottom: 11 }}>{children}</div>;
}
function Row({ label, value, mono, small, green }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: small ? '7px 0' : '9px 0' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: small ? 13.5 : 14, color: 'var(--ink-500)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontWeight: 600, fontSize: small ? 13.5 : 14.5, color: green ? 'var(--green-600)' : 'var(--navy-900)' }}>{value}</span>
    </div>
  );
}

Object.assign(window, { RenewCheckout, PayMethod, planBtn, SectionTitle, Row });
