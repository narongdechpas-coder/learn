import { useMemo } from 'react';
import {
  CHANNELS, CY, EQUITY, FACTS, INVESTED, INV_YIELD, PRODUCTS, TAX, agg, groupAgg, marketGwp, monthOfYear, periodMonths, rag, ragLower, ratios, select,
  type Agg, type Filters, type Product, type Rag,
} from '../data';
import { Bullets, LineChart, RagPill, Legend, downloadCsv } from '../charts';
import { fmtM, fmtMAxis, fmtNum, fmtPct, fmtPp, monthLabel, monthShort, useL } from '../lang';
import { Card, Delta, ExportBtn, LensHeader, useBi, useDimLabels, type View } from '../shared';

const ROE_TARGET = 0.12;

/** ROE (annualised) for a slice: investment income and equity are allocated by NEP share. */
function roe(a: Agg, uwp: number, months: number[]) {
  const all = agg(select(months, { product: 'all', channel: 'all', region: 'all' }));
  const share = all.nep ? a.nep / all.nep : 0;
  if (!share) return 0;
  const inv = INVESTED * INV_YIELD * (months.length / 12) * share;
  const ni = (uwp + inv) * (1 - TAX);
  return (ni * (12 / months.length)) / (EQUITY * share);
}

export function useStrategic(flt: Filters) {
  return useMemo(() => {
    const months = periodMonths(flt.asOf, flt.mode);
    const pyMonths = months.map((m) => m - 12);
    const cur = agg(select(months, flt));
    const prev = agg(select(pyMonths, flt));
    const rc = ratios(cur);
    const rp = ratios(prev);
    // market share is company-level by product (market data has no channel/region split)
    const prodSel: readonly Product[] = flt.product === 'all' ? PRODUCTS : [flt.product];
    const ours = agg(select(months, { product: flt.product, channel: 'all', region: 'all' })).gwp;
    const oursPy = agg(select(pyMonths, { product: flt.product, channel: 'all', region: 'all' })).gwp;
    const mkt = prodSel.reduce((s, p) => s + months.reduce((a, m) => a + marketGwp(p, m), 0), 0);
    const mktPy = prodSel.reduce((s, p) => s + pyMonths.reduce((a, m) => a + marketGwp(p, m), 0), 0);
    return {
      months, cur, prev, rc, rp,
      roe: roe(cur, rc.uwp, months),
      roePrev: roe(prev, rp.uwp, pyMonths),
      roePlan: (() => {
        const planAgg = { ...cur, nep: cur.nepPlan };
        return roe(planAgg, rc.uwpPlan, months);
      })(),
      share: ours / mkt, sharePy: oursPy / mktPy, growth: ours / oursPy - 1, mktGrowth: mkt / mktPy - 1,
    };
  }, [flt]);
}

