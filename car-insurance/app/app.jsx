/* ABI Mobile App — router, claim flow, account, toast */
const { Icon: AIcon, Button: AButton, Badge: ABadge } = window.AioiBangkokInsuranceDesignSystem_cf9069;

/* ---- Claim bottom sheet (Aioi Remote Survey, 4 steps) ---- */
function ClaimSheet({ data, policy, onClose, onSubmit }) {
  const motor = data.policies.find(p => p.kind === 'motor');
  const steps = [
    { icon: 'clipboard-list', title: 'แจ้งรายละเอียด', desc: 'เลือกกรมธรรม์และระบุลักษณะเหตุการณ์' },
    { icon: 'camera', title: 'ถ่ายรูปความเสียหาย', desc: 'อัปโหลดรูปรถและจุดเกิดเหตุ' },
    { icon: 'map-pin', title: 'ปักหมุดตำแหน่ง', desc: 'ติดตามเจ้าหน้าที่แบบเรียลไทม์ด้วย AIOI-Tracking' },
    { icon: 'wrench', title: 'รับผลและนัดซ่อม', desc: 'สรุปค่าเสียหายและนัดอู่ในเครือ' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(11,29,66,0.55)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '26px 26px 0 0', overflow: 'hidden', animation: 'sheetUp .28s cubic-bezier(.2,.8,.2,1)' }}>
        {/* sheet header */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, var(--red-500), var(--red-700))', padding: '14px 20px 20px', color: '#fff', overflow: 'hidden' }}>
          <window.Shard />
          <div style={{ position: 'relative' }}>
            <div style={{ width: 40, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.4)', margin: '0 auto 14px' }} />
            <ABadge tone="red" variant="solid" style={{ background: 'rgba(255,255,255,0.18)', marginBottom: 8 }} icon="zap">Aioi Remote Survey</ABadge>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 23, lineHeight: 1.2 }}>แจ้งเคลม เพียง 4 ขั้นตอน</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>เคลมไว ไม่ต้องรอ เจ้าหน้าที่เดินทางถึงที่เกิดเหตุ</div>
          </div>
        </div>

        {/* policy context */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--navy-50)', borderRadius: 12, padding: '11px 13px' }}>
            <window.ProductIcon icon={(policy || motor).icon} accent="navy" size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)' }}>กำลังแจ้งเคลมสำหรับ</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy-900)' }}>{(policy || motor).title} · {(policy || motor).plate}</div>
            </div>
          </div>
        </div>

        {/* steps */}
        <div style={{ padding: '16px 18px 4px' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', paddingBottom: i === steps.length - 1 ? 0 : 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--red-50)', color: 'var(--red-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AIcon name={s.icon} size={20} stroke={2} /></span>
                {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--ink-100)', marginTop: 4 }} />}
              </div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy-900)' }}><span style={{ color: 'var(--red-500)' }}>{i + 1}.</span> {s.title}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink-500)', lineHeight: 1.45, marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '14px 18px 30px' }}>
          <AButton variant="ghost" onClick={onClose}>ยกเลิก</AButton>
          <AButton variant="primary" block iconRight="arrow-right" onClick={onSubmit}>เริ่มแจ้งเคลม</AButton>
        </div>
      </div>
    </div>
  );
}

