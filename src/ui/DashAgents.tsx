import type { Agent, Case, RenewalItem } from '../types';
import { payInfo, settled, type PayState } from '../data/agents';
import { fmtBaht, fmtNum, useT, type TKey } from '../i18n';
import { useStore } from '../store';
import { DAY_MS } from '../lib/time';
import { AgentTable, agentStats } from './Marketing';

type Bucket = 'past' | 'm1' | 'm2' | 'm3';
const BUCKETS: [Bucket, TKey, number, number][] = [
  ['past', 'rbPast', -30, 0],
  ['m1', 'rb1', 0, 30],
  ['m2', 'rb2', 30, 60],
  ['m3', 'rb3', 60, 90],
];
const REN_STATES: [RenewalItem['status'], TKey][] = [
  ['renewed', 'renRenewed'],
  ['quoted', 'renQuoted'],
  ['open', 'renOpen'],
  ['lost', 'renLost'],
];

/**
 * Dashboard sections for the sub-agent channel: ranking with close rate and discount,
 * the quotation funnel, payment status, and renewal performance.
 */
export function AgentSections({ cases, agents, renewals, from, to, now, showAgents }: { cases: Case[]; agents: Agent[]; renewals: RenewalItem[]; from: number; to: number; now: number; showAgents: boolean }) {
  const { t, lang } = useT();
  const s = useStore();
  const ids = new Set(agents.map((a) => a.id));
  const rows = agents.map((a) => ({ a, st: agentStats(a, cases, s.proposals, from, to) })).sort((x, y) => y.st.gwp - x.st.gwp);
  const kindSum = (k: Agent['kind']) => rows.filter((r) => r.a.kind === k).reduce((acc, r) => ({ gwp: acc.gwp + r.st.gwp, n: acc.n + r.st.policies }), { gwp: 0, n: 0 });
  const person = kindSum('person');
  const company = kindSum('company');

  const offers = s.proposals.filter((p) => ids.has(p.agentId) && p.createdAt >= from && p.createdAt <= to);
  const caseOf = (id?: string) => (id ? s.cases.find((c) => c.id === id) : undefined);
  const funnel = [
    { key: 'made', label: t('fnMade'), n: offers.length },
    { key: 'viewed', label: t('fnViewed'), n: offers.filter((p) => p.viewedAt || p.acceptedBy === 'agent').length },
    { key: 'accepted', label: t('fnAccepted'), n: offers.filter((p) => p.status === 'accepted').length },
    { key: 'issued', label: t('fnIssued'), n: offers.filter((p) => caseOf(p.caseId)?.stamps.issued).length },
    // Money in: the customer paid ABC, or the agent remitted what they collected.
    { key: 'paid', label: t('fnPaid'), n: offers.filter((p) => { const c = caseOf(p.caseId); return !!c?.stamps.issued && settled(payInfo(c, now)?.state); }).length },
  ];

  const payCases = cases.filter((c) => c.agentId && ids.has(c.agentId) && c.stamps.confirmed !== undefined && c.stamps.confirmed >= from && c.stamps.confirmed <= to);
  const payRows = (['link', 'agent'] as const).map((m) => {
    const list = payCases.filter((c) => c.collect === m).map((c) => ({ c, p: payInfo(c, now) })).filter((x) => x.p);
    const by = (st: PayState[]) => {
      const xs = list.filter((x) => st.includes(x.p!.state));
      return { n: xs.length, v: xs.reduce((a, x) => a + (x.c.premium ?? x.c.pkg?.premium ?? x.c.quotedPremium ?? 0), 0) };
    };
    return { m, ok: by(['paid']), wait: by(['pending']), over: by(['overdue']), late: by(['late']), total: list.length };
  });
  const tot = (k: 'ok' | 'wait' | 'over' | 'late') => payRows.reduce((a, r) => ({ n: a.n + r[k].n, v: a.v + r[k].v }), { n: 0, v: 0 });
  const payTotal = payRows.reduce((a, r) => a + r.total, 0);

  const ren = BUCKETS.map(([b, label, d0, d1]) => {
    const list = renewals.filter((r) => r.expiry >= now + d0 * DAY_MS && r.expiry < now + d1 * DAY_MS);
    const count = (st: RenewalItem['status']) => list.filter((r) => r.status === st).length;
    return { b, label, list, count, premium: list.reduce((a, r) => a + r.premium, 0), rate: list.length ? count('renewed') / list.length : 0 };
  });

  return (
    <>
      {showAgents && (
        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t('dAgents')}</h3>
              <p className="hint">{t('dAgentsLead')}</p>
            </div>
            <div className="kind-split">
              <span className="chip">{t('agPerson')} {fmtBaht(Math.round(person.gwp), lang)} · {fmtNum(person.n, lang)}</span>
              <span className="chip">{t('agCompany')} {fmtBaht(Math.round(company.gwp), lang)} · {fmtNum(company.n, lang)}</span>
            </div>
          </div>
          <AgentTable rows={rows} showTarget={false} />
        </section>
      )}

      {showAgents && (
        <div className="dash-2col">
          <section className="card">
            <div className="card-head">
              <div>
                <h3>{t('dAgentFunnel')}</h3>
                <p className="hint">{t('dAgentFunnelLead')}</p>
              </div>
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
                    <li key={f.key}>
                      <span className="fn-name">{f.label}</span>
                      <span className="fn-track"><span className="fn-fill" style={{ width: `${(f.n / funnel[0].n) * 100}%` }} /></span>
                      <span className="fn-num num"><b>{fmtNum(f.n, lang)}</b> <span className="muted">{fmtNum((f.n / funnel[0].n) * 100, lang, 0)}%</span></span>
                      <span className={`fn-step num${i > 0 && prev && f.n / prev < 0.5 ? ' low' : ''}`}>{i > 0 ? `${prev ? fmtNum((f.n / prev) * 100, lang, 0) : 0}%` : '—'}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>{t('dPay')}</h3>
                <p className="hint">{t('dPayLead')}</p>
              </div>
            </div>
            <div className="pay-tiles">
              <PayTile tone="good" label={t('payPaid')} n={tot('ok').n} v={tot('ok').v} total={payTotal} />
              <PayTile tone="wait" label={t('payPending')} n={tot('wait').n} v={tot('wait').v} total={payTotal} />
              <PayTile tone="bad" label={t('dPayOver')} n={tot('over').n + tot('late').n} v={tot('over').v + tot('late').v} total={payTotal} note={t('dPayOverNote', { open: tot('over').n, late: tot('late').n })} />
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t('agCollect')}</th>
                    <th className="r">{t('payPaid')}</th>
                    <th className="r">{t('payPending')}</th>
                    <th className="r">{t('payOverdue')}</th>
                    <th className="r">{t('payLate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payRows.map((r) => (
                    <tr key={r.m}>
                      <td>{t(r.m === 'agent' ? 'chCollectAgent' : 'chCollectLink')}</td>
                      <td className="r num">{r.ok.n}</td>
                      <td className="r num">{r.wait.n}</td>
                      <td className={`r num${r.over.n ? ' bad-text' : ''}`}>{r.over.n}</td>
                      <td className="r num">{r.late.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('dRenewal')}</h3>
            <p className="hint">{t('dRenewalLead')}</p>
          </div>
          <div className="ren-legend" aria-hidden="true">
            {REN_STATES.map(([st, k]) => (
              <span key={st}><i className={`ren-${st}`} />{t(k)}</span>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data ren-table">
            <thead>
              <tr>
                <th>{t('dRenewalDue')}</th>
                <th className="r">{t('colCases')}</th>
                <th className="ren-bar-col">{t('dRenewalMix')}</th>
                {REN_STATES.map(([st, k]) => (
                  <th key={st} className="r">{t(k)}</th>
                ))}
                <th className="r">{t('dRenewalRate')}</th>
                <th className="r">{t('premium')}</th>
              </tr>
            </thead>
            <tbody>
              {ren.map((r) => (
                <tr key={r.b}>
                  <td>{t(r.label)}</td>
                  <td className="r num">{r.list.length}</td>
                  <td className="ren-bar-col">
                    <div className="ren-bar" aria-hidden="true">
                      {REN_STATES.map(([st]) => (
                        <span key={st} className={`ren-${st}`} style={{ width: `${r.list.length ? (r.count(st) / r.list.length) * 100 : 0}%` }} />
                      ))}
                    </div>
                  </td>
                  {REN_STATES.map(([st]) => (
                    <td key={st} className="r num">{r.count(st)}</td>
                  ))}
                  <td className="r num"><b>{r.list.length ? `${fmtNum(r.rate * 100, lang, 0)}%` : '—'}</b></td>
                  <td className="r num">{fmtBaht(Math.round(r.premium), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PayTile({ tone, label, n, v, total, note }: { tone: string; label: string; n: number; v: number; total: number; note?: string }) {
  const { lang } = useT();
  return (
    <div className={`pay-tile tone-${tone}`}>
      <div className="eyebrow">{label}</div>
      <div className="pay-big num">{fmtNum(n, lang)} <span className="muted">/ {fmtNum(total, lang)}</span></div>
      <div className="hint num">{fmtBaht(Math.round(v), lang)}</div>
      {note && <div className="hint">{note}</div>}
    </div>
  );
}