export function Strategic() {
  const { flt, go } = useBi();
  const { L, lang } = useL();
  const dim = useDimLabels();
  const s = useStrategic(flt);
  const { cur, prev, rc, rp } = s;
  const yoy = (a: number, b: number) => (b ? a / b - 1 : 0);
  const periodText = `${flt.mode} ${monthLabel(flt.asOf, lang)}`;

  const kpis: { key: string; label: string; value: string; rag?: Rag; target?: string; foot: React.ReactNode; to: [View, Partial<Filters>?, string?] }[] = [
    {
      key: 'gwp', label: L('เบี้ยประกันภัยรับรวม (GWP)', 'Gross Written Premium'), value: fmtM(cur.gwp, lang), rag: rag(rc.ach),
      target: `${L('เป้า', 'Target')} ${fmtM(cur.tgt, lang)} · ${fmtPct(rc.ach, lang)}`,
      foot: <Delta v={yoy(cur.gwp, prev.gwp)} text={`${fmtPct(yoy(cur.gwp, prev.gwp), lang)} YoY`} />, to: ['tactical'],
    },
    {
      key: 'nep', label: L('เบี้ยประกันภัยที่ถือเป็นรายได้สุทธิ (NEP)', 'Net Earned Premium'), value: fmtM(cur.nep, lang), rag: rag(cur.nep / cur.nepPlan),
      target: `${L('แผน', 'Plan')} ${fmtM(cur.nepPlan, lang)}`,
      foot: <Delta v={yoy(cur.nep, prev.nep)} text={`${fmtPct(yoy(cur.nep, prev.nep), lang)} YoY`} />, to: ['analytical', undefined, 'profit'],
    },
    {
      key: 'lr', label: L('อัตราความเสียหาย (Loss Ratio)', 'Loss Ratio'), value: fmtPct(rc.lr, lang), rag: ragLower(rc.lr, rc.lrPlan),
      target: `${L('แผน', 'Plan')} ${fmtPct(rc.lrPlan, lang)}`,
      foot: <Delta v={rc.lr - rp.lr} goodWhenUp={false} text={`${fmtPp(rc.lr - rp.lr, lang)} YoY`} />, to: ['analytical', undefined, 'heat'],
    },
    {
      key: 'er', label: L('อัตราค่าใช้จ่าย (Expense Ratio)', 'Expense Ratio'), value: fmtPct(rc.er, lang), rag: ragLower(rc.er, rc.erPlan),
      target: `${L('แผน', 'Plan')} ${fmtPct(rc.erPlan, lang)}`,
      foot: <Delta v={rc.er - rp.er} goodWhenUp={false} text={`${fmtPp(rc.er - rp.er, lang)} YoY`} />, to: ['analytical', undefined, 'profit'],
    },
    {
      key: 'cr', label: L('อัตราส่วนรวม (Combined Ratio)', 'Combined Ratio'), value: fmtPct(rc.cr, lang), rag: ragLower(rc.cr, rc.crPlan),
      target: `${L('แผน', 'Plan')} ${fmtPct(rc.crPlan, lang)}`,
      foot: <Delta v={rc.cr - rp.cr} goodWhenUp={false} text={`${fmtPp(rc.cr - rp.cr, lang)} YoY`} />, to: ['analytical', undefined, 'profit'],
    },
    {
      key: 'uwp', label: L('กำไรจากการรับประกันภัย (UW Profit)', 'Underwriting Profit'), value: fmtM(rc.uwp, lang),
      rag: rc.uwpPlan > 0 ? rag(rc.uwp / rc.uwpPlan) : rc.uwp >= rc.uwpPlan ? 'good' : 'bad',
      target: `${L('แผน', 'Plan')} ${fmtM(rc.uwpPlan, lang)}`,
      foot: <Delta v={rc.uwp - rp.uwp} text={`${fmtM(rc.uwp - rp.uwp, lang)} YoY`} />, to: ['analytical', undefined, 'profit'],
    },
    {
      key: 'roe', label: L('ผลตอบแทนผู้ถือหุ้น (ROE ต่อปี)', 'Return on Equity (annualised)'), value: fmtPct(s.roe, lang), rag: rag(s.roe / ROE_TARGET),
      target: `${L('เป้า', 'Target')} ${fmtPct(ROE_TARGET, lang, 0)}`,
      foot: <Delta v={s.roe - s.roePrev} text={`${fmtPp(s.roe - s.roePrev, lang)} YoY`} />, to: ['analytical', undefined, 'profit'],
    },
    {
      key: 'ms', label: L('ส่วนแบ่งตลาด (Market Share)', 'Market Share'), value: fmtPct(s.share, lang, 2),
      rag: s.growth >= s.mktGrowth ? 'good' : s.growth >= s.mktGrowth - 0.02 ? 'warn' : 'bad',
      target: `${L('โต', 'Growth')} ${fmtPct(s.growth, lang)} vs ${L('ตลาด', 'market')} ${fmtPct(s.mktGrowth, lang)}`,
      foot: <Delta v={s.share - s.sharePy} text={`${s.share >= s.sharePy ? '+' : ''}${fmtNum((s.share - s.sharePy) * 100, lang, 2)} pp YoY`} />, to: ['strategic', undefined, 'market'],
    },
  ];

  // cumulative GWP for the current year vs target vs last year
  const trend = useMemo(() => {
    const cyStart = (CY - 2025) * 12;
    const months = Array.from({ length: 12 }, (_, i) => cyStart + i);
    const g = groupAgg(FACTS.filter((f) => (f.m >= cyStart - 12) && (flt.product === 'all' || f.p === flt.product) && (flt.channel === 'all' || f.ch === flt.channel) && (flt.region === 'all' || f.rg === flt.region)), (f) => f.m);
    let a = 0, t = 0, p = 0;
    const act: (number | null)[] = [], tgt: (number | null)[] = [], py: number[] = [];
    for (const m of months) {
      const x = g.get(m);
      const xp = g.get(m - 12);
      t += x?.tgt ?? 0;
      p += xp?.gwp ?? 0;
      tgt.push(x ? t : null);
      py.push(p);
      if (m <= flt.asOf) { a += x?.gwp ?? 0; act.push(a); } else act.push(null);
    }
    // ratios trend: all available months up to as-of
    const rmonths = Array.from({ length: flt.asOf + 1 }, (_, i) => i);
    const lrS = rmonths.map((m) => { const x = g.get(m); return x ? ratios(x).lr : null; });
    const crS = rmonths.map((m) => { const x = g.get(m); return x ? ratios(x).cr : null; });
    return { months, act, tgt, py, rmonths, lrS, crS };
  }, [flt]);

  const byProduct = useMemo(() => groupAgg(select(s.months, { ...flt, product: 'all' }), (f) => f.p), [s.months, flt]);
  const byChannel = useMemo(() => groupAgg(select(s.months, { ...flt, channel: 'all' }), (f) => f.ch), [s.months, flt]);

  const market = useMemo(() => PRODUCTS.map((p) => {
    const py = s.months.map((m) => m - 12);
    const o = agg(select(s.months, { product: p, channel: 'all', region: 'all' })).gwp;
    const opy = agg(select(py, { product: p, channel: 'all', region: 'all' })).gwp;
    const mk = s.months.reduce((a, m) => a + marketGwp(p, m), 0);
    const mkpy = py.reduce((a, m) => a + marketGwp(p, m), 0);
    return { p, o, mk, share: o / mk, g: o / opy - 1, mg: mk / mkpy - 1 };
  }), [s.months]);

  return (
    <div className="lens-view">
      <LensHeader view="strategic" title="Strategic Dashboard · Business Performance"
        question={L('เรายังเดินตามเป้าหมายธุรกิจอยู่หรือไม่?', 'Are we still on track for our business goals?')}
        user={L('ผู้บริหารระดับสูง (C-Suite)', 'C-Suite executives')} freq={L('รายเดือน / รายไตรมาส', 'Monthly / quarterly')} detail={L('ภาพรวมสูงสุด (Aggregated)', 'Aggregated')} />

      <div className="kpi-grid">
        {kpis.map((k) => (
          <button key={k.key} type="button" className="kpi kpi-btn" onClick={() => go(...k.to)} title={L('คลิกเพื่อเจาะลึก', 'Click to drill down')}>
            <span className="kpi-top"><span className="kpi-label">{k.label}</span>{k.rag && <RagPill r={k.rag}>{k.rag === 'good' ? L('ตามเป้า', 'On track') : k.rag === 'warn' ? L('เฝ้าระวัง', 'Watch') : L('ต่ำกว่าเป้า', 'Off track')}</RagPill>}</span>
            <span className="kpi-value num">{k.value}</span>
            {k.target && <span className="kpi-target num">{k.target}</span>}
            <span className="kpi-foot">{k.foot}<span className="kpi-go" aria-hidden="true">↗</span></span>
          </button>
        ))}
      </div>
      <p className="hint foot-note">
        {periodText} · {L('ROE คำนวณจาก UW Profit + รายได้จากการลงทุน (สมมติ 3.2% ของเงินลงทุน ฿8,600 ล้าน) หักภาษี 20% ต่อส่วนของผู้ถือหุ้น ฿3,400 ล้าน ปันส่วนตาม NEP',
          'ROE = (UW profit + investment income at an assumed 3.2% on ฿8.6B invested) after 20% tax, over ฿3.4B equity, allocated by NEP share')}
        {(flt.channel !== 'all' || flt.region !== 'all') && ` · ${L('ส่วนแบ่งตลาดแสดงระดับบริษัท (ข้อมูลตลาดไม่แยกช่องทาง/ภูมิภาค)', 'Market share is company-level (market data has no channel/region split)')}`}
      </p>

      <div className="grid-2col">
        <Card title={L('GWP สะสมปีนี้ เทียบเป้าหมาย', 'Cumulative GWP vs target')} sub={L(`ปี ${CY + 543} · Actual vs Target vs ปีก่อน`, `${CY} · Actual vs target vs last year`)}>
          <Legend items={[{ label: L('ผลจริง', 'Actual'), color: 'var(--s1)' }, { label: L('เป้าหมาย', 'Target'), color: 'var(--ink-2)', dashed: true }, { label: L('ปีก่อน', 'Last year'), color: 'var(--s2)' }]} />
          <LineChart labels={trend.months.map((m) => monthShort(monthOfYear(m), lang))} ariaLabel="cumulative GWP"
            series={[
              { key: 'py', label: L('ปีก่อน', 'Last year'), values: trend.py, color: 'var(--s2)', thin: true },
              { key: 'tgt', label: L('เป้าหมาย', 'Target'), values: trend.tgt, color: 'var(--ink-2)', dashed: true },
              { key: 'act', label: L('ผลจริง', 'Actual'), values: trend.act, color: 'var(--s1)' },
            ]}
            format={(v) => fmtM(v, lang)} formatAxis={(v) => fmtMAxis(v, lang)} />
        </Card>
        <Card title={L('Loss Ratio และ Combined Ratio รายเดือน', 'Monthly loss & combined ratio')} sub={L('เส้น 100% = จุดคุ้มทุนการรับประกันภัย', '100% line = underwriting break-even')}>
          <Legend items={[{ label: 'Combined Ratio', color: 'var(--s1)' }, { label: 'Loss Ratio', color: 'var(--s3)' }]} />
          <LineChart labels={trend.rmonths.map((m) => monthLabel(m, lang))} ariaLabel="loss and combined ratio"
            series={[{ key: 'cr', label: 'Combined Ratio', values: trend.crS, color: 'var(--s1)' }, { key: 'lr', label: 'Loss Ratio', values: trend.lrS, color: 'var(--s3)' }]}
            refLine={{ value: 1, label: '100%' }} yFloor={0.3}
            format={(v) => fmtPct(v, lang)} formatAxis={(v) => fmtPct(v, lang, 0)} />
        </Card>
      </div>

      <div className="grid-2col">
        <Card title={L('GWP แยกสายผลิตภัณฑ์ เทียบเป้า', 'GWP by product line vs target')} sub={L('แท่ง = ผลจริง · ขีด = เป้า · คลิกเพื่อเจาะลึกในเลนส์วิเคราะห์', 'Bar = actual · tick = target · click to drill into Analysis')}>
          <Bullets emptyText="—" format={(v) => fmtM(v, lang, 0)}
            rows={PRODUCTS.filter((p) => byProduct.has(p)).map((p) => {
              const a = byProduct.get(p)!;
              const r = ratios(a);
              return { key: p, label: dim.product(p), sub: `LR ${fmtPct(r.lr, lang)} · CR ${fmtPct(r.cr, lang)}`, actual: a.gwp, target: a.tgt, rag: rag(r.ach), pct: fmtPct(r.ach, lang, 0) };
            })}
            onPick={(p) => go('analytical', { product: p as Product }, 'heat')} />
        </Card>
        <Card title={L('GWP แยกช่องทาง เทียบเป้า', 'GWP by channel vs target')} sub={L('คลิกเพื่อดูผลงานขายของช่องทางนั้น', 'Click to open that channel’s sales performance')}>
          <Bullets emptyText="—" format={(v) => fmtM(v, lang, 0)}
            rows={CHANNELS.filter((c) => byChannel.has(c)).map((c) => {
              const a = byChannel.get(c)!;
              const r = ratios(a);
              return { key: c, label: dim.channel(c), sub: `NB ${fmtPct(r.achNb, lang, 0)} · ${L('ต่ออายุ', 'Renewal')} ${fmtPct(r.rr, lang, 0)}`, actual: a.gwp, target: a.tgt, rag: rag(r.ach), pct: fmtPct(r.ach, lang, 0) };
            })}
            onPick={(c) => go('tactical', { channel: c as Filters['channel'] })} />
        </Card>
      </div>

      <Card id="market" title={L('ส่วนแบ่งตลาดและการเติบโตเทียบอุตสาหกรรม', 'Market share & growth vs industry')}
        sub={L(`${periodText} · ข้อมูลตลาดเป็นตัวเลขจำลอง`, `${periodText} · market figures are simulated`)}
        tools={<ExportBtn onClick={() => downloadCsv('market-share.csv', ['product', 'our_gwp_m', 'market_gwp_m', 'share', 'our_growth', 'market_growth'], market.map((r) => [r.p, r.o, r.mk, r.share, r.g, r.mg]))} />}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>{L('สายผลิตภัณฑ์', 'Product line')}</th><th className="r">{L('GWP บริษัท', 'Our GWP')}</th><th className="r">{L('GWP ตลาด', 'Market GWP')}</th><th className="r">{L('ส่วนแบ่ง', 'Share')}</th><th className="r">{L('เราโต', 'Our growth')}</th><th className="r">{L('ตลาดโต', 'Market growth')}</th><th>{L('สถานะ', 'Status')}</th></tr></thead>
            <tbody>
              {market.map((r) => {
                const gap = r.g - r.mg;
                const st: Rag = gap >= 0 ? 'good' : gap >= -0.02 ? 'warn' : 'bad';
                return (
                  <tr key={r.p} className={flt.product === r.p ? 'sel' : ''}>
                    <td>{dim.product(r.p)}</td>
                    <td className="r num">{fmtM(r.o, lang, 0)}</td>
                    <td className="r num">{fmtM(r.mk, lang, 0)}</td>
                    <td className="r num">{fmtPct(r.share, lang, 2)}</td>
                    <td className="r num">{fmtPct(r.g, lang)}</td>
                    <td className="r num">{fmtPct(r.mg, lang)}</td>
                    <td><RagPill r={st}>{gap >= 0 ? L('โตกว่าตลาด', 'Beating market') : L('โตช้ากว่าตลาด', 'Lagging market')} {fmtNum(gap * 100, lang, 1)} pp</RagPill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