/* ---- Account (บัญชี) ---- */
function AccountScreen({ data, openNotifications, toast }) {
  const rows = [
    { icon: 'user-round', label: 'ข้อมูลส่วนตัว', tone: 'navy' },
    { icon: 'credit-card', label: 'วิธีการชำระเงิน', tone: 'navy' },
    { icon: 'bell', label: 'การแจ้งเตือน', tone: 'navy', detail: 'เปิด', go: 'notif' },
    { icon: 'file-text', label: 'เอกสารและใบเสร็จ', tone: 'navy' },
    { icon: 'gift', label: 'สิทธิประโยชน์สมาชิก', tone: 'red' },
    { icon: 'headphones', label: 'ศูนย์ช่วยเหลือ 1292', tone: 'navy' },
  ];
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '56px 20px 64px', overflow: 'hidden' }}>
        <window.Shard />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--red-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: '#fff', flexShrink: 0 }}>ธ</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1.2 }}>คุณ{data.user.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <ABadge tone="warning" variant="solid" icon="crown">{data.user.tier}</ABadge>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>ตั้งแต่ปี {data.user.since}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: '-44px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AIcon name="id-card" size={20} stroke={2} color="var(--navy-600)" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink-500)' }}>รหัสสมาชิก</span>
        <window.Mono style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>{data.user.memberId}</window.Mono>
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <button key={i} onClick={() => r.go === 'notif' ? openNotifications() : toast('เปิด: ' + r.label)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0, borderTop: i ? '1px solid var(--ink-100)' : 'none', background: 'none', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: r.tone === 'red' ? 'var(--red-50)' : 'var(--navy-50)', color: r.tone === 'red' ? 'var(--red-500)' : 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AIcon name={r.icon} size={19} stroke={2} /></span>
              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--navy-900)' }}>{r.label}</span>
              {r.detail && <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-400)' }}>{r.detail}</span>}
              <AIcon name="chevron-right" size={19} stroke={2} color="var(--ink-400)" />
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <button onClick={() => toast('ออกจากระบบ')} style={{ width: '100%', cursor: 'pointer', border: '1px solid var(--ink-200)', background: '#fff', borderRadius: 14, padding: '13px 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <AIcon name="log-out" size={18} stroke={2} />ออกจากระบบ
        </button>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)', marginTop: 14 }}>Aioi Bangkok Insurance · เวอร์ชัน 4.2.0</div>
      </div>
    </div>
  );
}

/* ---- Toast ---- */
function ToastBar({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 96, zIndex: 90, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ background: 'var(--navy-900)', color: '#fff', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9, boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-body)', fontSize: 14, animation: 'toastIn .25s ease', maxWidth: '100%' }}>
        <AIcon name="check-circle" size={18} stroke={2.2} color="var(--green-500)" />
        <span style={{ textWrap: 'pretty' }}>{msg}</span>
      </div>
    </div>
  );
}

/* ---- App ---- */
/* กรอบโทรศัพท์บนจอใหญ่ — บนมือถือจริงแสดงเต็มจอ */
function useNarrow() {
  const q = '(max-width: 520px)';
  const [narrow, setNarrow] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}
function Frame({ children }) {
  const narrow = useNarrow();
  if (!narrow) return <window.IOSDevice>{children}</window.IOSDevice>;
  return <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ink-50)' }}>{children}</div>;
}

const thaiShort = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });

/* แปลงคำสั่งซื้อที่ชำระแล้ว → กรมธรรม์ในกระเป๋า (รูปแบบเดียวกับ ABI_DATA.policies) */
function policyFromPurchase(paid, order) {
  const q = order.quote;
  const start = paid.startDate || new Date().toISOString().slice(0, 10);
  const end = (Number(start.slice(0, 4)) + 1) + start.slice(4);
  return {
    id: 'new-' + paid.id, kind: 'motor', icon: 'car', photo: q.input.body, accent: 'navy',
    line: 'ประกันรถยนต์ ' + q.price.classLabel,
    title: `${q.input.brand} ${q.input.model}`,
    sub: 'ปี ' + (q.input.year + 543),
    plate: paid.plate || '-', province: paid.plateProvince || '',
    policyNo: paid.policyNumber, premium: paid.amount / 100, sumInsured: q.input.sumInsured,
    start: thaiShort(start), end: thaiShort(end),
    daysLeft: Math.round((new Date(end) - new Date(start)) / 86400000),
    status: 'active', repairType: q.input.repair === 'dealer' ? 'ซ่อมห้าง' : 'ซ่อมอู่', garage: '-',
    coverage: q.coverage.map(c => ({ label: c.label, value: c.amount.toLocaleString() + ' บาท' })),
    order: { id: paid.id, accessToken: paid.accessToken },
  };
}

