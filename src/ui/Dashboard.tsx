import { useMemo, useState } from 'react';
import type { Case, CoverageType, Source, Stage } from '../types';
import { BRANDS, STAFF, staffById, vehicleText } from '../data/vehicles';
import { COVERAGE_TYPES } from '../data/packages';
import { COVERAGE_LABEL, SLA_LABEL, STAGE_LABEL, fmtBaht, fmtCompactBaht, fmtDate, fmtDateTime, fmtMinutes, fmtNum, useT } from '../i18n';
import { useStore } from '../store';
import { SLA_KEYS, SLA_TARGETS, activeSla, percentile, slaFor, type SlaKey } from '../lib/sla';
import { DAY_MS, bkkParts, bkkTime, dayKey, monthKey, startOfBkkDay } from '../lib/time';
import { BarChart, HBars, type BarDatum } from './charts';
import { Segmented, SlaChip, useNow } from './common';
import { AgentSections } from './DashAgents';
import { ProductSection } from './DashProducts';
import { MARKETING } from '../data/agents';

type Range = '7' | '30' | '90' | 'month';
type Gran = 'day' | 'month';
type Metric = 'policies' | 'gwp';

const FUNNEL: Stage[] = ['submitted', 'accepted', 'quoted', 'confirmed', 'docsComplete', 'issued'];

