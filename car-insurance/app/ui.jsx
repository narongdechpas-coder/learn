/* ABI Mobile App — shared UI primitives, built on the Aioi design system */
const { Icon, Badge, Button, Tag } = window.AioiBangkokInsuranceDesignSystem_cf9069;

/* ---- Geometric shard motif (skewed parallelograms) ---- */
function Shard({ style = {} }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      <div style={{ position: 'absolute', top: -30, right: 38, width: 26, height: 260, background: 'rgba(255,255,255,0.06)', transform: 'skewX(-18deg)' }} />
      <div style={{ position: 'absolute', top: -30, right: 70, width: 12, height: 260, background: 'rgba(255,255,255,0.05)', transform: 'skewX(-18deg)' }} />
      <div style={{ position: 'absolute', top: -30, right: -10, width: 60, height: 260, background: 'rgba(219,32,23,0.32)', transform: 'skewX(-18deg)' }} />
    </div>
  );
}

/* โลโก้: ใช้ไฟล์ assets/aioi-mark.png ถ้ามี (ไฟล์ดีไซน์ไม่ได้แนบมา) ไม่งั้นแสดงเป็นตัวอักษร */
function LogoImg({ size }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <span className="abi-wordmark" style={{ fontSize: size * 0.32 }}>Aioi</span>;
  return <img src={(window.__resources && window.__resources.aioiMark) || 'assets/aioi-mark.png'} alt="Aioi" onError={() => setFailed(true)} style={{ width: size - 10, height: 'auto' }} />;
}

/* ---- Brand mark on a white roundel ---- */
function BrandMark({ size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(11,29,66,0.18)', flexShrink: 0, overflow: 'hidden',
    }}>
      <LogoImg size={size} />
    </div>
  );
}

/* ---- Section heading with optional trailing action ---- */
function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)' }}>{title}</h3>
      {action && (
        <button onClick={onAction} style={{
          border: 0, background: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--navy-600)',
          display: 'inline-flex', alignItems: 'center', gap: 2,
        }}>{action}<Icon name="chevron-right" size={16} stroke={2.4} /></button>
      )}
    </div>
  );
}

/* ---- Quick-action tile ---- */
function QuickAction({ icon, label, tone = 'navy', onClick }) {
  const map = {
    red:  { bg: 'var(--red-50)',  fg: 'var(--red-500)' },
    navy: { bg: 'var(--navy-50)', fg: 'var(--navy-700)' },
    sky:  { bg: 'var(--sky-100)', fg: 'var(--navy-600)' },
    green:{ bg: 'var(--green-50)',fg: 'var(--green-600)' },
  }[tone];
  return (
    <button onClick={onClick} style={{
      border: 0, background: 'none', padding: '4px 0', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1,
    }}>
      <span style={{
        width: 56, height: 56, borderRadius: 16, background: map.bg, color: map.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform .12s ease',
      }}><Icon name={icon} size={26} stroke={2.1} /></span>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: 'var(--ink-700)', textAlign: 'center', lineHeight: 1.25 }}>{label}</span>
    </button>
  );
}

/* ---- Product icon roundel ---- */
function ProductIcon({ icon, accent = 'navy', size = 46 }) {
  const fg = accent === 'red' ? 'var(--red-500)' : accent === 'teal' ? 'var(--teal-600)' : 'var(--navy-700)';
  const bg = accent === 'red' ? 'var(--red-50)' : accent === 'teal' ? 'var(--teal-50)' : 'var(--navy-50)';
  return (
    <span style={{
      width: size, height: size, borderRadius: 13, background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}><Icon name={icon} size={size * 0.5} stroke={2} /></span>
  );
}

/* ---- Real-photo car thumbnail (falls back to icon roundel) ---- */
function CarThumb({ p, size = 46, radius = 13 }) {
  const src = p.photo && window.CAR_PHOTOS ? window.CAR_PHOTOS[p.photo] : null;
  if (!src) return <ProductIcon icon={p.icon} accent={p.accent} size={size} />;
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
      display: 'inline-block', background: 'var(--ink-100)', position: 'relative',
      boxShadow: 'inset 0 0 0 1px rgba(11,29,66,0.06)',
    }}>
      <img src={src} alt={p.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </span>
  );
}

/* ---- Status badge for a policy ---- */
function StatusBadge({ status }) {
  if (status === 'expiring') return <Badge tone="warning" variant="soft" icon="clock">ใกล้หมดอายุ</Badge>;
  if (status === 'expired')  return <Badge tone="neutral" variant="soft" icon="x-circle">หมดอายุ</Badge>;
  return <Badge tone="success" variant="soft" icon="shield-check">คุ้มครองอยู่</Badge>;
}

/* ---- Mono number text ---- */
function Mono({ children, style = {} }) {
  return <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.02em', ...style }}>{children}</span>;
}

/* ---- Policy row card (used in wallet) ---- */
function PolicyRow({ p, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', border: '1px solid var(--ink-100)', cursor: 'pointer',
      background: '#fff', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-sm)',
      display: 'flex', gap: 13, alignItems: 'center',
    }}>
      <CarThumb p={p} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.04em', color: 'var(--red-500)', textTransform: 'uppercase', marginBottom: 2 }}>{p.line}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--navy-900)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {p.plate
            ? <Mono style={{ fontSize: 13, color: 'var(--ink-600)', background: 'var(--ink-100)', padding: '2px 7px', borderRadius: 5 }}>{p.plate}</Mono>
            : <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)' }}>{p.sub}</span>}
          <StatusBadge status={p.status} />
        </div>
      </div>
      <Icon name="chevron-right" size={20} stroke={2} color="var(--ink-400)" />
    </button>
  );
}

/* ---- Coverage check line ---- */
function CoverageLine({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--ink-100)',
    }}>
      <Icon name="check-circle" size={19} stroke={2.2} color="var(--green-500)" style={{ marginTop: 1 }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink-700)', lineHeight: 1.45 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

/* ---- Bottom tab bar ---- */
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'หน้าหลัก' },
    { id: 'wallet', icon: 'wallet-cards', label: 'กรมธรรม์' },
    { id: 'claim', icon: 'shield-alert', label: 'แจ้งเคลม' },
    { id: 'account', icon: 'user-round', label: 'บัญชี' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--ink-100)',
      padding: '8px 8px 26px', display: 'flex',
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        const isClaim = t.id === 'claim';
        const color = on ? (isClaim ? 'var(--red-500)' : 'var(--navy-700)') : 'var(--ink-400)';
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, border: 0, background: 'none', cursor: 'pointer', padding: '4px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <Icon name={t.icon} size={24} stroke={on ? 2.4 : 1.9} color={color} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: on ? 600 : 500, fontSize: 11, color }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  Shard, BrandMark, SectionHead, QuickAction, ProductIcon, CarThumb,
  StatusBadge, Mono, PolicyRow, CoverageLine, TabBar,
});
