import { useState } from 'react';
import type { Agent, Case, Proposal } from '../types';
import { MARKETING, caseCommission, mktById, payInfo, settled } from '../data/agents';
import { vehicleText } from '../data/vehicles';
import { COVERAGE_LABEL, fmtBaht, fmtDate, fmtNum, useT } from '../i18n';
import { nudgeAgent, totalPremium, updateAgent, useStore } from '../store';
import { DAY_MS, bkkParts, bkkTime } from '../lib/time';
import { NumberInput, Segmented, useNow } from './common';
import { proposalState } from './Agent';
import { RenewalReport } from './AgentRenewals';

type Tab = 'perf' | 'renew' | 'manage' | 'follow';

/** Per-agent numbers over a period: quotations, close rate, discount, production and commission. */
export function agentStats(a: Agent, cases: Case[], proposals: Proposal[], from: number, to: number) {
  const mine = cases.filter((c) => c.agentId === a.id);
  const issued = mine.filter((c) => c.stamps.issued !== undefined && c.stamps.issued >= from && c.stamps.issued <= to);
  const offers = proposals.filter((p) => p.agentId === a.id && p.createdAt >= from && p.createdAt <= to);
  const accepted = offers.filter((p) => p.status === 'accepted');
  const gwp = issued.reduce((s, c) => s + (c.premium ?? 0), 0);
  const commission = issued.reduce((s, c) => s + caseCommission(c).net, 0);
  const discount = accepted.length ? accepted.reduce((s, p) => s + p.discountPct, 0) / accepted.length : 0;
  return { policies: issued.length, gwp, commission, offers: offers.length, accepted: accepted.length, close: offers.length ? accepted.length / offers.length : 0, discount };
}