export function Dashboard({ onOpenCase }: { onOpenCase: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(30000);
  const [range, setRange] = useState<Range>('30');
  const [gran, setGran] = useState<Gran>('day');
  const [type, setType] = useState<'all' | CoverageType>('all');
  const [brand, setBrand] = useState('all');
  const [staff, setStaff] = useState('all');
  const [metric, setMetric] = useState<Metric>('gwp');
  const [seg, setSeg] = useState<'all' | Source>('all');
  const [table, setTable] = useState(false);
  const [channel, setChannel] = useState<'all' | 'direct' | 'agent'>('all');
  const [mkt, setMkt] = useState('all');
  const mktAgents = s.agents.filter((a) => mkt === 'all' || a.mktId === mkt);
  const inChannel = (agentId?: string) =>
    mkt !== 'all' ? !!agentId && mktAgents.some((a) => a.id === agentId) : channel === 'all' || (channel === 'agent' ? !!agentId : !agentId);

  const [from, to] = useMemo(() => {
    const today = startOfBkkDay(now);
    if (range === 'month') {
      const p = bkkParts(now);
      return [bkkTime(p.y, p.mo, 1), now];
    }
    return [today - (Number(range) - 1) * DAY_MS, now];
  }, [range, now]);
  const prevFrom = from - (to - from);

  const base = useMemo(
    () =>
      s.cases.filter(
        (c) => (type === 'all' || c.coverage === type) && (brand === 'all' || c.vehicle.brandId === brand) && (staff === 'all' || c.assignee === staff) && inChannel(c.agentId),
      ),
    [s.cases, type, brand, staff, channel, mkt, s.agents],
  );
  const inRange = (x: number | undefined, a = from, b = to) => x !== undefined && x >= a && x <= b;

  const issued = base.filter((c) => inRange(c.stamps.issued));
  const issuedPrev = base.filter((c) => inRange(c.stamps.issued, prevFrom, from - 1));
  const cohort = base.filter((c) => inRange(c.createdAt));
  const cohortPrev = base.filter((c) => inRange(c.createdAt, prevFrom, from - 1));
  const gwp = sum(issued.map((c) => c.premium ?? 0));
  const gwpPrev = sum(issuedPrev.map((c) => c.premium ?? 0));
  const conv = cohort.length ? cohort.filter((c) => c.stamps.issued).length / cohort.length : 0;
  const convPrev = cohortPrev.length ? cohortPrev.filter((c) => c.stamps.issued).length / cohortPrev.length : 0;

  const slaStats = useMemo(() => computeSla(base, from, to, now), [base, from, to, now]);
  const slaAll = SLA_KEYS.reduce((a, k) => ({ met: a.met + slaStats[k].met, n: a.n + slaStats[k].n }), { met: 0, n: 0 });
  const slaPrev = useMemo(() => computeSla(base, prevFrom, from - 1, now), [base, prevFrom, from, now]);
  const slaPrevAll = SLA_KEYS.reduce((a, k) => ({ met: a.met + slaPrev[k].met, n: a.n + slaPrev[k].n }), { met: 0, n: 0 });

  const value = (cs: Case[]) => (metric === 'gwp' ? sum(cs.map((c) => c.premium ?? 0)) : cs.length);
  const fmtVal = (v: number) => (metric === 'gwp' ? fmtBaht(Math.round(v), lang) : fmtNum(v, lang));
  const fmtAxis = (v: number) => (metric === 'gwp' ? fmtCompactBaht(v, lang) : fmtNum(v, lang));

  const trend: BarDatum[] = useMemo(() => {
    const buckets: { key: string; at: number }[] = [];
    if (gran === 'day') {
      for (let d = startOfBkkDay(from); d <= to; d += DAY_MS) buckets.push({ key: dayKey(d), at: d });
    } else {
      const p = bkkParts(from);
      for (let y = p.y, mo = p.mo; bkkTime(y, mo, 1) <= to; mo === 11 ? (y++, (mo = 0)) : mo++) buckets.push({ key: `${y}-${String(mo + 1).padStart(2, '0')}`, at: bkkTime(y, mo, 1) });
    }
    const keyOf = gran === 'day' ? dayKey : monthKey;
    const groups = new Map<string, Case[]>();
    for (const c of issued) {
      const k = keyOf(c.stamps.issued!);
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    return buckets.map((b) => ({
      key: b.key,
      label: gran === 'day' ? fmtDate(b.at, lang, { day: 'numeric', month: 'short' }) : fmtDate(b.at, lang, { month: 'short' }),
      full: gran === 'day' ? fmtDate(b.at, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : fmtDate(b.at, lang, { month: 'long', year: 'numeric' }),
      value: value(groups.get(b.key) ?? []),
    }));
  }, [issued, gran, from, to, metric, lang]);

  const byType = COVERAGE_TYPES.map((k) => ({ key: k, label: COVERAGE_LABEL[lang][k], value: value(issued.filter((c) => c.coverage === k)) }));
  // Every breakdown shows six rows so the three columns end level: top five brands + the rest.
  const brandRows = BRANDS.map((b) => ({ key: b.id, label: b.name, value: value(issued.filter((c) => c.vehicle.brandId === b.id)) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const byBrand = brandRows.length > 6
    ? [...brandRows.slice(0, 5), { key: 'other', label: t('otherBrands', { n: brandRows.length - 5 }), value: brandRows.slice(5).reduce((a, r) => a + r.value, 0) }]
    : brandRows;
  const byStaff = [
    ...STAFF.map((x) => ({ key: x.id, label: x[lang], value: value(issued.filter((c) => c.assignee === x.id)) })),
    { key: 'self', label: t('srcSelf'), value: value(issued.filter((c) => c.source === 'self')) },
  ].sort((a, b) => b.value - a.value);

  const funnelCases = cohort.filter((c) => seg === 'all' || c.source === seg);
  const leadsIn = s.leads.filter((l) => l.at >= from && l.at <= to && (brand === 'all' || l.vehicle.brandId === brand));
  const leadConv = leadsIn.length ? leadsIn.filter((l) => l.caseId).length / leadsIn.length : 0;
  const leadOpen = leadsIn.filter((l) => !l.caseId && !l.contacted).length;
  const caseSteps = FUNNEL.map((st) => ({ key: st as string, label: STAGE_LABEL[lang][st], n: funnelCases.filter((c) => c.stamps[st] !== undefined).length }));
  // Visitor steps exist only as totals, so they show when no case filter is applied.
  const unfiltered = seg === 'all' && type === 'all' && brand === 'all' && staff === 'all' && channel === 'all' && mkt === 'all';
  const traffic = Object.entries(s.traffic)
    .filter(([d]) => d >= dayKey(from) && d <= dayKey(to))
    .reduce((a, [, v]) => ({ visit: a.visit + v.visit, car: a.car + v.car, pkg: a.pkg + v.pkg, choose: a.choose + v.choose }), { visit: 0, car: 0, pkg: 0, choose: 0 });
  const funnel = unfiltered
    ? [
        { key: 'visit', label: t('stVisit'), n: traffic.visit },
        { key: 'car', label: t('stCar'), n: traffic.car },
        { key: 'pkg', label: t('stPkg'), n: traffic.pkg },
        { key: 'choose', label: t('stChoose'), n: traffic.choose },
        ...caseSteps,
      ]
    : caseSteps;

  const overdue = base
    .map((c) => ({ c, r: activeSla(c, now) }))
    .filter((x) => x.r && x.r.state === 'overdue')
    .sort((a, b) => b.r!.used - b.r!.target - (a.r!.used - a.r!.target))
    .slice(0, 8);

  return (
    <div className="dashboard">
      <div className="dash-head">
        <div>
          <h2>{t('dashTitle')}</h2>
          <p className="lead">ABC · {t('dashLead', { time: fmtDateTime(now, lang) })}</p>
        </div>
      </div>

      <div className="filters dash-filters">
        <Segmented id="d-range" label={t('range')} value={range} onChange={(v) => { setRange(v); if (v === '7') setGran('day'); }} options={[
          { value: '7', label: t('r7') },
          { value: '30', label: t('r30') },
          { value: '90', label: t('r90') },
          { value: 'month', label: t('rMonth') },
        ]} />
        <select id="d-type" aria-label={t('filterType')} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">{t('filterType')}: {t('filterAll')}</option>
          {COVERAGE_TYPES.map((k) => (
            <option key={k} value={k}>{COVERAGE_LABEL[lang][k]}</option>
          ))}
        </select>
        <select id="d-brand" aria-label={t('brand')} value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">{t('brand')}: {t('filterAll')}</option>
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select id="d-channel" aria-label={t('filterChannel')} value={mkt !== 'all' ? 'agent' : channel} onChange={(e) => { setChannel(e.target.value as typeof channel); if (e.target.value !== 'agent') setMkt('all'); }}>
          <option value="all">{t('filterChannel')}: {t('filterAll')}</option>
          <option value="direct">{t('chDirect')}</option>
          <option value="agent">{t('chAgent')}</option>
        </select>
        <select id="d-mkt" aria-label="Marketing" value={mkt} onChange={(e) => setMkt(e.target.value)}>
          <option value="all">Marketing: {t('filterAll')}</option>
          {MARKETING.map((m) => (
            <option key={m.id} value={m.id}>{m[lang]}</option>
          ))}
        </select>
        <select id="d-staff" aria-label={t('colStaff')} value={staff} onChange={(e) => setStaff(e.target.value)}>
          <option value="all">{t('colStaff')}: {t('filterAll')}</option>
          {STAFF.map((x) => (
            <option key={x.id} value={x.id}>{x[lang]}</option>
          ))}
        </select>
      </div>

      <div className="kpis">
        <Kpi label={t('kPolicies')} value={fmtNum(issued.length, lang)} delta={pct(issued.length, issuedPrev.length)} />
        <Kpi label={t('kGwp')} value={fmtBaht(Math.round(gwp), lang)} delta={pct(gwp, gwpPrev)} />
        <Kpi label={t('kConv')} value={`${fmtNum(conv * 100, lang, 1)}%`} delta={cohortPrev.length ? (conv - convPrev) * 100 : null} deltaUnit="pt" note={t('kConvNote')} />
        <Kpi label={t('kSla')} value={slaAll.n ? `${fmtNum((slaAll.met / slaAll.n) * 100, lang, 1)}%` : '—'} delta={slaAll.n && slaPrevAll.n ? ((slaAll.met / slaAll.n) - (slaPrevAll.met / slaPrevAll.n)) * 100 : null} deltaUnit="pt" note={t('kSlaNote')} />
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('production')}</h3>
            <p className="hint">{metric === 'gwp' ? t('mGwp') : t('mPolicies')} · {gran === 'day' ? t('daily') : t('monthly')}</p>
          </div>
          <div className="card-tools">
            <Segmented id="d-metric" label={t('metric')} value={metric} onChange={setMetric} options={[
              { value: 'gwp', label: t('mGwp') },
              { value: 'policies', label: t('mPolicies') },
            ]} />
            <Segmented id="d-gran" label={t('granularity')} value={gran} onChange={setGran} options={[
              { value: 'day', label: t('daily') },
              { value: 'month', label: t('monthly') },
            ]} />
            <button type="button" className="btn small ghost" onClick={() => setTable((v) => !v)}>{table ? t('asChart') : t('asTable')}</button>
          </div>
        </div>
        {table ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>{t('period')}</th><th className="r">{metric === 'gwp' ? t('mGwp') : t('mPolicies')}</th></tr>
              </thead>
              <tbody>
                {trend.map((d) => (
                  <tr key={d.key}><td>{d.full}</td><td className="r num">{fmtVal(d.value)}</td></tr>
                ))}
                <tr className="total"><td>{t('total')}</td><td className="r num">{fmtVal(sum(trend.map((d) => d.value)))}</td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <BarChart data={trend} format={fmtVal} formatAxis={fmtAxis} ariaLabel={`${t('production')} ${metric}`} />
        )}
        <div className="breakdowns">
          <div>
            <h4>{t('byType')}</h4>
            <HBars rows={byType} format={fmtVal} empty={t('noData')} />
          </div>
          <div>
            <h4>{t('byBrand')}</h4>
            <HBars rows={byBrand} format={fmtVal} empty={t('noData')} />
          </div>
          <div>
            <h4>{t('byStaff')}</h4>
            <HBars rows={byStaff} format={fmtVal} empty={t('noData')} />
          </div>
        </div>
      </section>

      <ProductSection cases={base} proposals={s.proposals.filter((p) => inChannel(p.agentId))} from={from} to={to} />

      <AgentSections
        cases={base}
        agents={mktAgents}
        renewals={s.renewals.filter((r) => inChannel(r.agentId))}
        from={from}
        to={to}
        now={now}
        showAgents={channel !== 'direct' || mkt !== 'all'}
      />

      <div className="dash-2col">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t('funnel')}</h3>
              <p className="hint">{t('funnelLead')}</p>
            </div>
            <Segmented id="d-seg" label={t('colSource')} value={seg} onChange={setSeg} options={[
              { value: 'all', label: t('segAll') },
              { value: 'package', label: t('srcPackage') },
              { value: 'self', label: t('srcSelf') },
              { value: 'quote', label: t('srcQuote') },
            ]} />
          </div>
          <div className="lead-stat">
            <div>
              <div className="eyebrow">{t('kLeads')}</div>
              <div className="lead-stat-n num">{fmtNum(leadsIn.length, lang)}</div>
            </div>
            <p className="hint">{t('kLeadsNote', { pct: fmtNum(leadConv * 100, lang, 0), open: fmtNum(leadOpen, lang) })}</p>
          </div>
          {funnel[0].n === 0 ? (
            <p className="muted">{t('noData')}</p>
          ) : (
            <ol className="funnel">
              <li className="fn-head" aria-hidden="true">
                <span />
                <span />
                <span className="fn-num">{t('fnShare')}</span>
                <span className="fn-step">{t('fnStep')}</span>
              </li>
              {funnel.map((f, i) => {
                const prev = i ? funnel[i - 1].n : f.n;
                return (
                  <li key={f.key} className={i < funnel.length - caseSteps.length ? 'pre' : ''} title={i > 0 ? `${prev ? fmtNum((f.n / prev) * 100, lang, 0) : 0}% ${t('stepConv')}` : undefined}>
                    <span className="fn-name">{f.label}</span>
                    <span className="fn-track">
                      <span className="fn-fill" style={{ width: `${(f.n / funnel[0].n) * 100}%` }} />
                    </span>
                    <span className="fn-num num"><b>{fmtNum(f.n, lang)}</b> <span className="muted">{fmtNum((f.n / funnel[0].n) * 100, lang, 0)}%</span></span>
                    <span className={`fn-step num${i > 0 && prev && f.n / prev < 0.7 ? ' low' : ''}`}>{i > 0 ? `${prev ? fmtNum((f.n / prev) * 100, lang, 0) : 0}%` : '—'}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {unfiltered && <p className="hint">{t('funnelTrafficNote')}</p>}
          {seg !== 'quote' && <p className="hint">{t('funnelNote')}</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t('sla')}</h3>
              <p className="hint">{t('slaLead')}</p>
            </div>
          </div>
          <div className="sla-tiles">
            {SLA_KEYS.map((k) => {
              const st = slaStats[k];
              const p = st.n ? st.met / st.n : 0;
              const tone = !st.n ? 'neutral' : p >= 0.9 ? 'good' : p >= 0.75 ? 'warn' : 'bad';
              return (
                <div key={k} className={`sla-tile tone-${tone}`}>
                  <div className="eyebrow">{SLA_LABEL[lang][k]} · {t('slaTarget', { t: k === 'issue' ? t('oneBizDay') : fmtMinutes(SLA_TARGETS[k], lang) })}</div>
                  <div className="sla-big num">
                    {st.n ? `${fmtNum(p * 100, lang, 1)}%` : '—'}
                    <span className="sla-mark" aria-hidden="true">{tone === 'good' ? '✓' : tone === 'neutral' ? '' : '!'}</span>
                  </div>
                  <div className="meter" aria-hidden="true"><span style={{ width: `${p * 100}%` }} /><i style={{ left: '90%' }} /></div>
                  <dl className="sla-kv">
                    <div><dt>{t('avg')}</dt><dd className="num">{st.done ? fmtMinutes(st.avg, lang) : '—'}</dd></div>
                    <div><dt>{t('p90')}</dt><dd className="num">{st.done ? fmtMinutes(st.p90, lang) : '—'}</dd></div>
                    <div><dt>{t('colCases')}</dt><dd className="num">{fmtNum(st.n, lang)}</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>

          <h4>{t('slaByStaff')}</h4>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('colStaff')}</th>
                  {SLA_KEYS.map((k) => (
                    <th key={k} className="r">{SLA_LABEL[lang][k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAFF.map((x) => {
                  const stats = computeSla(base.filter((c) => c.assignee === x.id), from, to, now);
                  return (
                    <tr key={x.id}>
                      <td>{x[lang]}</td>
                      {SLA_KEYS.map((k) => {
                        const st = stats[k];
                        const p = st.n ? st.met / st.n : null;
                        return (
                          <td key={k} className={`r num${p !== null && p < 0.75 ? ' bad-text' : ''}`}>
                            {p === null ? '—' : `${fmtNum(p * 100, lang, 0)}%`} <span className="muted">({st.n})</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h4>{t('breachedOpen')}</h4>
          {overdue.length === 0 ? (
            <p className="muted">{t('noBreached')}</p>
          ) : (
            <ul className="overdue">
              {overdue.map(({ c, r }) => (
                <li key={c.id}>
                  <button type="button" className="overdue-row" onClick={() => onOpenCase(c.id)}>
                    <span className="num ref">{c.id}</span>
                    <span className="muted">{vehicleText(c.vehicle)}</span>
                    <span className="muted">{staffById(c.assignee)?.[lang] ?? '—'}</span>
                    <SlaChip r={r!} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

export function Kpi({ label, value, delta, deltaUnit = '%', note }: { label: string; value: string; delta: number | null; deltaUnit?: '%' | 'pt'; note?: string }) {
  const { t, lang } = useT();
  const dir = delta === null ? '' : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
  return (
    <div className="kpi">
      <div className="eyebrow">{label}</div>
      <div className="kpi-value num">{value}</div>
      <div className="kpi-foot">
        {delta !== null ? (
          <span className={`delta ${dir}`}>
            <span aria-hidden="true">{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■'}</span> {fmtNum(Math.abs(delta), lang, 1)}{deltaUnit === 'pt' ? (lang === 'th' ? ' จุด' : ' pt') : '%'}
          </span>
        ) : (
          <span className="delta flat">—</span>
        )}
        <span className="muted"> {t('vsPrev')}</span>
      </div>
      {note && <div className="hint">{note}</div>}
    </div>
  );
}

interface SlaStat {
  met: number;
  n: number;
  done: number;
  avg: number;
  p90: number;
}

/** SLA outcomes for clocks that started in [from, to]. Open cases already past target count as breaches. */
function computeSla(cases: Case[], from: number, to: number, now: number): Record<SlaKey, SlaStat> {
  const out = {} as Record<SlaKey, SlaStat>;
  for (const k of SLA_KEYS) {
    let met = 0;
    let n = 0;
    const used: number[] = [];
    for (const c of cases) {
      const startAt = k === 'issue' ? c.stamps.docsComplete : c.stamps.submitted;
      if (startAt === undefined || startAt < from || startAt > to) continue;
      const r = slaFor(c, k, now);
      if (!r) continue;
      if (r.done) {
        n++;
        used.push(r.used);
        if (r.state === 'met') met++;
      } else if (r.state === 'overdue') n++;
    }
    out[k] = { met, n, done: used.length, avg: used.length ? sum(used) / used.length : 0, p90: percentile(used, 90) };
  }
  return out;
}