function App() {
  const data = window.ABI_DATA;
  const [, bump] = React.useState(0);
  const [tab, setTab] = React.useState('home');
  const [view, setView] = React.useState(null);     // 'phyd' | 'notifications' (sub-screen)
  const [detail, setDetail] = React.useState(null);
  const [card, setCard] = React.useState(null);
  const [claimFor, setClaimFor] = React.useState(undefined); // undefined = closed
  const [quote, setQuote] = React.useState(null);    // { mode, prefill }
  const [toastMsg, setToastMsg] = React.useState('');
  const scrollRef = React.useRef(null);
  const toastTimer = React.useRef(null);

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  };
  const scrollTop = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const openPolicy = (p) => { setView(null); setDetail(p); scrollTop(); };
  const back = () => { setDetail(null); scrollTop(); };
  const openQuote = () => { setQuote({ mode: 'quote' }); };
  const onPurchased = (paid, order, opts = {}) => {
    const p = policyFromPurchase(paid, order);
    data.policies.unshift(p);
    data.activity.unshift({ id: 'act-' + paid.id, icon: 'file-check-2', tone: 'success', title: 'ออกกรมธรรม์เรียบร้อย', desc: p.line + ' · ' + p.policyNo, time: 'เมื่อสักครู่' });
    bump(n => n + 1);
    if (!opts.stay) { setTab('wallet'); setView(null); setDetail(p); scrollTop(); }
  };
  const openRenew = (p) => { setQuote({ mode: 'renew', prefill: p }); };
  const openPhyd = () => { setDetail(null); setView('phyd'); scrollTop(); };
  const openNotifications = () => { setDetail(null); setView('notifications'); scrollTop(); };
  const backView = () => { setView(null); scrollTop(); };

  const onNotifAction = (action) => {
    if (action === 'renew-pa') { setView(null); openRenew(data.policies.find(p => p.kind === 'pa')); }
    else if (action === 'phyd') openPhyd();
    else if (action === 'home') { setView(null); openQuote(); }
    else toast('เปิดรายการ');
  };

  const onTab = (id) => {
    if (id === 'claim') { setClaimFor(detail || null); return; }
    setClaimFor(undefined); setDetail(null); setView(null); setTab(id); scrollTop();
  };

  let screen, activeTab = tab;
  if (detail) { screen = <window.DetailScreen p={detail} user={data.user} back={back} openClaim={(p) => setClaimFor(p)} openCard={setCard} openRenew={openRenew} toast={toast} />; activeTab = 'wallet'; }
  else if (view === 'phyd') { screen = <window.PhydScreen data={data} back={backView} openRenew={openRenew} toast={toast} />; activeTab = 'home'; }
  else if (view === 'notifications') { screen = <window.NotificationsScreen data={data} back={backView} onAction={onNotifAction} toast={toast} />; activeTab = 'home'; }
  else if (tab === 'home') screen = <window.HomeScreen data={data} go={onTab} openClaim={() => setClaimFor(null)} openPolicy={openPolicy} openCard={setCard} openQuote={openQuote} openPhyd={openPhyd} openNotifications={openNotifications} openRenew={openRenew} toast={toast} />;
  else if (tab === 'wallet') screen = <window.WalletScreen data={data} openPolicy={openPolicy} openQuote={openQuote} />;
  else screen = <AccountScreen data={data} openNotifications={openNotifications} toast={toast} />;

  return (
    <Frame>
      <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', background: 'var(--ink-50)', position: 'relative' }}>
        <div style={{ paddingBottom: 96 }}>{screen}</div>
      </div>
      <window.TabBar active={claimFor !== undefined ? 'claim' : activeTab} onChange={onTab} />
      <ToastBar msg={toastMsg} />
      {card && <window.CardModal p={card} user={data.user} onClose={() => setCard(null)} />}
      {claimFor !== undefined && (
        <ClaimSheet data={data} policy={claimFor} onClose={() => setClaimFor(undefined)} onSubmit={() => { setClaimFor(undefined); toast('รับเรื่องแจ้งเคลมแล้ว เจ้าหน้าที่กำลังเดินทาง'); }} />
      )}
      {quote && (
        <window.QuoteFlow data={data} mode={quote.mode} prefill={quote.prefill} toast={toast} onPurchased={onPurchased}
          onClose={() => setQuote(null)} />
      )}
    </Frame>
  );
}

window.ABIApp = App;
