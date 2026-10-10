import { useMemo, useState } from 'react';
import type { Agent } from '../types';
import { MARKETING } from '../data/agents';
import { fmtBaht, fmtCompactBaht, fmtDate, fmtNum, useT, type TKey } from '../i18n';
import { updateAgent, useStore } from '../store';
import { rolling12 } from '../lib/history';
import { ach, addRow as add, lossRatio, perfCells, renewRate, zeroRow as zero, type PerfRow as Row } from '../lib/perf';
import { bkkTime, monthKey } from '../lib/time';
import { ClusteredBarChart } from './charts';
import { Segmented, useNow } from './common';
import { NextVisit, VisitList, visitInfo } from './Visits';

/** Marketing officers keep a fixed colour everywhere on this page (validated categorical slots 1-3). */
export const MKT_COLOR: Record<string, string> = { m1: 'var(--mk-1)', m2: 'var(--mk-2)', m3: 'var(--mk-3)' };

type Period = 'month' | 'r12';

/** Loss ratio bands (sample): up to 55% healthy, up to 70% watch, above that a problem. */
const lrTone = (lr: number) => (lr <= 0.55 ? 'good' : lr <= 0.7 ? 'warn' : 'bad');
const LR_ICON = { good: '✓', warn: '!', bad: '▲' } as const;
const LR_KEY: Record<'good' | 'warn' | 'bad', TKey> = { good: 'lrGood', warn: 'lrWatch', bad: 'lrHigh' };

