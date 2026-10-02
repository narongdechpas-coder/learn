/* ABI Mobile App — Wallet (กรมธรรม์ของฉัน) */
const { Icon: WIcon, Tag: WTag } = window.AioiBangkokInsuranceDesignSystem_cf9069;

function WalletHeader({ count }) {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '56px 20px 64px', overflow: 'hidden' }}>
      <window.Shard />
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: '#fff', lineHeight: 1.2 }}>กรมธรรม์ของฉัน</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>คุ้มครองอยู่ {count} ฉบับ · เก็บไว้ในที่เดียว</div>
      </div>
    </div>
  );
}

function WalletSummary({ active, premium, nextRenew }) {
  const cell = (label, value, sub) => (
    <div style={{ flex: 1, padding: '0 4px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--navy-900)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-400)' }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ margin: '-44px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', padding: '16px 12px', display: 'flex', alignItems: 'stretch' }}>
      {cell('คุ้มครองอยู่', active, 'ฉบับ')}
      <div style={{ width: 1, background: 'var(--ink-100)' }} />
      {cell('เบี้ยรวม/ปี', '฿' + premium.toLocaleString(), null)}
      <div style={{ width: 1, background: 'var(--ink-100)' }} />
      {cell('ต่ออายุถัดไป', nextRenew, null)}
    </div>
  );
}

function WalletScreen({ data, openPolicy, openQuote }) {
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { id: 'all', label: 'ทั้งหมด', icon: null },
    { id: 'motor', label: 'รถยนต์', icon: 'car', kinds: ['motor', 'cmi'] },
    { id: 'pa', label: 'อุบัติเหตุ', icon: 'heart-pulse', kinds: ['pa'] },
    { id: 'home', label: 'บ้าน', icon: 'home', kinds: ['home'] },
  ];
  const cur = filters.find(f => f.id === filter);
  const list = filter === 'all' ? data.policies : data.policies.filter(p => cur.kinds.includes(p.kind));
  const activeCount = data.policies.filter(p => p.status !== 'expired').length;
  const premium = Math.round(data.policies.reduce((s, p) => s + p.premium, 0));

  return (
    <div style={{ paddingBottom: 24 }}>
      <WalletHeader count={activeCount} />
      <WalletSummary active={activeCount} premium={premium} nextRenew="22 มิ.ย." />

      {/* filters */}
      <div style={{ display: 'flex', gap: 8, padding: '18px 16px 4px', overflowX: 'auto' }}>
        {filters.map(f => (
          <WTag key={f.id} icon={f.icon || undefined} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</WTag>
        ))}
      </div>

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '12px 16px 0' }}>
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-400)', fontFamily: 'var(--font-body)' }}>
            <WIcon name="folder-open" size={40} stroke={1.6} color="var(--ink-300)" />
            <div style={{ marginTop: 8, fontSize: 14 }}>ยังไม่มีกรมธรรม์ในหมวดนี้</div>
          </div>
        )}
        {list.map(p => <window.PolicyRow key={p.id} p={p} onClick={() => openPolicy(p)} />)}
      </div>

      {/* add / buy */}
      <div style={{ padding: '16px 16px 0' }}>
        <button onClick={openQuote} style={{ width: '100%', cursor: 'pointer', border: '1.5px dashed var(--navy-200)', background: 'var(--navy-50)', borderRadius: 14, padding: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-700)' }}>
          <WIcon name="plus-circle" size={20} stroke={2} />ซื้อประกันเพิ่ม
        </button>
      </div>
    </div>
  );
}

window.WalletScreen = WalletScreen;
