/* ABI Mobile App — PHYD dashboard + Notifications */
const { Icon: EIcon, Button: EButton, Badge: EBadge } = window.AioiBangkokInsuranceDesignSystem_cf9069;

/* ===== PHYD safe-driving dashboard ===== */
function ScoreRing({ score, size = 132 }) {
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - score / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#phydg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />
        <defs>
          <linearGradient id="phydg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--green-400)" />
            <stop offset="100%" stopColor="var(--teal-400)" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 42, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>คะแนนขับขี่</span>
      </div>
    </div>
  );
}

function PhydScreen({ data, back, openRenew, toast }) {
  const phyd = data.phyd;
  const motor = data.policies[0];
  const max = Math.max(...phyd.weeks);
  return (
    <div style={{ paddingBottom: 30 }}>
      {/* hero */}
      <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-600), var(--navy-900))', padding: '48px 16px 28px', overflow: 'hidden' }}>
        <window.Shard />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button onClick={back} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EIcon name="arrow-left" size={21} stroke={2.2} color="#fff" />
            </button>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.15 }}>PHYD ขับดี ลดให้</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>Pay How You Drive · T Connect</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <ScoreRing score={phyd.score} />
            <div style={{ flex: 1 }}>
              <EBadge tone="success" variant="solid" icon="trophy">{phyd.grade}</EBadge>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '10px 0 3px' }}>ส่วนลดต่ออายุปีหน้า</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: 'var(--sky-200)', lineHeight: 1 }}>{phyd.discount}%</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>กำลังสะสม</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* progress to next discount */}
      <div style={{ margin: '-12px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>อีก 4 คะแนน รับส่วนลด {phyd.nextDiscount}%</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--green-600)' }}>{phyd.score}/92</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--ink-200)', overflow: 'hidden' }}>
          <div style={{ width: (phyd.score / 92 * 100) + '%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--green-500), var(--teal-500))' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}>ขับขี่ปลอดภัยต่อเนื่องเพื่อปลดล็อกส่วนลดสูงสุด 30%</div>
      </div>

      {/* trip stats */}
      <div style={{ display: 'flex', gap: 11, padding: '16px 16px 0' }}>
        <Stat icon="route" value={phyd.trips} label="เที่ยวเดินทาง" />
        <Stat icon="map" value={phyd.km.toLocaleString()} label="กิโลเมตร" />
        <Stat icon="calendar-check" value="8" label="สัปดาห์ปลอดภัย" />
      </div>

      {/* weekly trend */}
      <div style={{ padding: '22px 16px 0' }}>
        <window.SectionHead title="แนวโน้มคะแนน 8 สัปดาห์" />
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '18px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 110 }}>
            {phyd.weeks.map((w, i) => {
              const isLast = i === phyd.weeks.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: isLast ? 'var(--green-600)' : 'var(--ink-400)', fontWeight: isLast ? 700 : 400 }}>{w}</span>
                  <div style={{ width: '100%', height: (w / max * 78) + 'px', borderRadius: 6, background: isLast ? 'linear-gradient(180deg, var(--green-500), var(--teal-500))' : 'var(--navy-100)' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--ink-400)' }}>W{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* driving metrics */}
      <div style={{ padding: '22px 16px 0' }}>
        <window.SectionHead title="พฤติกรรมการขับขี่" />
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '6px 16px' }}>
          {phyd.metrics.map((m, i) => (
            <div key={i} style={{ padding: '13px 0', borderBottom: i === phyd.metrics.length - 1 ? 'none' : '1px solid var(--ink-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><EIcon name={m.icon} size={18} stroke={2} /></span>
                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>{m.label}</span>
                <EBadge tone={m.score >= 90 ? 'success' : 'info'} variant="soft">{m.note}</EBadge>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--navy-900)', minWidth: 26, textAlign: 'right' }}>{m.score}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--ink-150, var(--ink-200))', overflow: 'hidden', marginLeft: 44 }}>
                <div style={{ width: m.score + '%', height: '100%', borderRadius: 99, background: m.score >= 90 ? 'var(--green-500)' : 'var(--navy-500)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* tip */}
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 14, padding: '13px 14px' }}>
          <EIcon name="lightbulb" size={20} stroke={2} color="var(--green-600)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>เคล็ดลับเพิ่มคะแนน</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.5, marginTop: 2 }}>ลดการเบรกกะทันหันช่วงเย็น และเว้นระยะห่างคันหน้า จะช่วยดันคะแนนถึง 90+ ได้ภายในเดือนนี้</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <EButton variant="primary" block size="lg" iconLeft="refresh-cw" onClick={() => openRenew(motor)}>ใช้ส่วนลด {phyd.discount}% ต่ออายุประกัน</EButton>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-xs)', padding: '13px 8px', textAlign: 'center' }}>
      <EIcon name={icon} size={20} stroke={2} color="var(--navy-600)" />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-500)' }}>{label}</div>
    </div>
  );
}

/* ===== Notifications ===== */
function NotificationsScreen({ data, back, onAction, toast }) {
  const [items, setItems] = React.useState(data.notifications);
  const markAll = () => setItems(items.map(n => ({ ...n, unread: false })));
  const tap = (n) => {
    setItems(items.map(x => x.id === n.id ? { ...x, unread: false } : x));
    if (n.action) onAction(n.action);
    else toast('เปิด: ' + n.title);
  };
  const toneMap = {
    success: ['var(--green-50)', 'var(--green-600)'],
    navy: ['var(--navy-50)', 'var(--navy-700)'],
    warning: ['var(--amber-50)', 'var(--amber-600)'],
    red: ['var(--red-50)', 'var(--red-500)'],
  };
  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '48px 16px 22px', overflow: 'hidden' }}>
        <window.Shard />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={back} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <EIcon name="arrow-left" size={21} stroke={2.2} color="#fff" />
          </button>
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#fff' }}>การแจ้งเตือน</div>
          <button onClick={markAll} style={{ border: 0, background: 'rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: 99, padding: '7px 13px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: '#fff' }}>อ่านทั้งหมด</button>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(n => {
          const t = toneMap[n.tone] || toneMap.navy;
          return (
            <button key={n.id} onClick={() => tap(n)} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
              border: '1px solid var(--ink-100)', background: n.unread ? 'var(--navy-50)' : '#fff', borderRadius: 14, padding: '13px 14px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, background: t[0], color: t[1], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><EIcon name={n.icon} size={20} stroke={2} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)', lineHeight: 1.3 }}>{n.title}</span>
                  {n.unread && <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--red-500)', flexShrink: 0 }} />}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.45, marginTop: 2, textWrap: 'pretty' }}>{n.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)' }}>{n.time}</span>
                  {n.action && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--navy-600)' }}>ดำเนินการ<EIcon name="chevron-right" size={13} stroke={2.4} /></span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { PhydScreen, NotificationsScreen });
