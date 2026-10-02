/* ABI Mobile App — Home (หน้าหลัก) */
const { Icon: HIcon, Badge: HBadge } = window.AioiBangkokInsuranceDesignSystem_cf9069;

function HomeHeader({ user, onBell, unread }) {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '54px 20px 70px', overflow: 'hidden' }}>
      <window.Shard />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <window.BrandMark size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.2 }}>สวัสดี</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: '#fff', lineHeight: 1.25 }}>คุณ{user.firstName}</div>
          </div>
        </div>
        <button onClick={onBell} style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HIcon name="bell" size={21} stroke={2} color="#fff" />
          {unread > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 99, background: 'var(--red-500)', border: '1.5px solid var(--navy-800)' }} />}
        </button>
      </div>
    </div>
  );
}

function CoverageHeroCard({ p, onOpen, onCard }) {
  const src = p.photo && window.CAR_PHOTOS ? window.CAR_PHOTOS[p.photo] : null;
  return (
    <div style={{ margin: '-52px 16px 0', position: 'relative', zIndex: 2 }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', border: '1px solid var(--ink-100)' }}>
        {/* real car photo banner */}
        {src && (
          <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
            <img src={src} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,29,66,0.05) 30%, rgba(11,29,66,0.78))' }} />
            <div style={{ position: 'absolute', left: 14, top: 12 }}>
              <window.StatusBadge status={p.status} />
            </div>
            <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.04em', color: '#fff', textTransform: 'uppercase', opacity: 0.92, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{p.line}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: '#fff', lineHeight: 1.15, textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>{p.title}</div>
              </div>
              <window.Mono style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)', background: 'rgba(255,255,255,0.94)', padding: '4px 10px', borderRadius: 7, flexShrink: 0 }}>{p.plate}</window.Mono>
            </div>
          </div>
        )}
        {!src && (
          <div style={{ padding: '15px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <window.ProductIcon icon={p.icon} accent="navy" size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '.04em', color: 'var(--red-500)', textTransform: 'uppercase' }}>{p.line}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--navy-900)', lineHeight: 1.2 }}>{p.title}</div>
            </div>
            <window.StatusBadge status={p.status} />
          </div>
        )}
        {/* protection meter */}
        <div style={{ background: 'var(--ink-50)', borderTop: '1px solid var(--ink-100)', padding: '13px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)' }}>คุ้มครองถึง {p.end}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--green-600)' }}>เหลือ {p.daysLeft} วัน</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--ink-200)', overflow: 'hidden' }}>
            <div style={{ width: '77%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--green-500), var(--teal-500))' }} />
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid var(--ink-100)' }}>
          <button onClick={onCard} style={{ flex: 1, border: 0, background: 'none', cursor: 'pointer', padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-700)', whiteSpace: 'nowrap' }}>
            <HIcon name="qr-code" size={18} stroke={2} />บัตรประกัน
          </button>
          <div style={{ width: 1, background: 'var(--ink-100)' }} />
          <button onClick={onOpen} style={{ flex: 1, border: 0, background: 'none', cursor: 'pointer', padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-700)', whiteSpace: 'nowrap' }}>
            <HIcon name="file-text" size={18} stroke={2} />รายละเอียด
          </button>
        </div>
      </div>
    </div>
  );
}

function PhydCard({ phyd, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0, borderRadius: 18, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))', padding: 16, color: '#fff', boxShadow: 'var(--shadow-md)' }}>
      <window.Shard />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', flexShrink: 0, background: 'conic-gradient(var(--green-500) 0 88%, rgba(255,255,255,0.16) 88% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--navy-800)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, lineHeight: 1, color: '#fff' }}>{phyd.score}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>คะแนน</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#fff' }}>PHYD ขับดี ลดให้</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>การขับขี่ของคุณอยู่ในเกณฑ์<strong style={{ color: '#fff' }}> {phyd.grade}</strong> · ส่วนลดสะสม</div>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 6, background: 'rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: 99 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--sky-200)' }}>{phyd.discount}%</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>ในปีหน้า</span>
          </div>
        </div>
        <HIcon name="chevron-right" size={20} stroke={2} color="rgba(255,255,255,0.6)" />
      </div>
    </button>
  );
}

