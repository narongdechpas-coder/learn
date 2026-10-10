import { useState } from 'react';
import type { Agent, Proposal, RenewalItem } from '../types';
import { optionPrice } from '../data/agents';
import { vehicleText } from '../data/vehicles';
import { fmtBaht, fmtDate, fmtNum, useT } from '../i18n';
import { DAY_MS } from '../lib/time';
import { Segmented, TypeTag, useNow } from './common';

/** Renewal price before a quotation exists: last year's premium less the 5% no-claim discount. */
export const RENEWAL_FACTOR = 0.95;

/** What ABC expects to collect if this policy renews: the quoted price if there is one, else the estimate. */
export function expectedPremium(r: RenewalItem, proposals: Proposal[]) {
  const pr = r.proposalId ? proposals.find((p) => p.id === r.proposalId) : undefined;
  if (pr) {
    const same = pr.options.find((o) => o.pkg.type === r.coverage) ?? pr.options[0];
    return { value: optionPrice(same, pr.discountPct, pr.vehicle?.usage).price, quoted: true };
  }
  return { value: Math.round(r.premium * RENEWAL_FACTOR), quoted: false };
}

/** "Expiring within N months": 1, 2 or 3, counted cumulatively from today. */
type Months = 1 | 2 | 3;
const MONTHS: Months[] = [1, 2, 3];

/**
 * Renewal report. The agent sees their own book with renewal actions; Marketing passes `agents`
 * to see the whole group, a per-partner breakdown and a reminder action instead.
 */
