import { useEffect, useMemo, useState } from 'react';
import {
  CHANNELS, CLAIM_SAMPLE, NONRENEW_MIX, NONRENEW_REASONS, PRODUCTS, REGIONS, UNITS, agg, groupAgg, periodMonths, ragLower, ratios, renewalByPriceChange, renewalByTenure, select,
  type Channel, type Product, type Region,
} from '../data';
import { ColumnChart, DivBars, Legend, LineChart, RagPill, Scatter, downloadCsv } from '../charts';
import { fmtBaht, fmtM, fmtNum, fmtPct, monthLabel, useL } from '../lang';
import { Card, ExportBtn, LensHeader, Seg, useBi, useDimLabels } from '../shared';

type Col = 'channel' | 'region';
type Metric = 'lr' | 'cr';
type ProfSort = 'gwp' | 'lr' | 'cr' | 'uwp';

export function Analytical() {
  const { flt, setFlt, focus } = useBi();
  const { L, lang } = useL();
  const dim = useDimLabels();
  const [col, setCol] = useState<Col>(flt.region !== 'all' ? 'region' : 'channel');
  const [metric, setMetric] = useState<Metric>('lr');
  const [cell, setCell] = useState<{ p: Product; c: string } | null>(null);
  const [profSort, setProfSort] = useState<ProfSort>('uwp');
  const [rawPage, setRawPage] = useState(0);

  useEffect(() => setRawPage(0), [flt]);
  useEffect(() => {
    if (focus) document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);

  const months = periodMonths(flt.asOf, flt.mode);
  const rows = useMemo(() => select(months, flt), [months.join(), flt]);
  const cols: string[] = col === 'channel' ? [...CHANNELS] : [...REGIONS];
  const colLabel = (c: string) => (col === 'channel' ? dim.channel(c as Channel) : dim.region(c as Region));
  const prods = flt.product === 'all' ? [...PRODUCTS] : [flt.product];
  const heat = useMemo(() => groupAgg<string>(rows, (f) => `${f.p}|${col === 'channel' ? f.ch : f.rg}`), [rows, col]);

  // diverging colour vs plan: blue = better than plan, red = worse; grey at plan
  const cellStyle = (actual: number, plan: number) => {
    const d = Math.max(-1, Math.min(1, (actual - plan) / 0.25));
    const pct = Math.round(Math.abs(d) * 100);
    const pole = d > 0 ? 'var(--div-bad)' : 'var(--div-good)';
    return { background: `color-mix(in srgb, ${pole} ${pct}%, var(--div-mid))`, color: pct > 55 ? '#fff' : 'var(--ink)' };
  };

  const sel = cell ?? (() => {
    // default selection: the worst cell vs plan
    let worst: { p: Product; c: string } | null = null;
    let gap = -Infinity;
    for (const p of prods) for (const c of cols) {
      const a = heat.get(`${p}|${c}`);
      if (!a || a.nep < 1) continue;
      const r = ratios(a);
      const g = metric === 'lr' ? r.lr - r.lrPlan : r.cr - r.crPlan;
      if (g > gap) { gap = g; worst = { p, c }; }
    }
    return worst;
  })();

  const cellTrend = useMemo(() => {
    if (!sel) return null;
    const all = Array.from({ length: flt.asOf + 1 }, (_, i) => i);
    const g = groupAgg(select(all, { product: sel.p, channel: col === 'channel' ? (sel.c as Channel) : flt.channel, region: col === 'region' ? (sel.c as Region) : flt.region }), (f) => f.m);
    return {
      labels: all.map((m) => monthLabel(m, lang)),
      act: all.map((m) => { const a = g.get(m); return a ? (metric === 'lr' ? ratios(a).lr : ratios(a).cr) : null; }),
      plan: all.map((m) => { const a = g.get(m); return a ? (metric === 'lr' ? ratios(a).lrPlan : ratios(a).crPlan) : null; }),
    };
  }, [sel?.p, sel?.c, col, metric, flt, lang]);

  const unitRows = useMemo(() => {
    if (!sel) return [];
    const xs = rows.filter((f) => f.p === sel.p && (col === 'channel' ? f.ch === sel.c : f.rg === sel.c));
    return [...groupAgg(xs, (f) => f.u).entries()].map(([u, a]) => ({ u: UNITS[u], a, r: ratios(a) })).sort((x, y) => y.r.lr - x.r.lr);
  }, [rows, sel?.p, sel?.c, col]);

  // frequency × severity by product × region × channel
  const scatterProduct: Product = sel?.p ?? (flt.product === 'all' ? 'motor' : flt.product);
  const fs = useMemo(() => {
    const g = groupAgg(select(months, { product: 'all', channel: flt.channel, region: flt.region }), (f) => `${f.p}|${f.rg}|${f.ch}`);
    const nepMax = Math.max(...[...g.values()].map((a) => a.nep));
    return [...g.entries()].filter(([, a]) => a.clmCnt > 3).map(([k, a]) => {
      const [p, rg, ch] = k.split('|') as [Product, Region, Channel];
      const r = ratios(a);
      return { key: k, x: r.freq, y: r.sev, hot: p === scatterProduct, size: 3 + Math.sqrt(a.nep / nepMax) * 7, label: `${dim.product(p)} · ${dim.region(rg)} · ${dim.channel(ch)}` };
    }).filter((pt) => pt.hot);
  }, [months.join(), flt.channel, flt.region, scatterProduct, lang]);

  const hist = useMemo(() => {
    const xs = CLAIM_SAMPLE.filter((c) => c.p === scatterProduct && (flt.region === 'all' || c.rg === flt.region) && (flt.channel === 'all' || c.ch === flt.channel)).map((c) => c.amount);
    const edges = [0, 5e3, 1e4, 2e4, 4e4, 8e4, 1.6e5, 3.2e5, 6.4e5, Infinity];
    const counts = edges.slice(0, -1).map((lo, i) => xs.filter((v) => v >= lo && v < edges[i + 1]).length);
    const sorted = [...xs].sort((a, b) => a - b);
    const k = (v: number) => `${v / 1e3}`;
    return {
      labels: edges.slice(0, -1).map((lo, i) => (i === 0 ? `<${k(edges[1])}K` : edges[i + 1] === Infinity ? `>${k(lo)}K` : `${k(lo)}–${k(edges[i + 1])}K`)),
      counts, n: xs.length,
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      mean: xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length),
    };
  }, [scatterProduct, flt.region, flt.channel]);

  const retCh = flt.channel;
  const reasons = useMemo(() => {
    const chs: readonly Channel[] = retCh === 'all' ? CHANNELS : [retCh];
    return NONRENEW_REASONS.map((r) => ({ r, v: chs.reduce((s, c) => s + NONRENEW_MIX[c][r], 0) / chs.length })).sort((a, b) => b.v - a.v);
  }, [retCh]);
  const reasonName: Record<string, [string, string]> = {
    price: ['เบี้ยสูงกว่าที่คาด / ราคา', 'Price too high'], competitor: ['ย้ายไปบริษัทอื่นที่ถูกกว่า', 'Switched to cheaper competitor'], soldCar: ['ขายรถ / ไม่มีทรัพย์สินแล้ว', 'Sold the car / asset'],
    service: ['ไม่พอใจบริการ', 'Unhappy with service'], claimExp: ['ประสบการณ์เคลมไม่ดี', 'Poor claim experience'], other: ['อื่นๆ', 'Other'],
  };

  const prof = useMemo(() => {
    const g = groupAgg(rows, (f) => `${f.p}|${f.ch}`);
    return [...g.entries()].map(([k, a]) => { const [p, ch] = k.split('|') as [Product, Channel]; return { k, p, ch, a, r: ratios(a) }; })
      .sort((x, y) => (profSort === 'gwp' ? y.a.gwp - x.a.gwp : profSort === 'uwp' ? x.r.uwp - y.r.uwp : (y.r[profSort] as number) - (x.r[profSort] as number)));
  }, [rows, profSort]);

  const raw = useMemo(() => rows.slice().sort((a, b) => b.m - a.m || b.gwp - a.gwp), [rows]);
  const PAGE = 25;

  const applyCell = () => {
    if (!sel) return;
    setFlt({ ...flt, product: sel.p, ...(col === 'channel' ? { channel: sel.c as Channel } : { region: sel.c as Region }) });
  };
  const profTh = (k: ProfSort, label: string) => <th className="r"><button type="button" className={`sort${profSort === k ? ' on' : ''}`} onClick={() => setProfSort(k)}>{label}{profSort === k ? (k === 'uwp' ? ' ▲' : ' ▼') : ''}</button></th>;

  return (
    <div className="lens-view">
      <LensHeader view="analytical" title="Analytical Dashboard · Business Analysis"
        question={L('ทำไมสิ่งนี้จึงเกิดขึ้น และมีแนวโน้มอะไรซ่อนอยู่?', 'Why did this happen, and what trends are hiding?')}
        user={L('นักวิเคราะห์ข้อมูล / Actuary / BI', 'Data analysts / actuaries / BI')} freq={L('ตามต้องการ / ข้อมูลย้อนหลัง', 'On demand / historical')} detail={L('ข้อมูลเชิงลึก (Exploratory)', 'Exploratory')} />

      <Card id="heat" title={L('Loss Ratio Drill-down', 'Loss ratio drill-down')}
        sub={L('สีน้ำเงิน = ดีกว่าแผน · สีแดง = แย่กว่าแผน · คลิกช่องเพื่อเจาะลึก', 'Blue = better than plan · red = worse · click a cell to drill down')}
        tools={<>
          <Seg label="metric" value={metric} onChange={setMetric} options={[{ value: 'lr', label: 'Loss Ratio' }, { value: 'cr', label: 'Combined' }]} />
          <Seg label="columns" value={col} onChange={(v) => { setCol(v); setCell(null); }} options={[{ value: 'channel', label: L('× ช่องทาง', '× Channel') }, { value: 'region', label: L('× ภูมิภาค', '× Region') }]} />
        </>}>
        <div className="table-wrap">
          <table className="heat">
            <thead><tr><th />{cols.map((c) => <th key={c}>{colLabel(c)}</th>)}<th>{L('รวม', 'Total')}</th></tr></thead>
            <tbody>
              {prods.map((p) => {
                const pr = rows.filter((f) => f.p === p);
                const tot = pr.length ? ratios(agg(pr)) : null;
                return (
                  <tr key={p}>
                    <th>{dim.product(p)}</th>
                    {cols.map((c) => {
                      const a = heat.get(`${p}|${c}`);
                      if (!a || a.nep < 0.5) return <td key={c} className="na">—</td>;
                      const r = ratios(a);
                      const v = metric === 'lr' ? r.lr : r.cr;
                      const plan = metric === 'lr' ? r.lrPlan : r.crPlan;
                      const on = sel?.p === p && sel?.c === c;
                      return (
                        <td key={c}>
                          <button type="button" className={`heat-cell${on ? ' on' : ''}`} style={cellStyle(v, plan)} onClick={() => setCell({ p, c })} aria-pressed={on}
                            title={`${dim.product(p)} · ${colLabel(c)}: ${fmtPct(v, lang)} (${L('แผน', 'plan')} ${fmtPct(plan, lang)})`}>
                            <b className="num">{fmtPct(v, lang, 0)}</b>
                            <small className="num">{v - plan >= 0 ? '+' : ''}{fmtNum((v - plan) * 100, lang, 0)}pp</small>
                          </button>
                        </td>
                      );
                    })}
                    <td className="heat-total num">{tot ? fmtPct(metric === 'lr' ? tot.lr : tot.cr, lang, 1) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="heat-scale" aria-hidden="true"><span>{L('ดีกว่าแผน', 'Better than plan')}</span><i /><span>{L('แย่กว่าแผน', 'Worse than plan')}</span></div>

        {sel && cellTrend && (
          <div className="drill">
            <div className="drill-head">
              <div>
                <p className="eyebrow">{L('เจาะลึก', 'Drill-down')}</p>
                <h4>{dim.product(sel.p)} · {colLabel(sel.c)}</h4>
              </div>
              <button type="button" className="btn small" onClick={applyCell}>{L('ใช้เป็นตัวกรองทั้งแดชบอร์ด', 'Apply as global filter')}</button>
            </div>
            <div className="grid-2col tight">
              <div>
                <Legend items={[{ label: metric === 'lr' ? 'Loss Ratio' : 'Combined Ratio', color: 'var(--s1)' }, { label: L('แผน', 'Plan'), color: 'var(--ink-2)', dashed: true }]} />
                <LineChart labels={cellTrend.labels} ariaLabel="cell trend" height={210}
                  series={[{ key: 'a', label: metric === 'lr' ? 'Loss Ratio' : 'Combined', values: cellTrend.act, color: 'var(--s1)' }, { key: 'p', label: L('แผน', 'Plan'), values: cellTrend.plan, color: 'var(--ink-2)', dashed: true }]}
                  format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>{L('หน่วยขาย', 'Unit')}</th><th className="r">NEP</th><th className="r">LR</th><th className="r">{L('ความถี่', 'Freq.')}</th><th className="r">{L('ความรุนแรง', 'Severity')}</th></tr></thead>
                  <tbody>
                    {unitRows.map(({ u, a, r }) => (
                      <tr key={u.id}>
                        <td>{lang === 'th' ? u.th : u.en}</td>
                        <td className="r num">{fmtM(a.nep, lang)}</td>
                        <td className="r"><RagPill r={ragLower(r.lr, r.lrPlan)}>{fmtPct(r.lr, lang, 0)}</RagPill></td>
                        <td className="r num">{fmtNum(r.freq, lang, 1)}</td>
                        <td className="r num">{fmtBaht(r.sev, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid-2col">
        <Card title={L('ความถี่ × ความรุนแรงของเคลม', 'Claim frequency × severity')}
          sub={<>{dim.product(scatterProduct)} · {L('จุด = ภูมิภาค × ช่องทาง · ขนาด = NEP · เส้น = ค่าเฉลี่ย', 'dot = region × channel · size = NEP · lines = mean')}</>}
          tools={<select aria-label="product" value={scatterProduct} onChange={(e) => setCell({ p: e.target.value as Product, c: sel?.c ?? cols[0] })} className="mini-select">
            {PRODUCTS.map((p) => <option key={p} value={p}>{dim.product(p)}</option>)}
          </select>}>
          <Scatter points={fs} ariaLabel="frequency severity" height={300}
            xLabel={L('เคลมต่อ 100 กรมธรรม์', 'Claims per 100 policies')} yLabel={L('เคลมเฉลี่ย (บาท)', 'Avg claim (THB)')}
            fx={(v) => fmtNum(v, lang, 0)} fy={(v) => (v >= 1000 ? `${fmtNum(v / 1000, lang, 0)}K` : fmtNum(v, lang, 0))} />
          <p className="hint">{L('มุมขวาบน = ทั้งเกิดบ่อยและเสียหายหนัก → ทบทวนเกณฑ์รับประกัน/เบี้ย', 'Top-right = frequent and severe → review underwriting rules or pricing')}</p>
        </Card>
        <Card title={L('การกระจายของมูลค่าเคลม', 'Claim amount distribution')} sub={`${dim.product(scatterProduct)} · n = ${fmtNum(hist.n, lang)} ${L('เคลม (ตัวอย่าง)', 'claims (sample)')}`}>
          <ColumnChart labels={hist.labels} ariaLabel="claim distribution" height={250}
            series={[{ key: 'n', label: L('จำนวนเคลม', 'Claims'), values: hist.counts, color: 'var(--s1)' }]}
            format={(v) => fmtNum(v, lang)} formatAxis={(v) => fmtNum(v, lang)} />
          <dl className="stat-row">
            <div><dt>{L('มัธยฐาน', 'Median')}</dt><dd className="num">{fmtBaht(hist.median, lang)}</dd></div>
            <div><dt>{L('ค่าเฉลี่ย', 'Mean')}</dt><dd className="num">{fmtBaht(hist.mean, lang)}</dd></div>
            <div><dt>P95</dt><dd className="num">{fmtBaht(hist.p95, lang)}</dd></div>
          </dl>
          <p className="hint">{L('ค่าเฉลี่ยสูงกว่ามัธยฐานมาก = มีเคลมก้อนใหญ่ไม่กี่รายดันต้นทุน (ควรดู Large Loss แยก)', 'Mean far above median = a few large losses drive cost (review large losses separately)')}</p>
        </Card>
      </div>

      <Card id="retention" title={L('วิเคราะห์ลูกค้าและการต่ออายุ', 'Customer & retention analysis')}
        sub={retCh === 'all' ? L('ทุกช่องทาง', 'All channels') : dim.channel(retCh)}>
        <div className="grid-3col">
          <div>
            <h4>{L('อัตราต่ออายุตามการเปลี่ยนแปลงเบี้ย', 'Renewal rate by premium change')}</h4>
            <ColumnChart labels={renewalByPriceChange(retCh).map((d) => d.bucket)} ariaLabel="renewal by price change" height={220}
              series={[{ key: 'r', label: L('อัตราต่ออายุ', 'Renewal rate'), values: renewalByPriceChange(retCh).map((d) => d.rate), color: 'var(--s1)' }]}
              format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
            <p className="hint">{L('ขึ้นเบี้ยเกิน 10% อัตราต่ออายุลดลงชัดเจน โดยเฉพาะช่องทางขายตรง', 'Above +10% premium change renewal drops sharply, especially in Direct')}</p>
          </div>
          <div>
            <h4>{L('อัตราต่ออายุตามอายุลูกค้า', 'Renewal rate by customer tenure')}</h4>
            <ColumnChart labels={[L('ปีที่ 1', 'Yr 1'), L('ปีที่ 2', 'Yr 2'), L('ปีที่ 3–4', 'Yr 3–4'), L('5 ปี+', '5 yrs+')]} ariaLabel="renewal by tenure" height={220}
              series={[{ key: 'r', label: L('อัตราต่ออายุ', 'Renewal rate'), values: renewalByTenure(retCh).map((d) => d.rate), color: 'var(--s1)' }]}
              format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
            <p className="hint">{L('ลูกค้าปีแรกหลุดมากที่สุด → เน้นดูแลก่อนครบปีแรก', 'First-year customers churn most → focus on the first renewal')}</p>
          </div>
          <div>
            <h4>{L('สาเหตุที่ไม่ต่ออายุ', 'Why customers do not renew')}</h4>
            <DivBars rows={reasons.map((x) => ({ key: x.r, label: lang === 'th' ? reasonName[x.r][0] : reasonName[x.r][1], value: x.v }))} format={(v) => fmtPct(v, lang, 0)} />
            <p className="hint">{L('จากแบบสอบถามลูกค้าที่ไม่ต่ออายุ (ข้อมูลจำลอง)', 'From lapsed-customer survey (simulated)')}</p>
          </div>
        </div>
      </Card>

      <Card id="profit" title={L('ความสามารถในการทำกำไรตามกลุ่ม', 'Profitability by segment')}
        sub={L('สายผลิตภัณฑ์ × ช่องทาง · UW Profit = NEP − ค่าสินไหม − ค่าใช้จ่าย', 'Product × channel · UW profit = NEP − claims − expenses')}
        tools={<ExportBtn onClick={() => downloadCsv('profitability.csv', ['product', 'channel', 'gwp_m', 'nep_m', 'claims_m', 'expenses_m', 'loss_ratio', 'expense_ratio', 'combined_ratio', 'uw_profit_m', 'uw_profit_plan_m'], prof.map((x) => [x.p, x.ch, x.a.gwp, x.a.nep, x.a.clm, x.a.exp, x.r.lr, x.r.er, x.r.cr, x.r.uwp, x.r.uwpPlan]))} />}>
        <div className="grid-2col wide-right">
          <div>
            <h4>{L('UW Profit: ขาดทุนมากสุด → กำไรมากสุด', 'UW profit: worst → best')}</h4>
            <DivBars rows={[...prof].sort((a, b) => a.r.uwp - b.r.uwp).slice(0, 10).map((x) => ({ key: x.k, label: `${dim.product(x.p)} · ${dim.channel(x.ch)}`, value: x.r.uwp }))} format={(v) => fmtM(v, lang)} />
          </div>
          <div className="table-wrap tall">
            <table className="data">
              <thead><tr><th>{L('สายผลิตภัณฑ์', 'Product')}</th><th>{L('ช่องทาง', 'Channel')}</th>{profTh('gwp', 'GWP')}{profTh('lr', 'LR')}<th className="r">ER</th>{profTh('cr', 'CR')}{profTh('uwp', 'UW Profit')}</tr></thead>
              <tbody>
                {prof.map((x) => (
                  <tr key={x.k}>
                    <td>{dim.product(x.p)}</td>
                    <td>{dim.channel(x.ch)}</td>
                    <td className="r num">{fmtM(x.a.gwp, lang)}</td>
                    <td className="r"><RagPill r={ragLower(x.r.lr, x.r.lrPlan)}>{fmtPct(x.r.lr, lang, 0)}</RagPill></td>
                    <td className="r num">{fmtPct(x.r.er, lang, 0)}</td>
                    <td className={`r num${x.r.cr > 1 ? ' bad-text' : ''}`}>{fmtPct(x.r.cr, lang, 1)}</td>
                    <td className={`r num${x.r.uwp < 0 ? ' bad-text' : ''}`}>{fmtM(x.r.uwp, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card id="raw" title={L('ข้อมูลดิบ (ตามตัวกรองปัจจุบัน)', 'Raw data (current filters)')}
        sub={L(`${fmtNum(raw.length, lang)} แถว · ระดับ เดือน × สายผลิตภัณฑ์ × หน่วยขาย`, `${fmtNum(raw.length, lang)} rows · month × product × unit`)}
        tools={<ExportBtn onClick={() => downloadCsv('raw-data.csv', ['month', 'product', 'channel', 'region', 'unit', 'gwp_m', 'target_m', 'new_business_m', 'renewal_m', 'nep_m', 'claims_m', 'expenses_m', 'claim_count', 'policies_new', 'policies_renewed', 'renewals_due', 'leads'],
          raw.map((f) => [monthLabel(f.m, 'en'), f.p, f.ch, f.rg, UNITS[f.u].en, f.gwp, f.tgt, f.nb, f.rn, f.nep, f.clm, f.exp, f.clmCnt, f.polNb, f.polRn, f.due, f.leads]))} />}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>{L('เดือน', 'Month')}</th><th>{L('สายผลิตภัณฑ์', 'Product')}</th><th>{L('หน่วยขาย', 'Unit')}</th><th className="r">GWP</th><th className="r">{L('เป้า', 'Target')}</th><th className="r">NEP</th><th className="r">{L('ค่าสินไหม', 'Claims')}</th><th className="r">LR</th><th className="r">{L('จำนวนเคลม', 'Claims #')}</th></tr></thead>
            <tbody>
              {raw.slice(rawPage * PAGE, rawPage * PAGE + PAGE).map((f) => (
                <tr key={`${f.m}-${f.p}-${f.u}`}>
                  <td>{monthLabel(f.m, lang)}</td>
                  <td>{dim.product(f.p)}</td>
                  <td>{lang === 'th' ? UNITS[f.u].th : UNITS[f.u].en}</td>
                  <td className="r num">{fmtM(f.gwp, lang, 2)}</td>
                  <td className="r num">{fmtM(f.tgt, lang, 2)}</td>
                  <td className="r num">{fmtM(f.nep, lang, 2)}</td>
                  <td className="r num">{fmtM(f.clm, lang, 2)}</td>
                  <td className="r num">{fmtPct(f.nep ? f.clm / f.nep : 0, lang, 0)}</td>
                  <td className="r num">{fmtNum(f.clmCnt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button type="button" className="btn small" disabled={rawPage === 0} onClick={() => setRawPage(rawPage - 1)}>‹</button>
          <span className="hint num">{rawPage + 1} / {Math.max(1, Math.ceil(raw.length / PAGE))}</span>
          <button type="button" className="btn small" disabled={(rawPage + 1) * PAGE >= raw.length} onClick={() => setRawPage(rawPage + 1)}>›</button>
        </div>
      </Card>
    </div>
  );
}

