import { useState } from 'react';
import type { Proposal, RenewalItem } from '../types';
import { optionPrice } from '../data/agents';
import { vehicleText } from '../data/vehicles';
import { fmtBaht, fmtDate, fmtNum, useT, type TKey } from '../i18n';
import { DAY_MS } from '../lib/time';
import { Segmented, TypeTag, useNow } from './common';

/** Renewal price before a quotation exists: last year's premium less the 5% no-claim discount. */
export const RENEWAL_FACTOR = 0.95;

/** What ABC expects to collect if this policy renews: the quoted price if there is one, else the estimate. */
export function expectedPremium(r: RenewalItem, proposals: Proposal[]) {
  const pr = r.proposalId ? proposals.find((p) => p.id === r.proposalId) : undefined;
  if (pr) {
    const same = pr.options.find((o) => o.pkg.type === r.coverage) ?? pr.options[0];
    return { value: optionPrice(same, pr.discountPct, pr.vehicle.usage).price, quoted: true };
  }
  return { value: Math.round(r.premium * RENEWAL_FACTOR), quoted: false };
}

type Bucket = 0 | 1 | 2 | 3;
const BUCKETS: { b: Bucket; key: TKey; from: number; to: number }[] = [
  { b: 1, key: 'rr1', from: 0, to: 30 },
  { b: 2, key: 'rr2', from: 30, to: 60 },
  { b: 3, key: 'rr3', from: 60, to: 90 },
];