export function RenewalReport({ renewals, proposals, onRenew, onOpenOffer, agents, onNudge }: {
  renewals: RenewalItem[];
  proposals: Proposal[];
  onRenew?: (r: RenewalItem) => void;
  onOpenOffer?: (id: string) => void;
  agents?: Agent[];
  onNudge?: (r: RenewalItem) => void;
}) {
  const { t, lang } = useT();
  const now = useNow(60000);
  const [months, setMonths] = useState<Months>(1);
  const [view, setView] = useState<'todo' | 'done'>('todo');
  const [limit, setLimit] = useState(20);
  const days = (r: RenewalItem) => Math.ceil((r.expiry - now) / DAY_MS);
  const inWindow = renewals.filter((r) => days(r) > 0 && days(r) <= months * 30);
  // Already past expiry and still not renewed: the most urgent, shown first in the to-do list.
  const overdue = renewals.filter((r) => days(r) <= 0 && (r.status === 'open' || r.status === 'quoted'));

  const doneAll = inWindow.filter((r) => r.status === 'renewed');
  const todoAll = inWindow.filter((r) => r.status !== 'renewed');
  const sums = {
    total: inWindow.length,
    done: doneAll.length,
    todo: todoAll.length,
    got: doneAll.reduce((a, r) => a + (r.renewedPremium ?? r.premium), 0),
    expect: todoAll.filter((r) => r.status !== 'lost').reduce((a, r) => a + expectedPremium(r, proposals).value, 0),
  };
  const sum = (k: keyof typeof sums) => sums[k];

  const todoList = [...overdue, ...inWindow.filter((r) => r.status === 'open' || r.status === 'quoted')].sort((a, b) => a.expiry - b.expiry);
  const doneList = doneAll.sort((a, b) => a.expiry - b.expiry);
  const rate = sum('total') ? sum('done') / sum('total') : 0;
  const period = t('rrWithin', { n: months });
  const mkt = !!agents;
  const agentOf = (r: RenewalItem) => agents?.find((a) => a.id === r.agentId);
  const byAgent = (agents ?? []).map((a) => {
    const list = inWindow.filter((r) => r.agentId === a.id);
    const done = list.filter((r) => r.status === 'renewed');
    const todo = list.filter((r) => r.status !== 'renewed');
    return {
      a,
      total: list.length,
      done: done.length,
      quoted: todo.filter((r) => r.status === 'quoted').length,
      todo: todo.length,
      overdue: overdue.filter((r) => r.agentId === a.id).length,
      urgent: todo.filter((r) => days(r) <= 15).length,
      got: done.reduce((x, r) => x + (r.renewedPremium ?? r.premium), 0),
      expect: todo.filter((r) => r.status !== 'lost').reduce((x, r) => x + expectedPremium(r, proposals).value, 0),
      rate: list.length ? done.length / list.length : 0,
    };
  }).sort((x, y) => y.rate - x.rate || y.total - x.total);

  return (
    <div className="rr">
      <div className="rr-bar">
        <label className="inline-field" htmlFor="rr-months">
          <span>{t('rrExpiring')}</span>
          <select id="rr-months" value={months} onChange={(e) => { setMonths(Number(e.target.value) as Months); setLimit(20); }}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{t('rrWithin', { n: m })}</option>
            ))}
          </select>
        </label>
        {overdue.length > 0 && <span className="pill tone-bad">{t('rrOverdueNote', { n: overdue.length })}</span>}
      </div>

      <div className="rr-money">
        <div className="rr-money-tile rr-count">
          <div className="eyebrow">{t('rrDueIn', { n: months })}</div>
          <div className="rr-money-v num">{fmtNum(sum('total'), lang)} <span className="muted">{t('rrPolicies')}</span></div>
          <div className="rr-split">
            <span className="rr-done num">✓ {t('renRenewed')} {sum('done')}</span>
            <span className="rr-todo num">○ {t('rrNotYet')} {sum('todo')}</span>
          </div>
          <div className="rr-meter" aria-hidden="true"><span style={{ width: `${rate * 100}%` }} /></div>
          <div className="hint num">{t('rrRate', { pct: fmtNum(rate * 100, lang, 0) })}</div>
        </div>
        <div className="rr-money-tile tone-good">
          <div className="eyebrow">{t('rrGot')}</div>
          <div className="rr-money-v num">{fmtBaht(Math.round(sum('got')), lang)}</div>
          <div className="hint">{t('rrGotNote', { n: sum('done') })}</div>
        </div>
        <div className="rr-money-tile tone-wait">
          <div className="eyebrow">{t('rrExpect')}</div>
          <div className="rr-money-v num">{fmtBaht(Math.round(sum('expect')), lang)}</div>
          <div className="hint">{t('rrExpectNote', { n: sum('todo') })}</div>
        </div>
        <div className="rr-money-tile">
          <div className="eyebrow">{t('rrPotential')}</div>
          <div className="rr-money-v num">{fmtBaht(Math.round(sum('got') + sum('expect')), lang)}</div>
          <div className="hint">{t('rrPotentialNote')}</div>
        </div>
      </div>

      {mkt && (
        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t('rrByAgent')} · {period}</h3>
              <p className="hint">{t('rrByAgentLead')}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data rr-agents">
              <thead>
                <tr>
                  <th>{t('agAgent')}</th>
                  <th className="r">{t('rrDue')}</th>
                  <th className="r">{t('renRenewed')}</th>
                  <th className="r">{t('renQuoted')}</th>
                  <th className="r">{t('rrNotYet')}</th>
                  <th className="rr-rate-col">{t('dRenewalRate')}</th>
                  <th className="r">{t('rrUrgent')}</th>
                  <th className="r">{t('rrGotCol')}</th>
                  <th className="r">{t('rrExpectCol')}</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.map((x) => (
                  <tr key={x.a.id} className={x.a.active ? '' : 'inactive'}>
                    <td><b>{x.a[lang]}</b><div className="hint">{x.a.code} · {t(x.a.kind === 'company' ? 'agCompany' : 'agPerson')}</div></td>
                    <td className="r num">{x.total}</td>
                    <td className="r num">{x.done}</td>
                    <td className="r num">{x.quoted}</td>
                    <td className="r num">{x.todo}</td>
                    <td className="rr-rate-col">
                      <div className="rr-meter" aria-hidden="true"><span style={{ width: `${x.rate * 100}%` }} /></div>
                      <span className={`num${x.total && x.rate < rate ? ' bad-text' : ''}`}>{x.total ? `${fmtNum(x.rate * 100, lang, 0)}%` : '—'}</span>
                    </td>
                    <td className={`r num${x.urgent + x.overdue ? ' bad-text' : ''}`}>{x.urgent + x.overdue}</td>
                    <td className="r num">{fmtBaht(Math.round(x.got), lang)}</td>
                    <td className="r num">{fmtBaht(Math.round(x.expect), lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">{t('rrByAgentNote', { pct: fmtNum(rate * 100, lang, 0) })}</p>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{view === 'todo' ? t('rrTodoTitle') : t('rrDoneTitle')} · {period}</h3>
            <p className="hint">{view === 'todo' ? t('rrTodoLead') : t('rrDoneLead')}</p>
          </div>
          <Segmented id="rr-view" label={t('filterStatus')} value={view} onChange={(v) => { setView(v); setLimit(20); }} options={[
            { value: 'todo', label: `${t('rrNotYet')} (${todoList.length})` },
            { value: 'done', label: `${t('renRenewed')} (${doneList.length})` },
          ]} />
        </div>
        {(view === 'todo' ? todoList : doneList).length === 0 ? (
          <p className="muted pad">{t('agNoRenewals')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data rr-table">
              <thead>
                <tr>
                  {view === 'todo' && <th>{t('rrPriority')}</th>}
                  <th>{t('agCustomer')}</th>
                  {mkt && <th>{t('agAgent')}</th>}
                  <th>{t('rrPolicy')}</th>
                  <th>{t('rrExpiry')}</th>
                  <th className="r">{t('rrOldPremium')}</th>
                  <th className="r">{view === 'todo' ? t('rrExpectCol') : t('rrGotCol')}</th>
                  <th>{view === 'todo' ? t('filterStatus') : t('rrRenewedOn')}</th>
                  {view === 'todo' && <th />}
                </tr>
              </thead>
              <tbody>
                {(view === 'todo' ? todoList : doneList).slice(0, limit).map((r, i) => {
                  const d = days(r);
                  const ex = expectedPremium(r, proposals);
                  const tone = d <= 0 ? 'bad' : d <= 15 ? 'bad' : d <= 30 ? 'warn' : 'neutral';
                  return (
                    <tr key={r.id} className={d <= 0 ? 'rr-late' : ''}>
                      {view === 'todo' && <td className="rr-c-rank"><span className={`rr-rank tone-${tone}`}>{i + 1}</span></td>}
                      <td className="rr-c-cust">
                        <b>{r.customerName}</b>
                        <div className="hint num">☎ {r.phone}</div>
                      </td>
                      {mkt && <td className="rr-c-agent">{agentOf(r)?.[lang] ?? '—'}<div className="hint">{agentOf(r)?.code}</div></td>}
                      <td className="rr-c-pol">
                        <div className="rr-pol"><TypeTag type={r.coverage} /> <span className="num">{r.policyNo}</span></div>
                        <div className="hint">{vehicleText(r.vehicle)}</div>
                      </td>
                      <td className="rr-c-exp">
                        <div className="num">{fmtDate(r.expiry, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        {view === 'todo' && <span className={`pill tone-${tone}`}>{d <= 0 ? t('agExpired', { n: -d }) : t('agExpiresIn', { n: d })}</span>}
                      </td>
                      <td className="r num muted rr-c-old">{fmtBaht(r.premium, lang)}</td>
                      <td className="r num rr-c-new">
                        <b>{fmtBaht(view === 'todo' ? ex.value : (r.renewedPremium ?? r.premium), lang)}</b>
                        {view === 'todo' && <div className="hint">{ex.quoted ? t('rrFromQuote') : t('rrEstimate')}</div>}
                      </td>
                      <td className="rr-c-st">
                        {view === 'todo' ? (
                          <span className={`pill tone-${r.status === 'quoted' ? 'info' : 'wait'}`}>{r.status === 'quoted' ? t('renQuoted') : t('rrNotQuoted')}</span>
                        ) : (
                          <span className="num">{r.renewedAt ? fmtDate(r.renewedAt, lang) : '—'}</span>
                        )}
                      </td>
                      {view === 'todo' && (
                        <td className="ag-row-actions rr-c-act">
                          {mkt ? (
                            r.status === 'quoted' ? null : r.nudgedAt ? (
                              <span className="pill tone-neutral">✓ {t('mktNudged')}</span>
                            ) : (
                              <button type="button" className="btn small" onClick={() => onNudge?.(r)}>{t('mktNudge')}</button>
                            )
                          ) : r.status === 'quoted' && r.proposalId ? (
                            <button type="button" className="btn small ghost" onClick={() => onOpenOffer?.(r.proposalId!)}>{t('rrOpenQuote')}</button>
                          ) : (
                            <button type="button" className="btn small" onClick={() => onRenew?.(r)}>{t('agRenewBtn')}</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {(view === 'todo' ? todoList : doneList).length > limit && (
          <div className="list-foot">
            <span className="muted">{t('showing', { n: limit, total: (view === 'todo' ? todoList : doneList).length })}</span>
            <button type="button" className="btn small" onClick={() => setLimit((l) => l + 20)}>{t('more')}</button>
          </div>
        )}
        {view === 'todo' && <p className="hint">{t('rrNote')}</p>}
      </section>
    </div>
  );
}
