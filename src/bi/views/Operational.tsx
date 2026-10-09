import { useEffect, useMemo, useState } from 'react';
import { rag, type Rag } from '../data';
import { CLAIM_PROCS, CLOCK, STAFF, UW_PROCS, staffById, type ItemState, type Proc, type Team } from '../ops';
import { LineChart, Legend, RagPill, downloadCsv } from '../charts';
import { PROC_NAME, PROC_SLA_TEXT, fmtDur, fmtNum, fmtPct, name, useL } from '../lang';
import { Card, ExportBtn, LensHeader, Seg, useBi, useDimLabels } from '../shared';

type Win = '1' | '7' | '30';
const DAY = 86400000;

function startOfBkkDay(ms: number) {
  const off = 7 * 3600000;
  return Math.floor((ms + off) / DAY) * DAY - off;
}

export function opsFiltered(ops: ItemState[], product: string, channel: string) {
  return ops.filter((s) => (product === 'all' || s.it.p === product) && (channel === 'all' || s.it.ch === channel));
}

/** median / p90 are time used as a share of SLA (1 = exactly on SLA). */
interface ProcStat { closed: number; met: number; open: number; over: number; atRisk: number; median: number; p90: number }
export function procStats(ops: ItemState[], proc: Proc, from: number): ProcStat {
  const xs = ops.filter((s) => s.it.proc === proc);
  const closed = xs.filter((s) => !s.open && s.closedAt! >= from);
  const open = xs.filter((s) => s.open);
  // durations as a share of each item's own SLA (targets differ by product)
  const durs = closed.map((s) => s.it.duration / s.it.target).sort((a, b) => a - b);
  const q = (p: number) => (durs.length ? durs[Math.min(durs.length - 1, Math.floor(p * durs.length))] : 0);
  return {
    closed: closed.length, met: closed.filter((s) => !s.over).length, open: open.length,
    over: open.filter((s) => s.over).length, atRisk: open.filter((s) => !s.over && s.el > s.it.target * 0.75).length,
    median: q(0.5), p90: q(0.9),
  };
}

