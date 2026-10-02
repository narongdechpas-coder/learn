/* ABI Mobile App — Policy Detail + digital insurance card */
const { Icon: DIcon, Button: DButton, Badge: DBadge } = window.AioiBangkokInsuranceDesignSystem_cf9069;

/* The digital insurance card (navy, shard motif) */
function PolicyCardFace({ p, user, compact }) {
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg, var(--navy-600), var(--navy-900))', boxShadow: 'var(--shadow-lg)', color: '#fff' }}>
      <window.Shard />
      <div style={{ position: 'relative', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <window.BrandMark size={34} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.15 }}>AIOI BANGKOK</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '.14em', color: 'rgba(255,255,255,0.6)' }}>INSURANCE</div>
            </div>
          </div>
          <window.StatusBadge status={p.status} />
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', letterSpacing: '.02em' }}>{p.line}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1.2, marginTop: 1 }}>{p.title}</div>
        </div>

        {p.plate && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px' }}>
            <window.Mono style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>{p.plate}</window.Mono>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.25)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{p.province}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 22, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '.05em' }}>เลขกรมธรรม์</div>
            <window.Mono style={{ fontSize: 13.5, fontWeight: 500, color: '#fff' }}>{p.policyNo}</window.Mono>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '.05em' }}>คุ้มครองถึง</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#fff' }}>{p.end}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
          ผู้เอาประกัน · <strong style={{ color: '#fff' }}>คุณ{user.name}</strong>
        </div>
      </div>
    </div>
  );
}

function CardModal({ p, user, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(11,29,66,0.55)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 18px 30px', animation: 'sheetUp .28s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--ink-200)', margin: '0 auto 16px' }} />
        <PolicyCardFace p={p} user={user} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <div style={{ width: 150, height: 150, borderRadius: 14, background: '#fff', border: '1px solid var(--ink-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DIcon name="qr-code" size={120} stroke={1.1} color="var(--navy-900)" />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-500)', textAlign: 'center' }}>แสดงบัตรนี้ที่ด่าน จุดตรวจ หรืออู่ในเครือ</div>
        </div>
        <DButton variant="navy" block shape="rounded" iconLeft="x" onClick={onClose} style={{ marginTop: 16 }}>ปิด</DButton>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink-500)' }}>{label}</span>
      {mono
        ? <window.Mono style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy-900)' }}>{value}</window.Mono>
        : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-900)' }}>{value}</span>}
    </div>
  );
}

function DetailScreen({ p, user, back, openClaim, openCard, openRenew, toast }) {
  const src = p.photo && window.CAR_PHOTOS ? window.CAR_PHOTOS[p.photo] : null;
  return (
    <div style={{ paddingBottom: 30 }}>
      {/* header */}
      <div style={{ position: 'relative', background: 'linear-gradient(150deg, var(--navy-700), var(--navy-900))', padding: '50px 16px 64px', overflow: 'hidden' }}>
        {src && (
          <React.Fragment>
            <img src={src} alt={p.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(21,53,125,0.78), rgba(11,29,66,0.92))' }} />
          </React.Fragment>
        )}
        <window.Shard />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={back} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DIcon name="arrow-left" size={21} stroke={2.2} color="#fff" />
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: '#fff' }}>รายละเอียดกรมธรรม์</div>
        </div>
      </div>

      {/* card */}
      <div style={{ margin: '-48px 16px 0', position: 'relative', zIndex: 2 }}>
        <PolicyCardFace p={p} user={user} />
        <button onClick={() => openCard(p)} style={{ width: '100%', marginTop: 10, cursor: 'pointer', border: '1px solid var(--ink-200)', background: '#fff', borderRadius: 12, padding: '11px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--navy-700)', boxShadow: 'var(--shadow-xs)', whiteSpace: 'nowrap' }}>
          <DIcon name="qr-code" size={18} stroke={2} />แสดงบัตรประกันแบบเต็ม
        </button>
      </div>

      {/* coverage */}
      <div style={{ padding: '22px 16px 0' }}>
        <window.SectionHead title="ความคุ้มครอง" />
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '4px 16px' }}>
          {p.coverage.map((c, i) => <window.CoverageLine key={i} label={c.label} value={c.value} last={i === p.coverage.length - 1} />)}
        </div>
      </div>

      {/* policy info */}
      <div style={{ padding: '22px 16px 0' }}>
        <window.SectionHead title="ข้อมูลกรมธรรม์" />
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-sm)', padding: '4px 16px' }}>
          <InfoRow label="เลขที่กรมธรรม์" value={p.policyNo} mono />
          <InfoRow label="ระยะเวลาคุ้มครอง" value={p.start + ' – ' + p.end} />
          {p.repairType && <InfoRow label="ประเภทการซ่อม" value={p.repairType} />}
          {p.garage && <InfoRow label="อู่/ศูนย์ในเครือ" value={p.garage} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0 11px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink-500)' }}>เบี้ยประกัน/ปี</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--navy-900)' }}>฿{p.premium.toLocaleString(undefined, { minimumFractionDigits: p.premium % 1 ? 2 : 0 })}</span>
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '22px 16px 0' }}>
        <DButton variant="primary" block size="lg" iconLeft="shield-alert" onClick={() => openClaim(p)}>แจ้งเคลม</DButton>
        <div style={{ display: 'flex', gap: 10 }}>
          <DButton variant="navy" block iconLeft="refresh-cw" onClick={() => openRenew(p)}>ต่ออายุ</DButton>
          <DButton variant="outline" block iconLeft="download" onClick={() => p.order
            ? window.ABI_downloadPolicy(p.order).catch((e) => { if (!e || e.code !== 'declined') toast('ดาวน์โหลดไม่สำเร็จ'); })
            : toast('กรมธรรม์ตัวอย่าง ไม่มีไฟล์ PDF')}>ดาวน์โหลด</DButton>
        </div>
        <button onClick={() => toast('โทรหาเจ้าหน้าที่ดูแลกรมธรรม์')} style={{ marginTop: 4, cursor: 'pointer', border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--navy-600)' }}>
          <DIcon name="phone" size={17} stroke={2.2} />ติดต่อเจ้าหน้าที่ดูแลกรมธรรม์
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { DetailScreen, CardModal, PolicyCardFace });