export function VPApp() {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(60000);
  const [period, setPeriod] = useState<Period>('r12');
  const [metric, setMetric] = useState<'gwp' | 'ach'>('ach');
  const [groupBy, setGroupBy] = useState<'agent' | 'mkt'>('agent');
  const [mktFilter, setMktFilter] = useState('all');
  const [table, setTable] = useState(false);

  const months = useMemo(() => rolling12(now), [now]);
  const thisMonth = monthKey(now);

  /** One partner's numbers for one month: production from the cases once they exist, else the history. */
  const cell = useMemo(() => perfCells(s, now), [s.cases, s.monthly, s.agents, s.seededAt, now]);

  const inPeriod = period === 'month' ? [thisMonth] : months.map((m) => m.key);
  const agentRow = (a: Agent) => inPeriod.reduce((acc, m) => add(acc, cell(a.id, m)), zero());
  const agents = s.agents.filter((a) => mktFilter === 'all' || a.mktId === mktFilter);
  const agentRows = agents.map((a) => ({ a, r: agentRow(a) })).sort((x, y) => ach(y.r) - ach(x.r));
  const mktRows = MARKETING.map((m) => {
    const mine = s.agents.filter((a) => a.mktId === m.id);
    return { m, n: mine.length, r: mine.reduce((acc, a) => add(acc, agentRow(a)), zero()) };
  }).sort((x, y) => ach(y.r) - ach(x.r));
  const total = mktRows.reduce((acc, x) => add(acc, x.r), zero());

  // Rolling 12 months, one bar per partner (or per marketing officer). Partners keep their officer's
  // colour; the second partner of each officer is hatched so the two never rely on colour alone.
  const val = (r: Row) => (metric === 'gwp' ? r.gwp : r.target ? (r.gwp / r.target) * 100 : null);
  const partners = MARKETING.flatMap((m) => s.agents.filter((a) => a.mktId === m.id).map((a, i) => ({ a, m, hatched: i % 2 === 1 })));
  const trend =
    groupBy === 'agent'
      ? partners.map(({ a, m, hatched }) => ({
          key: a.id,
          label: a[lang],
          color: MKT_COLOR[m.id],
          hatched,
          values: months.map((mo) => val(cell(a.id, mo.key))),
        }))
      : MARKETING.map((m) => {
          const mine = s.agents.filter((a) => a.mktId === m.id);
          return {
            key: m.id,
            label: m[lang],
            color: MKT_COLOR[m.id],
            hatched: false,
            values: months.map((mo) => val(mine.reduce((acc, a) => add(acc, cell(a.id, mo.key)), zero()))),
          };
        });
  const monthLabel = (at: number) => fmtDate(at, lang, { month: 'short' });
  const monthFull = (at: number) => fmtDate(at, lang, { month: 'long', year: 'numeric' });
  const fmtV = (v: number) => (metric === 'gwp' ? fmtBaht(Math.round(v), lang) : `${fmtNum(v, lang, 0)}%`);
  const periodLabel = period === 'month' ? `${fmtDate(bkkTime(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5)) - 1, 1), lang, { month: 'long', year: 'numeric' })} · ${t('vpMtdNote')}` : t('vpR12Range', { from: monthLabel(months[0].at), to: monthLabel(months[11].at) });

  return (
    <div className="vp-app dashboard">
      <div className="dash-head">
        <div>
          <div className="eyebrow">{t('vpRole')}</div>
          <h2>{t('vpTitle')}</h2>
          <p className="lead">{t('vpLead', { period: periodLabel })}</p>
        </div>
        <Segmented id="vp-period" label={t('range')} value={period} onChange={setPeriod} options={[
          { value: 'month', label: t('vpThisMonth') },
          { value: 'r12', label: t('vpR12') },
        ]} />
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="eyebrow">{t('vpGwpVsTarget')}</div>
          <div className="kpi-value num">{fmtNum(ach(total) * 100, lang, 0)}%</div>
          <div className="meter vp-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, ach(total) * 100)}%` }} /></div>
          <div className="kpi-foot muted num">{fmtCompactBaht(total.gwp, lang)} / {fmtCompactBaht(total.target, lang)}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('vpPolicies')}</div>
          <div className="kpi-value num">{fmtNum(total.policies, lang)}</div>
          <div className="kpi-foot muted">{t('vpPartners', { n: s.agents.length, m: MARKETING.length })}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('vpRenewal')}</div>
          <div className="kpi-value num">{fmtNum(renewRate(total) * 100, lang, 0)}%</div>
          <div className="kpi-foot muted num">{t('vpRenewalGwp')} {fmtCompactBaht(total.renewGwp, lang)}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('vpLoss')}</div>
          <div className="kpi-value num">{fmtNum(lossRatio(total) * 100, lang, 1)}%</div>
          <div className="kpi-foot"><LrChip lr={lossRatio(total)} /></div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('vpOrg')}</h3>
            <p className="hint">{t('vpOrgLead')}</p>
          </div>
        </div>
        <div className="vp-org">
          <div className="vp-org-top">
            <span className="vp-node vp-vp">{t('vpRoleShort')}</span>
          </div>
          <div className="vp-org-mkts">
            {mktRows.map((x, i) => (
              <div key={x.m.id} className="vp-mkt" style={{ ['--mk' as string]: MKT_COLOR[x.m.id] }}>
                <div className="vp-mkt-head">
                  <span className="vp-rank num">#{i + 1}</span>
                  <div>
                    <b>{x.m[lang]}</b>
                    <div className="hint">{t('vpMktAgents', { n: x.n })}</div>
                  </div>
                  <span className="vp-mkt-pct num">{fmtNum(ach(x.r) * 100, lang, 0)}%</span>
                </div>
                <div className="meter vp-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, ach(x.r) * 100)}%` }} /></div>
                <div className="hint num">{fmtBaht(Math.round(x.r.gwp), lang)} / {fmtBaht(x.r.target, lang)}</div>
                <ul className="vp-mkt-agents">
                  {s.agents.filter((a) => a.mktId === x.m.id).map((a) => {
                    const r = agentRow(a);
                    return (
                      <li key={a.id}>
                        <span className="vp-agent-name">{a[lang]}<span className="hint"> · {a.code}</span></span>
                        <span className="num">{fmtNum(ach(r) * 100, lang, 0)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{groupBy === 'agent' ? t('vpTrendAgent') : t('vpTrend')}</h3>
            <p className="hint">{t('vpTrendLead')}</p>
          </div>
          <div className="card-tools">
            <Segmented id="vp-group" label={t('vpGroup')} value={groupBy} onChange={setGroupBy} options={[
              { value: 'agent', label: 'Partner' },
              { value: 'mkt', label: 'Marketing' },
            ]} />
            <Segmented id="vp-metric" label={t('metric')} value={metric} onChange={setMetric} options={[
              { value: 'ach', label: t('vpAchShort') },
              { value: 'gwp', label: 'GWP' },
            ]} />
            <button type="button" className="btn small ghost" onClick={() => setTable((v) => !v)}>{table ? t('asChart') : t('asTable')}</button>
          </div>
        </div>
        <div className="legend cluster-legend" aria-hidden="true">
          {trend.map((x) => (
            <span key={x.key}>
              <i className={x.hatched ? 'hatched' : ''} style={x.hatched ? { color: x.color } : { background: x.color }} />
              {x.label}
            </span>
          ))}
        </div>
        {table ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('period')}</th>
                  {trend.map((x) => (
                    <th key={x.key} className="r">{x.label.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.key}>
                    <td>{monthFull(m.at)}</td>
                    {trend.map((x) => (
                      <td key={x.key} className="r num">{x.values[i] === null ? '—' : fmtV(x.values[i]!)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ClusteredBarChart
            series={trend}
            labels={months.map((m) => monthLabel(m.at))}
            full={months.map((m) => monthFull(m.at))}
            format={fmtV}
            formatAxis={(v) => (metric === 'gwp' ? fmtCompactBaht(v, lang) : `${fmtNum(v, lang)}%`)}
            ariaLabel={t('vpTrend')}
            refLine={metric === 'ach' ? { value: 100, label: t('vpTargetLine') } : undefined}
          />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('vpMktRank')}</h3>
            <p className="hint">{periodLabel}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data vp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Marketing</th>
                <th className="r">{t('vpTarget')}</th>
                <th className="r">{t('vpActual')}</th>
                <th className="vp-ach-col">{t('vpAch')}</th>
                <th className="r">{t('vpPolicies')}</th>
                <th className="r">{t('vpShare')}</th>
                <th className="r">{t('vpRenewal')}</th>
                <th className="r">{t('vpRenewalGwp')}</th>
                <th>{t('vpLoss')}</th>
              </tr>
            </thead>
            <tbody>
              {mktRows.map((x, i) => (
                <tr key={x.m.id}>
                  <td className="num">{i + 1}</td>
                  <td><span className="dot" style={{ background: MKT_COLOR[x.m.id] }} />{x.m[lang]}<div className="hint">{t('vpMktAgents', { n: x.n })}</div></td>
                  <td className="r num">{fmtBaht(x.r.target, lang)}</td>
                  <td className="r num">{fmtBaht(Math.round(x.r.gwp), lang)}</td>
                  <td className="vp-ach-col"><Ach v={ach(x.r)} /></td>
                  <td className="r num">{fmtNum(x.r.policies, lang)}</td>
                  <td className="r num">{total.gwp ? `${fmtNum((x.r.gwp / total.gwp) * 100, lang, 0)}%` : '—'}</td>
                  <td className="r num">{fmtNum(renewRate(x.r) * 100, lang, 0)}%</td>
                  <td className="r num">{fmtBaht(Math.round(x.r.renewGwp), lang)}</td>
                  <td><LrChip lr={lossRatio(x.r)} withValue /></td>
                </tr>
              ))}
              <tr className="total">
                <td />
                <td>{t('total')}</td>
                <td className="r num">{fmtBaht(total.target, lang)}</td>
                <td className="r num">{fmtBaht(Math.round(total.gwp), lang)}</td>
                <td className="vp-ach-col"><Ach v={ach(total)} /></td>
                <td className="r num">{fmtNum(total.policies, lang)}</td>
                <td className="r num">100%</td>
                <td className="r num">{fmtNum(renewRate(total) * 100, lang, 0)}%</td>
                <td className="r num">{fmtBaht(Math.round(total.renewGwp), lang)}</td>
                <td><LrChip lr={lossRatio(total)} withValue /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('vpAgents')}</h3>
            <p className="hint">{t('vpAgentsLead', { period: periodLabel })}</p>
          </div>
          <select id="vp-mkt" className="auto-w" aria-label="Marketing" value={mktFilter} onChange={(e) => setMktFilter(e.target.value)}>
            <option value="all">Marketing: {t('filterAll')}</option>
            {MARKETING.map((m) => (
              <option key={m.id} value={m.id}>{m[lang]}</option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="data vp-table vp-agents">
            <thead>
              <tr>
                <th>#</th>
                <th>Business Partner</th>
                <th>{t('vpAssign')}</th>
                <th className="r">{t('vpTarget')}</th>
                <th className="r">{t('vpActual')}</th>
                <th className="vp-ach-col">{t('vpAch')}</th>
                <th className="r">{t('vpRenewal')}</th>
                <th className="r">{t('vpRenewalGwp')}</th>
                <th>{t('vpLoss')}</th>
                <th>{t('vpVisitCol')}</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map(({ a, r }, i) => (
                <tr key={a.id} className={a.active ? '' : 'inactive'}>
                  <td className="num">{i + 1}</td>
                  <td><b>{a[lang]}</b><div className="hint">{a.code} · {t(a.kind === 'company' ? 'agCompany' : 'agPerson')}</div></td>
                  <td>
                    <div className="vp-assign">
                      <span className="dot" style={{ background: MKT_COLOR[a.mktId] }} />
                      <select aria-label={`${t('vpAssign')} ${a.code}`} value={a.mktId} onChange={(e) => updateAgent(a.id, { mktId: e.target.value })}>
                        {MARKETING.map((m) => (
                          <option key={m.id} value={m.id}>{m[lang]}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="r num">{fmtBaht(r.target, lang)}</td>
                  <td className="r num">{fmtBaht(Math.round(r.gwp), lang)}</td>
                  <td className="vp-ach-col"><Ach v={ach(r)} /></td>
                  <td className="r num">{fmtNum(renewRate(r) * 100, lang, 0)}% <span className="muted">({r.renewed}/{r.renewDue})</span></td>
                  <td className="r num">{fmtBaht(Math.round(r.renewGwp), lang)}</td>
                  <td><LrChip lr={lossRatio(r)} withValue /></td>
                  <td className="vp-visit">
                    {(() => {
                      const vi = visitInfo(s.visits, a.id);
                      return (
                        <>
                          <div className="hint">{t('vsLast')}: <span className="num">{vi.last ? fmtDate(vi.last.at, lang, { day: 'numeric', month: 'short', year: 'numeric' }) : t('vsNever')}</span></div>
                          <div className="hint">{t('vsNext')}: <NextVisit at={vi.next} now={now} /></div>
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{t('vpNote')}</p>
      </section>

      <section className="card">
        <h3>{t('vpVisits')}</h3>
        <p className="hint">{t('vpVisitsLead')}</p>
        <VisitList visits={s.visits.filter((v) => mktFilter === 'all' || s.agents.find((a) => a.id === v.agentId)?.mktId === mktFilter)} limit={8} />
      </section>
    </div>
  );
}

function Ach({ v }: { v: number }) {
  const { lang } = useT();
  return (
    <div className="vp-ach">
      <div className="mini-meter" aria-hidden="true"><span className={v >= 1 ? 'good' : ''} style={{ width: `${Math.min(100, v * 100)}%` }} /></div>
      <span className={`num${v < 0.8 ? ' bad-text' : ''}`}>{fmtNum(v * 100, lang, 0)}%</span>
    </div>
  );
}

function LrChip({ lr, withValue = false }: { lr: number; withValue?: boolean }) {
  const { t, lang } = useT();
  const tone = lrTone(lr);
  return (
    <span className={`pill tone-${tone}`}>
      <span aria-hidden="true">{LR_ICON[tone]}</span> {withValue ? `${fmtNum(lr * 100, lang, 1)}% · ` : ''}{t(LR_KEY[tone])}
    </span>
  );
}