export function Operational() {
  const { ops, now, flt, focus } = useBi();
  const { L, lang } = useL();
  const dim = useDimLabels();
  const [win, setWin] = useState<Win>('7');
  const [team, setTeam] = useState<'all' | Team>('all');
  const [staffSel, setStaffSel] = useState<string | null>(null);
  const [procSel, setProcSel] = useState<Proc | null>(focus && (UW_PROCS as string[]).concat(CLAIM_PROCS).includes(focus) ? (focus as Proc) : null);
  useEffect(() => {
    if (focus && (UW_PROCS as string[]).concat(CLAIM_PROCS).includes(focus)) setProcSel(focus as Proc);
  }, [focus]);
  const from = win === '1' ? startOfBkkDay(now) : now - Number(win) * DAY;
  const items = useMemo(() => opsFiltered(ops, flt.product, flt.channel), [ops, flt.product, flt.channel]);
  const procs = team === 'uw' ? UW_PROCS : team === 'claim' ? CLAIM_PROCS : [...UW_PROCS, ...CLAIM_PROCS];
  const stats = useMemo(() => new Map(procs.map((p) => [p, procStats(items, p, from)])), [items, from, procs.join()]);

  const workDays = win === '1' ? 1 : Math.round(Number(win) * 5 / 7);
  const staffRows = useMemo(() => STAFF.filter((s) => team === 'all' || s.team === team).map((s) => {
    const mine = items.filter((x) => x.it.staff === s.id);
    const closed = mine.filter((x) => !x.open && x.closedAt! >= from);
    const quotes = closed.filter((x) => x.it.proc === 'quote');
    return {
      s, closed: closed.length, perDay: closed.length / workDays, met: closed.length ? closed.filter((x) => !x.over).length / closed.length : 1,
      open: mine.filter((x) => x.open).length, over: mine.filter((x) => x.open && x.over).length,
      hit: quotes.length ? quotes.filter((x) => x.it.hit).length / quotes.length : null,
    };
  }), [items, from, team, workDays]);

  const exceptions = useMemo(() => items
    .filter((x) => x.open && (x.over || x.el > x.it.target * 0.75))
    .filter((x) => (team === 'all' || staffById.get(x.it.staff)!.team === team) && (!staffSel || x.it.staff === staffSel) && (!procSel || x.it.proc === procSel))
    .sort((a, b) => b.el / b.it.target - a.el / a.it.target), [items, team, staffSel, procSel]);

  // daily SLA-met trend per team, last 30 days
  const trend = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => startOfBkkDay(now) - (29 - i) * DAY);
    const series = (t: Team) => days.map((d) => {
      const xs = items.filter((x) => !x.open && x.closedAt! >= d && x.closedAt! < d + DAY && staffById.get(x.it.staff)!.team === t);
      return xs.length >= 5 ? xs.filter((x) => !x.over).length / xs.length : null;
    });
    return { days, uw: series('uw'), claim: series('claim') };
  }, [items, now]);

  const tile = (p: Proc) => {
    const st = stats.get(p)!;
    const met = st.closed ? st.met / st.closed : 1;
    const r: Rag = st.over > 0 && met < 0.85 ? 'bad' : rag(met);
    return (
      <button key={p} type="button" className={`ops-tile tone-${r}${procSel === p ? ' on' : ''}`} onClick={() => setProcSel(procSel === p ? null : p)} aria-pressed={procSel === p}>
        <span className="ops-tile-head">
          <span className={`signal sig-${r}`} aria-hidden="true">{r === 'good' ? '✓' : '!'}</span>
          <span><b>{name(PROC_NAME[p], lang)}</b><small>{name(PROC_SLA_TEXT[p], lang)}</small></span>
        </span>
        <span className="ops-big num">{fmtPct(met, lang, 1)}<small>{L('ตาม SLA', 'within SLA')}</small></span>
        <span className="meter" aria-hidden="true"><span style={{ width: `${met * 100}%` }} /><i style={{ left: '95%' }} /></span>
        <dl className="ops-kv">
          <div><dt>{L('ปิดงาน', 'Closed')}</dt><dd className="num">{fmtNum(st.closed, lang)}</dd></div>
          <div><dt>{L('ค้าง', 'Open')}</dt><dd className="num">{fmtNum(st.open, lang)}</dd></div>
          <div><dt>{L('เกิน SLA', 'Overdue')}</dt><dd className={`num${st.over ? ' bad-text' : ''}`}>{fmtNum(st.over, lang)}</dd></div>
          <div><dt>{L('ใกล้ครบ', 'At risk')}</dt><dd className="num">{fmtNum(st.atRisk, lang)}</dd></div>
        </dl>
      </button>
    );
  };

  const lifecycle = (t: Team, ps: Proc[]) => (
    <div className="lifecycle">
      <h4>{t === 'uw' ? L('Underwriting: วงจรงาน', 'Underwriting lifecycle') : L('Claim: วงจรงาน', 'Claim lifecycle')}</h4>
      <ol>
        {ps.map((p) => {
          const st = stats.get(p);
          if (!st) return null;
          const ratio = st.median;
          const r90 = st.p90;
          return (
            <li key={p} className={r90 > 1 ? 'late' : ''}>
              <span className="lc-dot" aria-hidden="true" />
              <div className="lc-body">
                <div className="lc-name">{name(PROC_NAME[p], lang)}</div>
                <div className="lc-bar">
                  <span className="lc-p50" style={{ width: `${Math.min(100, ratio * 66)}%` }} />
                  <span className="lc-p90" style={{ left: `${Math.min(100, r90 * 66)}%` }} />
                  <i style={{ left: '66%' }} />
                </div>
                <div className="hint num">
                  {L('มัธยฐาน', 'Median')} {fmtPct(st.median, lang, 0)} {L('ของ SLA', 'of SLA')} · P90 {fmtPct(st.p90, lang, 0)} · SLA {name(PROC_SLA_TEXT[p], lang)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <div className="lens-view">
      <LensHeader view="operational" title="Operational Dashboard · Operating Staff"
        question={L('เกิดอะไรขึ้นตอนนี้ และมีอะไรต้องแก้ไขด่วน?', 'What is happening now and what needs fixing?')}
        user={L('หัวหน้างาน UW / Claim (Supervisors)', 'UW / Claim supervisors')} freq={L('เรียลไทม์ (อัปเดตทุก 30 วินาที)', 'Real time (every 30 s)')} detail={L('ธุรกรรมรายตัว (Granular)', 'Granular transactions')}>
        <Seg label="window" value={win} onChange={setWin} options={[{ value: '1', label: L('วันนี้', 'Today') }, { value: '7', label: L('7 วัน', '7 days') }, { value: '30', label: L('30 วัน', '30 days') }]} />
        <Seg label="team" value={team} onChange={(v) => { setTeam(v); setStaffSel(null); setProcSel(null); }} options={[{ value: 'all', label: L('ทั้งหมด', 'All') }, { value: 'uw', label: 'Underwriting' }, { value: 'claim', label: 'Claim' }]} />
      </LensHeader>
      {(flt.product !== 'all' || flt.channel !== 'all') && (
        <p className="hint foot-note">{L('กรองตาม', 'Filtered by')} {flt.product !== 'all' && dim.product(flt.product)} {flt.channel !== 'all' && dim.channel(flt.channel)} · {L('ตัวกรองช่วงเวลาและภูมิภาคไม่ใช้กับเลนส์นี้', 'Period and region filters do not apply to this lens')}</p>
      )}

      <div className="ops-tiles">{procs.map(tile)}</div>

      <div className="grid-2col">
        <Card title={L('ติดตามวงจรงานและ SLA', 'Lifecycle & SLA tracking')} sub={L('เวลาที่ใช้เทียบ SLA ของแต่ละงาน · แถบ = มัธยฐาน · ขีดส้ม = P90 · เส้นตั้ง = 100% ของ SLA', 'Time used vs each item’s SLA · bar = median · orange tick = P90 · line = 100% of SLA')}>
          {(team === 'all' || team === 'uw') && lifecycle('uw', UW_PROCS)}
          {(team === 'all' || team === 'claim') && lifecycle('claim', CLAIM_PROCS)}
        </Card>
        <Card title={L('% งานตาม SLA รายวัน (30 วัน)', 'Daily % within SLA (30 days)')} sub={L('เส้นประ = เป้า 95%', 'Dashed = 95% goal')}>
          <Legend items={[{ label: 'Underwriting', color: 'var(--s1)' }, { label: 'Claim', color: 'var(--s2)' }]} />
          <LineChart labels={trend.days.map((d) => new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(d))}
            series={[
              ...(team !== 'claim' ? [{ key: 'uw', label: 'Underwriting', values: trend.uw, color: 'var(--s1)' }] : []),
              ...(team !== 'uw' ? [{ key: 'cl', label: 'Claim', values: trend.claim, color: 'var(--s2)' }] : []),
            ]}
            refLine={{ value: 0.95, label: '95%' }} yFloor={0.6} ariaLabel="daily SLA"
            format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
        </Card>
      </div>

      <Card id="exceptions" title={L('รายการต้องจัดการด่วน (Exceptions)', 'Action list (exceptions)')}
        sub={<>{L('งานที่เกิน SLA หรือใช้เวลาเกิน 75% ของ SLA แล้ว', 'Open items past SLA or past 75% of it')}{procSel && <> · <button type="button" className="link" onClick={() => setProcSel(null)}>{name(PROC_NAME[procSel], lang)} ✕</button></>}{staffSel && <> · <button type="button" className="link" onClick={() => setStaffSel(null)}>{name([staffById.get(staffSel)!.th, staffById.get(staffSel)!.en], lang)} ✕</button></>}</>}
        tools={<ExportBtn onClick={() => downloadCsv('exceptions.csv', ['id', 'process', 'product', 'channel', 'staff', 'elapsed_min', 'sla_min', 'status'], exceptions.map((x) => [x.it.id, x.it.proc, x.it.p, x.it.ch, x.it.staff, Math.round(x.el), x.it.target, x.over ? 'overdue' : 'at-risk']))} />}>
        <div className="table-wrap tall">
          <table className="data">
            <thead><tr><th aria-label="priority" /><th>{L('เลขงาน', 'Item')}</th><th>{L('ขั้นตอน', 'Step')}</th><th>{L('ผลิตภัณฑ์', 'Product')}</th><th>{L('ผู้รับผิดชอบ', 'Owner')}</th><th className="r">{L('ใช้ไป', 'Elapsed')}</th><th className="r">SLA</th><th>{L('สถานะ', 'Status')}</th></tr></thead>
            <tbody>
              {exceptions.slice(0, 60).map((x) => {
                const clock = CLOCK[x.it.proc];
                const left = x.it.target - x.el;
                const st = staffById.get(x.it.staff)!;
                return (
                  <tr key={x.it.id} className={x.over ? 'row-bad' : ''}>
                    <td><span className={`signal small sig-${x.over ? 'bad' : 'warn'}`} aria-hidden="true">!</span></td>
                    <td className="ref">{x.it.id}</td>
                    <td>{name(PROC_NAME[x.it.proc], lang)}</td>
                    <td>{dim.product(x.it.p)}</td>
                    <td>{name([st.th, st.en], lang)}</td>
                    <td className="r num">{fmtDur(x.el, clock, lang)}</td>
                    <td className="r num">{fmtDur(x.it.target, clock, lang)}</td>
                    <td>{x.over ? <span className="pill tone-bad">{L('เกิน', 'Over by')} {fmtDur(-left, clock, lang)}</span> : <span className="pill tone-warn">{L('เหลือ', 'Due in')} {fmtDur(left, clock, lang)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!exceptions.length && <p className="empty-ok">✓ {L('ไม่มีงานค้างเกิน SLA', 'Nothing overdue')}</p>}
          {exceptions.length > 60 && <p className="hint">{L(`แสดง 60 จาก ${fmtNum(exceptions.length, lang)} รายการ (ดาวน์โหลด CSV เพื่อดูทั้งหมด)`, `Showing 60 of ${fmtNum(exceptions.length, lang)} (download CSV for all)`)}</p>}
        </div>
      </Card>

      <Card title={L('ผลงานรายบุคคล', 'Staff performance')} sub={L(`ช่วง ${win === '1' ? 'วันนี้' : win + ' วัน'} · คลิกชื่อเพื่อกรองรายการด่วน`, `${win === '1' ? 'Today' : win + ' days'} · click a name to filter the action list`)}
        tools={<ExportBtn onClick={() => downloadCsv('staff-performance.csv', ['staff', 'team', 'closed', 'per_day', 'sla_met', 'open', 'overdue', 'hit_ratio'], staffRows.map((r) => [r.s.en, r.s.team, r.closed, r.perDay, r.met, r.open, r.over, r.hit ?? '']))} />}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>{L('เจ้าหน้าที่', 'Staff')}</th><th>{L('ทีม', 'Team')}</th><th className="r">{L('ปิดงาน', 'Closed')}</th><th className="r">{L('งาน/วัน', 'Per day')}</th><th className="r">% SLA</th><th className="r">{L('ค้าง', 'Open')}</th><th className="r">{L('เกิน SLA', 'Overdue')}</th><th className="r">Hit Ratio</th></tr></thead>
            <tbody>
              {staffRows.map((r) => (
                <tr key={r.s.id} className={staffSel === r.s.id ? 'sel' : ''}>
                  <td><button type="button" className="link" onClick={() => { setStaffSel(staffSel === r.s.id ? null : r.s.id); document.getElementById('exceptions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{name([r.s.th, r.s.en], lang)}</button></td>
                  <td>{r.s.team === 'uw' ? 'UW' : 'Claim'}</td>
                  <td className="r num">{fmtNum(r.closed, lang)}</td>
                  <td className="r num">{fmtNum(r.perDay, lang, 1)}</td>
                  <td className="r"><RagPill r={rag(r.met)}>{fmtPct(r.met, lang)}</RagPill></td>
                  <td className="r num">{fmtNum(r.open, lang)}</td>
                  <td className={`r num${r.over ? ' bad-text' : ''}`}>{fmtNum(r.over, lang)}</td>
                  <td className="r num">{r.hit === null ? '—' : fmtPct(r.hit, lang, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{L('Hit Ratio = ใบเสนอราคาที่ปิดขายได้ ÷ ใบเสนอราคาที่ส่งแล้ว (เฉพาะ UW)', 'Hit ratio = quotations converted ÷ quotations sent (UW only)')}</p>
      </Card>
    </div>
  );
}
