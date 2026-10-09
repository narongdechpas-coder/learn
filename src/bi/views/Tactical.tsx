import { useMemo, useState } from 'react';
import { CHANNELS, CY, FIRST_YEAR, UNITS, groupAgg, monthOfYear, periodMonths, rag, ratios, select, type Channel } from '../data';
import { Bullets, ColumnChart, Legend, LineChart, RagPill, downloadCsv } from '../charts';
import { fmtM, fmtMAxis, fmtNum, fmtPct, monthLabel, monthShort, name, useL } from '../lang';
import { Card, ExportBtn, LensHeader, useBi, useDimLabels } from '../shared';

type SortKey = 'achNb' | 'nb' | 'rr' | 'n60' | 'conv' | 'achRn';
const NOTICE_GOAL = 0.95;

export function Tactical() {
  const { flt, setFlt, go } = useBi();
  const { L, lang } = useL();
  const dim = useDimLabels();
  const [sort, setSort] = useState<SortKey>('achNb');
  const months = periodMonths(flt.asOf, flt.mode);
  const rows = useMemo(() => select(months, { ...flt, channel: 'all' }), [months.join(), flt]);
  const byCh = useMemo(() => groupAgg(rows, (f) => f.ch), [rows]);
  const scoped = useMemo(() => rows.filter((f) => flt.channel === 'all' || f.ch === flt.channel), [rows, flt.channel]);
  const byUnit = useMemo(() => groupAgg(scoped, (f) => f.u), [scoped]);

  const cyStart = (CY - FIRST_YEAR) * 12;
  const ytdMonths = Array.from({ length: flt.asOf - cyStart + 1 }, (_, i) => cyStart + i);
  const monthly = useMemo(() => groupAgg(select(Array.from({ length: flt.asOf + 1 }, (_, i) => i), flt), (f) => f.m), [flt]);

  const board = useMemo(() => [...byUnit.entries()].map(([u, a]) => ({ u: UNITS[u], a, r: ratios(a) }))
    .sort((x, y) => (sort === 'nb' ? y.a.nb - x.a.nb : (y.r[sort] as number) - (x.r[sort] as number))), [byUnit, sort]);

  const toggleCh = (c: Channel) => setFlt({ ...flt, channel: flt.channel === c ? 'all' : c });

  const th = (k: SortKey, label: string) => (
    <th className="r"><button type="button" className={`sort${sort === k ? ' on' : ''}`} onClick={() => setSort(k)}>{label}{sort === k ? ' ▼' : ''}</button></th>
  );

  return (
    <div className="lens-view">
      <LensHeader view="tactical" title="Tactical Dashboard · Marketing & Sales"
        question={L('ผลงานของทีมขายช่วงนี้เป็นอย่างไรเมื่อเทียบกับเป้าหมาย?', 'How are the sales teams doing against target?')}
        user={L('ผู้จัดการฝ่ายขาย / หัวหน้าช่องทาง', 'Sales & channel managers')} freq={L('รายวัน / รายสัปดาห์', 'Daily / weekly')} detail={L('สรุปตามช่องทางและทีม (Segmented)', 'By channel and team (segmented)')} />

      <div className="ch-cards">
        {CHANNELS.map((c) => {
          const a = byCh.get(c);
          if (!a) return null;
          const r = ratios(a);
          return (
            <button key={c} type="button" className={`ch-card${flt.channel === c ? ' on' : ''}${flt.channel !== 'all' && flt.channel !== c ? ' dim' : ''}`} onClick={() => toggleCh(c)} aria-pressed={flt.channel === c}>
              <span className="ch-head"><b>{dim.channel(c)}</b><RagPill r={rag(r.achNb)}>{fmtPct(r.achNb, lang, 0)}</RagPill></span>
              <span className="ch-main num">{fmtM(a.nb, lang, 0)}<small>{L('งานใหม่ (New Business)', 'New business')} · {L('เป้า', 'target')} {fmtM(a.tgtNb, lang, 0)}</small></span>
              <dl className="ch-kv">
                <div><dt>{L('อัตราต่ออายุ', 'Renewal rate')}</dt><dd className="num">{fmtPct(r.rr, lang)} <RagPill r={rag(r.rr / r.rrPlan)}>{L('เป้า', 'plan')} {fmtPct(r.rrPlan, lang, 0)}</RagPill></dd></div>
                <div><dt>{L('เบี้ยต่ออายุ vs เป้า', 'Renewal premium vs target')}</dt><dd className="num">{fmtM(a.rn, lang, 0)} · {fmtPct(r.achRn, lang, 0)}</dd></div>
                <div><dt>{L('แจ้งต่ออายุ ≥60 วัน', 'Notice ≥60 days')}</dt><dd className="num">{fmtPct(r.n60, lang)} <RagPill r={rag(r.n60 / NOTICE_GOAL)}>SLA 95%</RagPill></dd></div>
                <div><dt>{L('Lead → ปิดการขาย', 'Lead conversion')}</dt><dd className="num">{fmtPct(r.conv, lang)} <span className="muted">({fmtNum(a.leads, lang)} leads)</span></dd></div>
              </dl>
            </button>
          );
        })}
      </div>
      <p className="hint foot-note">{L('คลิกการ์ดช่องทางเพื่อกรองทั้งแดชบอร์ด · คลิกซ้ำเพื่อยกเลิก', 'Click a channel card to filter the whole dashboard · click again to clear')}</p>

      <div className="grid-2col">
        <Card title={L('งานใหม่รายเดือน เทียบเป้า', 'New business by month vs target')} sub={L(`ปี ${CY + 543}`, `${CY}`)}>
          <Legend items={[{ label: L('ผลจริง', 'Actual'), color: 'var(--s1)', box: true }, { label: L('เป้าหมาย', 'Target'), color: 'var(--s-target)', box: true }]} />
          <ColumnChart labels={ytdMonths.map((m) => monthShort(monthOfYear(m), lang))} ariaLabel="new business vs target"
            series={[
              { key: 'a', label: L('ผลจริง', 'Actual'), values: ytdMonths.map((m) => monthly.get(m)?.nb ?? 0), color: 'var(--s1)' },
              { key: 't', label: L('เป้าหมาย', 'Target'), values: ytdMonths.map((m) => monthly.get(m)?.tgtNb ?? 0), color: 'var(--s-target)' },
            ]}
            format={(v) => fmtM(v, lang)} formatAxis={(v) => fmtMAxis(v, lang)} />
        </Card>
        <Card title={L('อัตราต่ออายุรายเดือน', 'Renewal rate by month')} sub={L('กรมธรรม์ต่ออายุ ÷ กรมธรรม์ครบกำหนด · เส้นประ = เป้า', 'Renewed ÷ due policies · dashed = plan')}>
          <Legend items={[{ label: L('อัตราต่ออายุ', 'Renewal rate'), color: 'var(--s1)' }, { label: L('เป้า', 'Plan'), color: 'var(--ink-2)', dashed: true }]} />
          <LineChart labels={[...monthly.keys()].sort((a, b) => a - b).map((m) => monthLabel(m, lang))} ariaLabel="renewal rate" yFloor={0.5}
            series={[
              { key: 'rr', label: L('อัตราต่ออายุ', 'Renewal rate'), values: [...monthly.keys()].sort((a, b) => a - b).map((m) => ratios(monthly.get(m)!).rr), color: 'var(--s1)' },
              { key: 'pl', label: L('เป้า', 'Plan'), values: [...monthly.keys()].sort((a, b) => a - b).map((m) => ratios(monthly.get(m)!).rrPlan), color: 'var(--ink-2)', dashed: true },
            ]}
            format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
        </Card>
      </div>

      <div className="grid-2col">
        <Card title={L('Renewal SLA: แจ้งต่ออายุล่วงหน้า', 'Renewal SLA: advance notice')} sub={L('% กรมธรรม์ที่ส่งใบแจ้งต่ออายุก่อนหมดอายุ ≥60 วัน (แท่ง) · ขีด = เป้า 95%', '% of due policies noticed ≥60 days ahead (bar) · tick = 95% goal')}>
          <Bullets emptyText="—" format={(v) => fmtPct(v, lang)}
            rows={CHANNELS.filter((c) => byCh.has(c)).map((c) => {
              const r = ratios(byCh.get(c)!);
              return { key: c, label: dim.channel(c), sub: `≥30 ${L('วัน', 'days')}: ${fmtPct(r.n30, lang)}`, actual: r.n60, target: NOTICE_GOAL, rag: rag(r.n60 / NOTICE_GOAL), pct: fmtPct(r.n60 / NOTICE_GOAL, lang, 0) };
            })}
            onPick={(c) => toggleCh(c as Channel)} />
        </Card>
        <Card title={L('เบี้ยต่ออายุ เทียบเป้า', 'Renewal premium vs target')} sub={L('คลิกเพื่อดูสาเหตุการไม่ต่ออายุในเลนส์วิเคราะห์', 'Click to see non-renewal causes in Analysis')}>
          <Bullets emptyText="—" format={(v) => fmtM(v, lang, 0)}
            rows={CHANNELS.filter((c) => byCh.has(c)).map((c) => {
              const a = byCh.get(c)!;
              const r = ratios(a);
              return { key: c, label: dim.channel(c), sub: `${fmtNum(a.polRn, lang)} / ${fmtNum(a.due, lang)} ${L('กรมธรรม์', 'policies')}`, actual: a.rn, target: a.tgtRn, rag: rag(r.achRn), pct: fmtPct(r.achRn, lang, 0) };
            })}
            onPick={(c) => go('analytical', { channel: c as Channel }, 'retention')} />
        </Card>
      </div>

      <Card title={L('Leaderboard: จัดอันดับทีมขาย', 'Leaderboard: sales teams')}
        sub={`${flt.mode} ${monthLabel(flt.asOf, lang)}${flt.channel !== 'all' ? ' · ' + dim.channel(flt.channel) : ''} · ${L('คลิกหัวคอลัมน์เพื่อจัดเรียง', 'click a column to sort')}`}
        tools={<ExportBtn onClick={() => downloadCsv('sales-leaderboard.csv', ['unit', 'channel', 'region', 'nb_m', 'nb_target_m', 'nb_achievement', 'renewal_rate', 'renewal_premium_ach', 'notice60', 'lead_conversion'], board.map(({ u, a, r }) => [u.en, u.ch, u.rg, a.nb, a.tgtNb, r.achNb, r.rr, r.achRn, r.n60, r.conv]))} />}>
        <div className="table-wrap">
          <table className="data board">
            <thead><tr><th>#</th><th>{L('ทีม/หน่วยขาย', 'Team / unit')}</th><th>{L('ช่องทาง', 'Channel')}</th>{th('nb', L('งานใหม่', 'New business'))}{th('achNb', L('% เป้า', '% target'))}{th('rr', L('ต่ออายุ', 'Renewal'))}{th('achRn', L('เบี้ยต่ออายุ % เป้า', 'Renewal % target'))}{th('n60', L('แจ้ง ≥60 วัน', 'Notice ≥60d'))}{th('conv', 'Conversion')}</tr></thead>
            <tbody>
              {board.map(({ u, a, r }, i) => (
                <tr key={u.id}>
                  <td className="num rank">{i + 1}</td>
                  <td>{name([u.th, u.en], lang)}<div className="hint">{dim.region(u.rg)}</div></td>
                  <td>{dim.channel(u.ch)}</td>
                  <td className="r num">{fmtM(a.nb, lang)}</td>
                  <td className="r"><RagPill r={rag(r.achNb)}>{fmtPct(r.achNb, lang, 0)}</RagPill></td>
                  <td className="r"><RagPill r={rag(r.rr / r.rrPlan)}>{fmtPct(r.rr, lang, 0)}</RagPill></td>
                  <td className="r num">{fmtPct(r.achRn, lang, 0)}</td>
                  <td className="r"><RagPill r={rag(r.n60 / NOTICE_GOAL)}>{fmtPct(r.n60, lang, 0)}</RagPill></td>
                  <td className="r num">{fmtPct(r.conv, lang, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
