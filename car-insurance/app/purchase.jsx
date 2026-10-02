/* ABI Mobile App — ชำระเงินซื้อประกันใหม่ (เชื่อม API จริง: สั่งซื้อ → ชำระด้วยบัตร/พร้อมเพย์ → ออกกรมธรรม์ PDF) */
const { Icon: PIcon, Button: PButton, Badge: PBadge, Input: PInput, Select: PSelect } = window.AioiBangkokInsuranceDesignSystem_cf9069;
const pbaht = window.baht;
const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function splitName(full) {
  const [first = '', ...rest] = String(full || '').trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'var(--red-50)', border: '1px solid var(--red-200)', color: 'var(--red-700)', borderRadius: 12, padding: '11px 13px', margin: '16px 16px 0', fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.45 }}>
      <PIcon name="alert-circle" size={18} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </div>
  );
}

function PurchaseCheckout({ data, order, onBack, onClose, toast, onPurchased }) {
  const u = data.user;
  const [holder, setHolder] = React.useState({ title: 'นาย', ...splitName(u.name), idCard: '', phone: u.phone || '', email: u.email || '', address: '' });
  const [vehicle, setVehicle] = React.useState({ plate: '', plateProvince: 'กรุงเทพมหานคร', chassisNo: '' });
  const [startDate, setStartDate] = React.useState(todayIso());
  const [plan, setPlan] = React.useState('full');
  const [pay, setPay] = React.useState('card');
  const [card, setCard] = React.useState({ number: '', name: '', expMonth: '', expYear: '', cvc: '' });
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [qr, setQr] = React.useState(null);          // { chargeId, image, expiresAt }
  const [paid, setPaid] = React.useState(null);      // ผลจากเซิร์ฟเวอร์เมื่อชำระสำเร็จ
  const serverOrder = React.useRef(null);            // { sig, order }
  const poll = React.useRef(null);
  const photo = window.CAR_PHOTOS[order.photoKey];

  React.useEffect(() => () => clearInterval(poll.current), []);
  const setH = (k) => (e) => setHolder(h => ({ ...h, [k]: e.target.value }));
  const setV = (k) => (e) => setVehicle(v => ({ ...v, [k]: e.target.value }));
  const setC = (k) => (e) => setCard(c => ({ ...c, [k]: e.target.value }));
  const choosePay = (m) => {
    setPay(m);
    if (m !== 'promptpay') { clearInterval(poll.current); setQr(null); }
  };
  const choosePlan = (p) => { setPlan(p); if (p === 'instal') choosePay('card'); };

  // สร้างคำสั่งซื้อ (สร้างใหม่ถ้าข้อมูลเปลี่ยนหลังจากสร้างไปแล้ว)
  async function ensureOrder() {
    const body = { quoteId: order.quoteId, holder, vehicle, startDate, paymentPlan: plan };
    const sig = JSON.stringify(body);
    if (serverOrder.current && serverOrder.current.sig === sig) return serverOrder.current.order;
    const created = await window.ABI_API.createOrder(body);
    serverOrder.current = { sig, order: created };
    return created;
  }

  function finish(o) {
    clearInterval(poll.current);
    setQr(null);
    setPaid({ ...o, accessToken: serverOrder.current.order.accessToken });
  }

  async function confirm() {
    setError('');
    setProcessing(true);
    try {
      const o = await ensureOrder();
      if (pay === 'card') {
        const token = await window.ABI_API.tokenizeCard(card);
        const res = await window.ABI_API.pay(o, { method: 'card', cardToken: token.id });
        finish(res.order);
      } else {
        const res = await window.ABI_API.pay(o, { method: 'promptpay' });
        setQr({ chargeId: res.charge.id, image: res.charge.qrImage, expiresAt: res.charge.expiresAt });
        clearInterval(poll.current);
        poll.current = setInterval(async () => {
          try {
            const st = await window.ABI_API.getOrder(o);
            if (st.status === 'paid') finish(st);
            else if (st.lastError) { clearInterval(poll.current); setQr(null); setError(st.lastError); }
          } catch (e) { /* ลองใหม่รอบถัดไป */ }
        }, 2000);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }

  async function simulateScan() {
    await window.ABI_API.simulatePromptPayPaid(qr.chargeId);
    const st = await window.ABI_API.getOrder(serverOrder.current.order);
    if (st.status === 'paid') finish(st);
  }

  async function download() {
    try { await window.ABI_downloadPolicy({ id: paid.id, accessToken: paid.accessToken }); }
    catch (e) { if (e && e.code !== 'declined') toast('ดาวน์โหลดไม่สำเร็จ ลองอีกครั้ง'); }
  }

  /* ---------- สำเร็จ ---------- */
  if (paid) {
    const payLabel = paid.payment.method === 'card' ? `บัตร ${paid.payment.card.brand} •••• ${paid.payment.card.last4}` : 'พร้อมเพย์ QR';
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 75, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 150 }}>
          <div style={{ position: 'relative', background: 'linear-gradient(160deg, var(--green-500), var(--green-700))', padding: '64px 20px 46px', textAlign: 'center', overflow: 'hidden' }}>
            <window.Shard />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sheetUp .4s ease' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PIcon name="check" size={36} stroke={3} color="var(--green-600)" /></div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff' }}>ซื้อประกันสำเร็จ!</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 4 }}>ออกกรมธรรม์เรียบร้อย ดาวน์โหลดได้ทันที</div>
            </div>
          </div>
          <div style={{ margin: '-22px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', padding: '16px 18px' }}>
            <window.Row label="เลขที่กรมธรรม์" mono value={paid.policyNumber} />
            <window.Row label="แผนประกัน" value={order.lineLabel} />
            <window.Row label="รถยนต์" value={order.title} />
            <window.Row label="วิธีชำระเงิน" value={payLabel + (paid.paymentPlan === 'instal' ? ' · ผ่อน 0%' : '')} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--ink-100)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-500)' }}>ยอดชำระ</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--navy-900)' }}>{pbaht(paid.amount / 100)}</span>
            </div>
          </div>
          <div style={{ padding: '16px 16px 0' }}>
            <button onClick={download} style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid var(--navy-200)', borderRadius: 14, padding: '13px 14px', textAlign: 'left' }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--red-50)', color: 'var(--red-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PIcon name="file-down" size={21} stroke={2} /></span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)' }}>ดาวน์โหลดกรมธรรม์ (PDF)</span>
                <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-500)' }}>{paid.policyNumber}.pdf</span>
              </span>
              <PIcon name="download" size={19} stroke={2} color="var(--navy-700)" />
            </button>
          </div>
        </div>
        <window.StickyBar>
          <div style={{ display: 'flex', gap: 10 }}>
            <PButton variant="outline" block iconLeft="wallet-cards" onClick={() => { onPurchased && onPurchased(paid, order); onClose(); }}>ดูกรมธรรม์</PButton>
            <PButton variant="primary" block iconLeft="home" onClick={() => { onPurchased && onPurchased(paid, order, { stay: true }); onClose(); toast('ยินดีต้อนรับสู่ความคุ้มครองใหม่ของคุณ'); }}>เสร็จสิ้น</PButton>
          </div>
        </window.StickyBar>
      </div>
    );
  }

  /* ---------- หน้าชำระเงิน ---------- */
  const total = order.total;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 75, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column' }}>
      <window.QuoteHeader title="ชำระเงิน" sub="ตรวจสอบและยืนยันคำสั่งซื้อ" total={0} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        <ErrorBox msg={error} />

        {/* order summary */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--navy-50)' }}>
                {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.03em', color: 'var(--red-500)' }}>{order.lineLabel}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--navy-900)' }}>{order.title}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-500)' }}>{order.sub}</div>
              </div>
              <PBadge tone="success" variant="soft" icon="shield-check">{order.badge}</PBadge>
            </div>
            <div style={{ padding: '6px 14px 10px' }}>
              {order.rows.map((r, i) => <window.Row key={i} label={r.label} value={r.value} green={r.green} small />)}
            </div>
          </div>
        </div>

        {/* holder */}
        <div style={{ padding: '18px 16px 0' }}>
          <window.SectionTitle>ผู้เอาประกัน</window.SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 10 }}>
              <PSelect label="คำนำหน้า" value={holder.title} onChange={setH('title')} options={['นาย', 'นาง', 'นางสาว'].map(t => ({ value: t, label: t }))} />
              <PInput label="ชื่อ" value={holder.firstName} onChange={setH('firstName')} autoComplete="given-name" />
            </div>
            <PInput label="นามสกุล" value={holder.lastName} onChange={setH('lastName')} autoComplete="family-name" />
            <PInput label="เลขบัตรประชาชน" value={holder.idCard} onChange={setH('idCard')} iconLeft="id-card" inputMode="numeric" maxLength={17} placeholder="13 หลัก" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <PInput label="เบอร์โทรศัพท์" value={holder.phone} onChange={setH('phone')} inputMode="tel" autoComplete="tel" />
              <PInput label="อีเมล" type="email" value={holder.email} onChange={setH('email')} autoComplete="email" />
            </div>
            <PInput label="ที่อยู่สำหรับจัดส่งเอกสาร" value={holder.address} onChange={setH('address')} iconLeft="map-pin" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" autoComplete="street-address" />
          </div>
        </div>

        {/* vehicle */}
        <div style={{ padding: '18px 16px 0' }}>
          <window.SectionTitle>ข้อมูลรถและวันเริ่มคุ้มครอง</window.SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <PInput label="ทะเบียนรถ" value={vehicle.plate} onChange={setV('plate')} iconLeft="car" placeholder="เช่น 1กก 2569" />
              <PInput label="จังหวัด" value={vehicle.plateProvince} onChange={setV('plateProvince')} />
            </div>
            <PInput label="เลขตัวถัง (Chassis No.)" value={vehicle.chassisNo} onChange={setV('chassisNo')} placeholder="เช่น MRHGM6640LP012345" />
            <PInput label="วันเริ่มคุ้มครอง" type="date" value={startDate} min={todayIso()} onChange={e => setStartDate(e.target.value)} iconLeft="calendar" />
          </div>
        </div>

        {/* payment plan */}
        <div style={{ padding: '18px 16px 0' }}>
          <window.SectionTitle>รูปแบบการชำระ</window.SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <button onClick={() => choosePlan('full')} style={window.planBtn(plan === 'full')}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--navy-900)' }}>จ่ายเต็มจำนวน</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--navy-900)', marginTop: 2 }}>{pbaht(total)}</div>
            </button>
            <button onClick={() => choosePlan('instal')} style={window.planBtn(plan === 'instal')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--navy-900)' }}>ผ่อน 0%</span><PBadge tone="red" variant="soft">10 ด.</PBadge></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--navy-900)', marginTop: 2 }}>{pbaht(order.monthly)}<span style={{ fontSize: 12, color: 'var(--ink-500)' }}>/ด.</span></div>
            </button>
          </div>
          {plan === 'instal' && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}>ผ่อน 0% ผ่านบัตรเครดิต ตัดยอดเต็มจำนวนแล้วธนาคารแบ่งชำระ 10 เดือน</div>}
        </div>

        {/* payment method */}
        <div style={{ padding: '18px 16px 0' }}>
          <window.SectionTitle>วิธีชำระเงิน</window.SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <window.PayMethod icon="credit-card" label="บัตรเครดิต / เดบิต" sub="Visa · Mastercard · JCB" on={pay === 'card'} onClick={() => choosePay('card')} />
            {plan === 'full' && <window.PayMethod icon="qr-code" label="พร้อมเพย์ QR" sub="สแกนจ่ายผ่านแอปธนาคาร" on={pay === 'promptpay'} onClick={() => choosePay('promptpay')} />}
          </div>

          {pay === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14, background: '#fff', border: '1px solid var(--ink-100)', borderRadius: 14, padding: 14 }}>
              <PInput label="หมายเลขบัตร" value={card.number} onChange={setC('number')} iconLeft="credit-card" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" />
              <PInput label="ชื่อบนบัตร" value={card.name} onChange={setC('name')} autoComplete="cc-name" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <PInput label="เดือน (MM)" value={card.expMonth} onChange={setC('expMonth')} inputMode="numeric" maxLength={2} placeholder="12" />
                <PInput label="ปี (YY)" value={card.expYear} onChange={setC('expYear')} inputMode="numeric" maxLength={4} placeholder="30" />
                <PInput label="CVV" value={card.cvc} onChange={setC('cvc')} inputMode="numeric" maxLength={4} autoComplete="cc-csc" />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                โหมดทดสอบ: <window.Mono>4242 4242 4242 4242</window.Mono> = สำเร็จ · <window.Mono>4000 0000 0000 0002</window.Mono> = ถูกปฏิเสธ
              </div>
            </div>
          )}

          {pay === 'promptpay' && qr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 14, background: '#fff', border: '1px solid var(--ink-100)', borderRadius: 14, padding: 16 }}>
              <img src={qr.image} alt="QR พร้อมเพย์สำหรับชำระเงิน" style={{ width: 220, height: 220 }} />
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-600)', textAlign: 'center' }}>
                สแกนด้วยแอปธนาคาร · หมดอายุ {new Date(qr.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.<br />กำลังรอการชำระเงิน…
              </div>
              <PButton variant="outline" size="sm" iconLeft="scan-line" onClick={simulateScan}>(ทดสอบ) จำลองว่าสแกนจ่ายแล้ว</PButton>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px 0' }}>
          <PIcon name="lock" size={14} stroke={2} color="var(--ink-400)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-400)' }}>ระบบทดสอบ: ไม่มีการตัดเงินจริง เลขบัตรไม่ถูกเก็บในระบบ</span>
        </div>
      </div>

      <window.StickyBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-400)' }}>{plan === 'instal' ? 'ต่อเดือน' : 'ยอดชำระ'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1 }}>{pbaht(plan === 'instal' ? order.monthly : total)}</div>
          </div>
          <PButton variant="primary" block size="lg" iconLeft={processing ? undefined : pay === 'card' ? 'shield-check' : 'qr-code'} disabled={processing || !!qr} onClick={confirm}>
            {processing ? 'กำลังดำเนินการ…' : qr ? 'รอสแกนจ่าย…' : pay === 'card' ? 'ยืนยันชำระเงิน' : 'สร้าง QR ชำระเงิน'}
          </PButton>
        </div>
      </window.StickyBar>
    </div>
  );
}

/* ใช้ร่วมกันทั้งซื้อใหม่และต่ออายุ */
function CheckoutScreen(props) {
  if (props.mode === 'renew') return <window.RenewCheckout {...props} />;
  return <PurchaseCheckout {...props} />;
}

Object.assign(window, { CheckoutScreen });