function ActivityItem({ a, last }) {
  const tone = { success: ['var(--green-50)','var(--green-600)'], navy: ['var(--navy-50)','var(--navy-700)'], warning: ['var(--amber-50)','var(--amber-600)'] }[a.tone];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 0', borderBottom: last ? 'none' : '1px solid var(--ink-100)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, background: tone[0], color: tone[1], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HIcon name={a.icon} size={19} stroke={2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)', lineHeight: 1.3 }}>{a.title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.4, marginTop: 1 }}>{a.desc}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--ink-400)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
    </div>
  );
}

function HomeScreen({ data, go, openClaim, openPolicy, openCard, openQuote, openPhyd, openNotifications, openRenew, toast }) {
  const motor = data.policies[0];
  const expiring = data.policies.find(p => p.status === 'expiring');
  const unread = (data.notifications || []).filter(n => n.unread).length;
  return (
    <div style={{ paddingBottom: 24 }}>
      <HomeHeader user={data.user} unread={unread} onBell={openNotifications} />
      <CoverageHeroCard p={motor} onOpen={() => openPolicy(motor)} onCard={() => openCard(motor)} />

      {/* quick actions */}
      <div style={{ display: 'flex', gap: 4, padding: '20px 12px 4px' }}>
        <window.QuickAction icon="shield-alert" label="แจ้งเคลม" tone="red" onClick={openClaim} />
        <window.QuickAction icon="calculator" label="เช็คเบี้ย" tone="navy" onClick={openQuote} />
        <window.QuickAction icon="refresh-cw" label="ต่ออายุ" tone="sky" onClick={() => openRenew(expiring || motor)} />
        <window.QuickAction icon="phone-call" label={'โทร ' + data.hotline} tone="green" onClick={() => toast('กำลังโทรหาศูนย์บริการ 1292')} />
      </div>

      {/* renewal reminder */}
      {expiring && (
        <div style={{ margin: '16px 16px 0' }}>
          <button onClick={() => openRenew(expiring)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 14, border: '1px solid var(--amber-500)', background: 'var(--amber-50)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: '#fff', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HIcon name="clock-alert" size={21} stroke={2} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)' }}>{expiring.line} ใกล้หมดอายุ</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--amber-600)' }}>เหลืออีก {expiring.daysLeft} วัน · แตะเพื่อต่ออายุ</div>
            </div>
            <HIcon name="chevron-right" size={20} stroke={2} color="var(--amber-600)" />
          </button>
        </div>
      )}

      {/* PHYD */}
      <div style={{ padding: '20px 16px 0' }}>
        <window.SectionHead title="การขับขี่ของคุณ" />
        <PhydCard phyd={data.phyd} onClick={openPhyd} />
      </div>

      {/* activity */}
      <div style={{ padding: '22px 16px 0' }}>
        <window.SectionHead title="ความเคลื่อนไหวล่าสุด" action="ทั้งหมด" onAction={openNotifications} />
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '2px 14px' }}>
          {data.activity.map((a, i) => <ActivityItem key={a.id} a={a} last={i === data.activity.length - 1} />)}
        </div>
      </div>

      {/* cross-sell */}
      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <img src={(window.__resources && window.__resources.familyHome) || 'assets/family-home.png'} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} style={{ width: '100%', height: 168, objectFit: 'cover', background: 'linear-gradient(135deg, var(--teal-100), var(--sky-200))' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,29,66,0.92) 38%, rgba(11,29,66,0.25))' }} />
          <div style={{ position: 'absolute', inset: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '76%' }}>
            <HBadge tone="info" variant="solid" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>แนะนำสำหรับคุณ</HBadge>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: '#fff', lineHeight: 1.25 }}>Aioi Happy Home</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.45, margin: '4px 0 10px' }}>เพราะบ้านคือสถานที่ที่สำคัญที่สุด ปกป้องครบทั้งตัวบ้านและทรัพย์สิน</div>
            <button onClick={() => openQuote('home')} style={{ alignSelf: 'flex-start', cursor: 'pointer', border: 0, borderRadius: 99, background: 'var(--red-500)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>ดูแผนประกัน<HIcon name="arrow-right" size={16} stroke={2.2} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;