export function RenewalReport({ renewals, proposals, onRenew, onOpenOffer }: { renewals: RenewalItem[]; proposals: Proposal[]; onRenew: (r: RenewalItem) => void; onOpenOffer: (id: string) => void }) {
  const { t, lang } = useT();
  const now = useNow(60000);
  const [bucket, setBucket] = useState<Bucket>(0);
  const [view, setView] = useState<'todo' | 'done'>('todo');
  const days = (r: RenewalItem) => Math.ceil((r.expiry - now) / DAY_MS);
  const inWindow = renewals.filter((r) => days(r) > 0 && days(r) <= 90);
  // Already past expiry and still not renewed: the most urgent, shown first in the to-do list.
  const overdue = renewals.filter((r) => days(r) <= 0 && (r.status === 'open' || r.status === 'quoted'));

  const stats = BUCKETS.map((x) => {
    const list = inWindow.filter((r) => days(r) > x.from && days(r) <= x.to);
    const done = list.filter((r) => r.status === 'renewed');
    const todo = list.filter((r) => r.status !== 'renewed');
    return {
      ...x,
      total: list.length,
      done: done.length,
      todo: todo.length,
      got: done.reduce((a, r) => a + (r.renewedPremium ?? r.premium), 0),
      expect: todo.filter((r) => r.status !== 'lost').reduce((a, r) => a + expectedPremium(r, proposals).value, 0),
    };
  });
  const sum = (k: 'total' | 'done' | 'todo' | 'got' | 'expect') => stats.reduce((a, s) => a + s[k], 0);
  const pick = (r: RenewalItem) => bucket === 0 || BUCKETS.some((x) => x.b === bucket && days(r) > x.from && days(r) <= x.to);

  const todoList = [...(bucket === 0 ? overdue : []), ...inWindow.filter((r) => r.status === 'open' || r.status === 'quoted')]
    .filter((r) => days(r) <= 0 || pick(r))
    .sort((a, b) => a.expiry - b.expiry);
  const doneList = inWindow.filter((r) => r.status === 'renewed' && pick(r)).sort((a, b) => a.expiry - b.expiry);
  const rate = sum('total') ? sum('done') / sum('total') : 0;

  return (
    <div className="rr">
      <div className="rr-summary">
        <button type="button" className={`rr-tile rr-all${bucket === 0 ? ' on' : ''}`} aria-pressed={bucket === 0} onClick={() => setBucket(0)}>
          <div className="eyebrow">{t('rrAll')}</div>
          <div className="rr-big num">{fmtNum(sum('total'), lang)} <span className="muted">{t('rrPolicies')}</span></div>
          <div className="rr-split">
            <span className="rr-done num">✓ {t('renRenewed')} {sum('done')}</span>
            <span className="rr-todo num">○ {t('rrNotYet')} {sum('todo')}</span>
          </div>
          <div className="rr-meter" aria-hidden="true"><span style={{ width: `${rate * 100}%` }} /></div>
          <div className="hint num">{t('rrRate', { pct: fmtNum(rate * 100, lang, 0) })}</div>
        </button>
        {stats.map((x) => (
          <button key={x.b} type="button" className={`rr-tile${bucket === x.b ? ' on' : ''}`} aria-pressed={bucket === x.b} onClick={() => setBucket(bucket === x.b ? 0 : x.b)}>
            <div className="eyebrow">{t(x.key)}</div>
            <div className="rr-big num">{fmtNum(x.total, lang)} <span className="muted">{t('rrPolicies')}</span></div>
            <div className="rr-split">
              <span className="rr-done num">✓ {t('renRenewed')} {x.done}</span>
              <span className="rr-todo num">○ {t('rrNotYet')} {x.todo}</span>
            </div>
            <div className="rr-meter" aria-hidden="true"><span style={{ width: `${x.total ? (x.done / x.total) * 100 : 0}%` }} /></div>
          </button>
        ))}
      </div>

      <div className="rr-money">
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

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{view === 'todo' ? t('rrTodoTitle') : t('rrDoneTitle')}{bucket ? ` · ${t(BUCKETS[bucket - 1].key)}` : ''}</h3>
            <p className="hint">{view === 'todo' ? t('rrTodoLead') : t('rrDoneLead')}</p>
          </div>
          <Segmented id="rr-view" label={t('filterStatus')} value={view} onChange={setView} options={[
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
                  <th>{t('rrPolicy')}</th>
                  <th>{t('rrExpiry')}</th>
                  <th className="r">{t('rrOldPremium')}</th>
                  <th className="r">{view === 'todo' ? t('rrExpectCol') : t('rrGotCol')}</th>
                  <th>{view === 'todo' ? t('filterStatus') : t('rrRenewedOn')}</th>
                  {view === 'todo' && <th />}
                </tr>
              </thead>
              <tbody>
                {(view === 'todo' ? todoList : doneList).map((r, i) => {
                  const d = days(r);
                  const ex = expectedPremium(r, proposals);
                  const tone = d <= 0 ? 'bad' : d <= 15 ? 'bad' : d <= 30 ? 'warn' : 'neutral';
                  return (
                    <tr key={r.id} className={d <= 0 ? 'rr-late' : ''}>
                      {view === 'todo' && <td><span className={`rr-rank tone-${tone}`}>{i + 1}</span></td>}
                      <td>
                        <b>{r.customerName}</b>
                        <div className="hint num">☎ {r.phone}</div>
                      </td>
                      <td>
                        <div className="rr-pol"><TypeTag type={r.coverage} /> <span className="num">{r.policyNo}</span></div>
                        <div className="hint">{vehicleText(r.vehicle)}</div>
                      </td>
                      <td>
                        <div className="num">{fmtDate(r.expiry, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        {view === 'todo' && <span className={`pill tone-${tone}`}>{d <= 0 ? t('agExpired', { n: -d }) : t('agExpiresIn', { n: d })}</span>}
                      </td>
                      <td className="r num muted">{fmtBaht(r.premium, lang)}</td>
                      <td className="r num">
                        <b>{fmtBaht(view === 'todo' ? ex.value : (r.renewedPremium ?? r.premium), lang)}</b>
                        {view === 'todo' && <div className="hint">{ex.quoted ? t('rrFromQuote') : t('rrEstimate')}</div>}
                      </td>
                      <td>
                        {view === 'todo' ? (
                          <span className={`pill tone-${r.status === 'quoted' ? 'info' : 'wait'}`}>{r.status === 'quoted' ? t('renQuoted') : t('rrNotQuoted')}</span>
                        ) : (
                          <span className="num">{r.renewedAt ? fmtDate(r.renewedAt, lang) : '—'}</span>
                        )}
                      </td>
                      {view === 'todo' && (
                        <td className="ag-row-actions">
                          {r.status === 'quoted' && r.proposalId ? (
                            <button type="button" className="btn small ghost" onClick={() => onOpenOffer(r.proposalId!)}>{t('rrOpenQuote')}</button>
                          ) : (
                            <button type="button" className="btn small" onClick={() => onRenew(r)}>{t('agRenewBtn')}</button>
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
        {view === 'todo' && <p className="hint">{t('rrNote')}</p>}
      </section>
    </div>
  );
}