export function MarketingApp({ mktId, setMktId }: { mktId: string; setMktId: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(60000);
  const [tab, setTab] = useState<Tab>('perf');
  const me = mktById(mktId);
  const agents = s.agents.filter((a) => mktId === 'all' || a.mktId === mktId);
  const ids = new Set(agents.map((a) => a.id));

  const renewDue = s.renewals.filter((r) => r.agentId && ids.has(r.agentId) && r.status !== 'renewed' && r.status !== 'lost' && r.expiry - now <= 60 * DAY_MS && r.expiry >= now - 7 * DAY_MS);
  const late = s.cases.filter((c) => c.agentId && ids.has(c.agentId) && payInfo(c, now)?.state === 'overdue');
  // Untouched renewals first; ones the agent already quoted are shown for context only.
  const renewList = [...renewDue].sort((a, b) => Number(a.status === 'quoted') - Number(b.status === 'quoted') || a.expiry - b.expiry);
  const pending = renewDue.filter((r) => r.status === 'open' && !r.nudgedAt).length + late.filter((c) => !c.log.some((l) => l.action === 'nudge')).length;

  return (
    <div className="mkt-app">
      <div className="ag-head">
        <div className="ag-who">
          <span className="ag-avatar kind-mkt" aria-hidden="true">{me ? me[lang].slice(0, 1) : '★'}</span>
          <div>
            <div className="eyebrow">{t('mktRole')}</div>
            <h2>{me ? me[lang] : t('mktAll')}</h2>
            <div className="muted">{t('mktLead', { n: agents.length })}</div>
          </div>
        </div>
        <div className="ag-tools">
          <label className="inline-field" htmlFor="mkt-as">
            <span>{t('agActAs')}</span>
            <select id="mkt-as" value={mktId} onChange={(e) => setMktId(e.target.value)}>
              {MARKETING.map((m) => (
                <option key={m.id} value={m.id}>{m[lang]}</option>
              ))}
              <option value="all">{t('mktAll')}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="subtabs" role="tablist">
        <button role="tab" aria-selected={tab === 'perf'} className={tab === 'perf' ? 'on' : ''} onClick={() => setTab('perf')}>{t('mktTabPerf')}</button>
        <button role="tab" aria-selected={tab === 'renew'} className={tab === 'renew' ? 'on' : ''} onClick={() => setTab('renew')}>{t('mktTabRenew')}</button>
        <button role="tab" aria-selected={tab === 'manage'} className={tab === 'manage' ? 'on' : ''} onClick={() => setTab('manage')}>{t('mktTabManage')}</button>
        <button role="tab" aria-selected={tab === 'follow'} className={tab === 'follow' ? 'on' : ''} onClick={() => setTab('follow')}>
          {t('mktTabFollow')} {pending > 0 && <span className="nav-badge num">{pending}</span>}
        </button>
      </div>

      {tab === 'perf' && <MktPerf agents={agents} now={now} />}
      {tab === 'renew' && (
        <RenewalReport
          renewals={s.renewals.filter((r) => r.agentId && ids.has(r.agentId))}
          proposals={s.proposals}
          agents={agents}
          onNudge={(r) => nudgeAgent('renewal', r.id, me?.[lang] ?? 'Jacky')}
        />
      )}
      {tab === 'manage' && <MktManage agents={agents} />}
      {tab === 'follow' && (
        <div className="dash-2col">
          <section className="card">
            <h3>{t('mktRenewDue')}</h3>
            <p className="hint">{t('mktRenewDueLead')}</p>
            {renewDue.length === 0 ? (
              <p className="muted">{t('agNoRenewals')}</p>
            ) : (
              <ul className="ag-renew">
                {renewList.slice(0, 10).map((r) => {
                  const days = Math.round((r.expiry - now) / DAY_MS);
                  const ag = s.agents.find((a) => a.id === r.agentId)!;
                  return (
                    <li key={r.id}>
                      <div>
                        <b>{r.customerName}</b> <span className="muted">· {vehicleText(r.vehicle)}</span>
                        <div className="hint num">{ag[lang]} · {r.policyNo} · {COVERAGE_LABEL[lang][r.coverage]}</div>
                      </div>
                      <span className={`pill tone-${days < 0 ? 'bad' : days <= 30 ? 'warn' : 'neutral'}`}>{days < 0 ? t('agExpired', { n: -days }) : t('agExpiresIn', { n: days })}</span>
                      {r.status === 'quoted' ? (
                        <span className="pill tone-info">{t('renQuoted')}</span>
                      ) : r.nudgedAt ? (
                        <span className="pill tone-neutral">✓ {t('mktNudged')}</span>
                      ) : (
                        <button type="button" className="btn small" onClick={() => nudgeAgent('renewal', r.id, me?.[lang] ?? 'Jacky')}>{t('mktNudge')}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {renewList.length > 10 && <p className="hint">{t('mktMore', { n: renewList.length - 10 })}</p>}
          </section>
          <section className="card">
            <h3>{t('mktLate')}</h3>
            <p className="hint">{t('mktLateLead')}</p>
            {late.length === 0 ? (
              <p className="muted">{t('mktNoLate')}</p>
            ) : (
              <ul className="ag-renew">
                {late.map((c) => {
                  const p = payInfo(c, now)!;
                  const ag = s.agents.find((a) => a.id === c.agentId)!;
                  const nudged = c.log.some((l) => l.action === 'nudge');
                  return (
                    <li key={c.id}>
                      <div>
                        <b className="num">{c.id}</b> <span className="muted">· {c.customer.firstName} {c.customer.lastName}</span>
                        <div className="hint">{ag[lang]} · {t(c.collect === 'agent' ? 'remitShort' : 'payShort')} · {t('agDue', { d: fmtDate(p.due, lang) })}</div>
                      </div>
                      <span className="num">{fmtBaht(totalPremium(c) ?? 0, lang)}</span>
                      {nudged ? (
                        <span className="pill tone-neutral">✓ {t('mktNudged')}</span>
                      ) : (
                        <button type="button" className="btn small" onClick={() => nudgeAgent('remit', c.id, me?.[lang] ?? 'Jacky')}>{t('mktNudge')}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MktPerf({ agents, now }: { agents: Agent[]; now: number }) {
  const { t, lang } = useT();
  const s = useStore();
  const [range, setRange] = useState<'month' | '90'>('month');
  const p = bkkParts(now);
  const from = range === 'month' ? bkkTime(p.y, p.mo, 1) : now - 90 * DAY_MS;
  const rows = agents.map((a) => ({ a, st: agentStats(a, s.cases, s.proposals, from, now) })).sort((x, y) => y.st.gwp - x.st.gwp);
  const tot = rows.reduce((acc, r) => ({ gwp: acc.gwp + r.st.gwp, target: acc.target + r.a.target, policies: acc.policies + r.st.policies, commission: acc.commission + r.st.commission }), { gwp: 0, target: 0, policies: 0, commission: 0 });
  const open = s.proposals.filter((x) => agents.some((a) => a.id === x.agentId) && ['viewed', 'sent', 'draft'].includes(proposalState(x, now)));
  const unpaid = s.cases.filter((c) => c.agentId && agents.some((a) => a.id === c.agentId) && payInfo(c, now) && !settled(payInfo(c, now)!.state));
  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="eyebrow">{t('agKpiGwp')}</div>
          <div className="kpi-value num">{fmtBaht(Math.round(tot.gwp), lang)}</div>
          <div className="kpi-foot muted">{range === 'month' ? t('mktVsTarget', { pct: tot.target ? fmtNum((tot.gwp / tot.target) * 100, lang, 0) : '—' }) : t('r90')}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('agKpiPolicies')}</div>
          <div className="kpi-value num">{fmtNum(tot.policies, lang)}</div>
          <div className="kpi-foot muted">{t('agCommission')} {fmtBaht(Math.round(tot.commission), lang)}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('mktOpenOffers')}</div>
          <div className="kpi-value num">{fmtNum(open.length, lang)}</div>
          <div className="kpi-foot muted">{t('mktOpenOffersNote', { n: open.filter((x) => x.viewedAt).length })}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('agFuUnpaid')}</div>
          <div className="kpi-value num">{fmtNum(unpaid.length, lang)}</div>
          <div className="kpi-foot muted">{t('payOverdue')} {unpaid.filter((c) => payInfo(c, now)!.state === 'overdue').length}</div>
        </div>
      </div>
      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('mktTabPerf')}</h3>
            <p className="hint">{t('mktPerfLead')}</p>
          </div>
          <Segmented id="mkt-range" label={t('range')} value={range} onChange={setRange} options={[
            { value: 'month', label: t('rMonth') },
            { value: '90', label: t('r90') },
          ]} />
        </div>
        <AgentTable rows={rows} showTarget={range === 'month'} />
      </section>
    </>
  );
}

export function AgentTable({ rows, showTarget }: { rows: { a: Agent; st: ReturnType<typeof agentStats> }[]; showTarget: boolean }) {
  const { t, lang } = useT();
  return (
    <div className="table-wrap">
      <table className="data agent-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('agAgent')}</th>
            <th className="r">{t('mPolicies')}</th>
            <th className="r">{t('mGwp')}</th>
            {showTarget && <th className="ag-target-col">{t('agTarget')}</th>}
            <th className="r">{t('agCommission')}</th>
            <th className="r">{t('mktOffers')}</th>
            <th className="r">{t('mktClose')}</th>
            <th className="r">{t('mktAvgDisc')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ a, st }, i) => {
            const pct = a.target ? st.gwp / a.target : 0;
            return (
              <tr key={a.id} className={a.active ? '' : 'inactive'}>
                <td className="num muted">{i + 1}</td>
                <td>
                  <b>{a[lang]}</b>
                  <div className="hint">{a.code} · {t(a.kind === 'company' ? 'agCompany' : 'agPerson')} · {mktById(a.mktId)?.[lang]}</div>
                </td>
                <td className="r num">{fmtNum(st.policies, lang)}</td>
                <td className="r num">{fmtBaht(Math.round(st.gwp), lang)}</td>
                {showTarget && (
                  <td className="ag-target-col">
                    <div className="mini-meter" aria-hidden="true"><span className={pct >= 1 ? 'good' : ''} style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
                    <span className="num hint">{fmtNum(pct * 100, lang, 0)}% · {fmtBaht(a.target, lang)}</span>
                  </td>
                )}
                <td className="r num">{fmtBaht(Math.round(st.commission), lang)}</td>
                <td className="r num">{fmtNum(st.offers, lang)}</td>
                <td className={`r num${st.offers && st.close < 0.3 ? ' bad-text' : ''}`}>{st.offers ? `${fmtNum(st.close * 100, lang, 0)}%` : '—'}</td>
                <td className="r num">{st.accepted ? `${fmtNum(st.discount, lang, 1)}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MktManage({ agents }: { agents: Agent[] }) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(60000);
  const p = bkkParts(now);
  const monthStart = bkkTime(p.y, p.mo, 1);
  const pace = p.d / new Date(Date.UTC(p.y, p.mo + 1, 0)).getUTCDate();
  // Production this month: policies issued since the 1st through each partner.
  const actual = (a: Agent) => s.cases.filter((c) => c.agentId === a.id && (c.stamps.issued ?? 0) >= monthStart).reduce((x, c) => x + (c.premium ?? 0), 0);
  return (
    <section className="card">
      <h3>{t('mktTabManage')}</h3>
      <p className="hint">{t('mktManageLead')}</p>
      <div className="table-wrap">
        <table className="data agent-manage">
          <thead>
            <tr>
              <th>{t('agAgent')}</th>
              <th>{t('agContact')}</th>
              <th>{t('mktTargetMonth')}</th>
              <th className="r">{t('mktActualMtd')}</th>
              <th className="mkt-ach-col">{t('vpAch')}</th>
              <th>{t('filterStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className={a.active ? '' : 'inactive'}>
                <td>
                  <b>{a[lang]}</b>
                  <div className="hint">{a.code} · {t(a.kind === 'company' ? 'agCompany' : 'agPerson')} · {t('agLicense')} {a.license}</div>
                </td>
                <td className="hint">{a.kind === 'company' ? `${lang === 'th' ? a.contactTh : a.contactEn} · ` : ''}{a.phone} · {a.province}</td>
                <td>
                  <NumberInput
                    className="num target-input"
                    decimals={false}
                    aria-label={`${t('mktTargetMonth')} ${a.code}`}
                    value={a.target}
                    onBlur={(n) => {
                      const v = Math.max(0, Math.round(n || 0));
                      if (v !== a.target) updateAgent(a.id, { target: v });
                    }}
                  />
                </td>
                <td className="r num">{fmtBaht(Math.round(actual(a)), lang)}</td>
                <td className="mkt-ach-col">
                  {(() => {
                    const v = a.target ? actual(a) / a.target : 0;
                    return (
                      <div className="vp-ach">
                        <div className="mini-meter ach-pace" aria-hidden="true">
                          <span className={v >= 1 ? 'good' : ''} style={{ width: `${Math.min(100, v * 100)}%` }} />
                          <i style={{ left: `${pace * 100}%` }} />
                        </div>
                        <span className={`num${v < pace * 0.8 ? ' bad-text' : ''}`}>{fmtNum(v * 100, lang, 0)}%</span>
                      </div>
                    );
                  })()}
                </td>
                <td>
                  <button type="button" className={`btn small ${a.active ? 'ghost' : ''}`} onClick={() => updateAgent(a.id, { active: !a.active })}>
                    {a.active ? t('mktSuspend') : t('mktActivate')}
                  </button>
                  <span className={`pill tone-${a.active ? 'good' : 'muted'}`}>{a.active ? t('mktActive') : t('mktSuspended')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

