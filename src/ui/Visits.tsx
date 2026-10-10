import { useEffect, useMemo, useState } from 'react';
import type { Agent, CoverageType, Visit } from '../types';
import { mktById } from '../data/agents';
import { COVERAGE_TYPES } from '../data/packages';
import { COVERAGE_LABEL, fmtBaht, fmtDate, fmtDateTime, fmtNum, useT } from '../i18n';
import { addVisit, useStore } from '../store';
import { last13Months, rolling12 } from '../lib/history';
import { ach, addRow, lossRatio, perfCells, renewRate, zeroRow, type PerfRow } from '../lib/perf';
import { DAY_MS, bkkParts, bkkTime, dayKey, monthKey, startOfBkkDay } from '../lib/time';
import { ClusteredBarChart } from './charts';
import { useNow, DateInput } from './common';
import { agentStats } from './Marketing';
import { productName } from './Products';

const dateLong = (t: number, lang: 'th' | 'en') => fmtDate(t, lang, { day: 'numeric', month: 'short', year: 'numeric' });
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const fromDateInput = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return bkkTime(y, m - 1, d, 12);
};

/** Latest visit and the next appointment for a partner. */
export function visitInfo(visits: Visit[], agentId: string) {
  const mine = visits.filter((v) => v.agentId === agentId).sort((x, y) => y.at - x.at);
  const last = mine[0];
  // The appointment made at the latest visit; a later visit without one means none is booked.
  return { last, next: last?.nextAt, count: mine.length };
}

export function NextVisit({ at, now }: { at?: number; now: number }) {
  const { t, lang } = useT();
  if (at === undefined) return <span className="muted">{t('vsNoNext')}</span>;
  const days = Math.round((startOfBkkDay(at) - startOfBkkDay(now)) / DAY_MS);
  const tone = days < 0 ? 'bad' : days <= 7 ? 'warn' : 'neutral';
  return (
    <span>
      <span className="num">{dateLong(at, lang)}</span>{' '}
      <span className={`pill tone-${tone}`}>{days < 0 ? t('vsOverdue', { n: -days }) : days === 0 ? t('vsToday') : t('vsInDays', { n: days })}</span>
    </span>
  );
}

/** Marketing tab: partners with last/next visit, the report and the visit log. */
export function VisitTab({ agents, mktId }: { agents: Agent[]; mktId: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(60000);
  const [reportId, setReportId] = useState<string | null>(null);
  const [record, setRecord] = useState<{ a: Agent; topics: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, string>>({});
  const cell = useMemo(() => perfCells(s, now), [s, now]);
  const thisMonth = monthKey(now);
  const ids = new Set(agents.map((a) => a.id));
  const history = s.visits.filter((v) => ids.has(v.agentId));
  // Look the partner up on every render so a target changed elsewhere shows straight away.
  const report = reportId ? s.agents.find((a) => a.id === reportId) ?? null : null;

  if (report)
    return (
      <>
        <VisitReport
          a={report}
          mktId={mktId}
          topics={topics[report.id] ?? ''}
          setTopics={(v) => setTopics((x) => ({ ...x, [report.id]: v }))}
          onBack={() => setReportId(null)}
          onRecord={() => setRecord({ a: report, topics: topics[report.id] ?? '' })}
        />
        {record && <VisitForm a={record.a} mktId={mktId} topics={record.topics} onClose={() => setRecord(null)} onSaved={(name) => { setRecord(null); setReportId(null); setFlash(t('vfSaved', { name })); }} />}
      </>
    );

  return (
    <>
      {flash && <p className="vs-flash" role="status">✓ {flash}</p>}
      <section className="card">
        <h3>{t('mktTabVisit')}</h3>
        <p className="hint">{t('vsLead')}</p>
        <div className="table-wrap vs-wrap">
          <table className="data vs-table">
            <thead>
              <tr>
                <th>{t('agAgent')}</th>
                <th>{t('vsLast')}</th>
                <th>{t('vsNext')}</th>
                <th className="r">{t('vsAchMonth')}</th>
                <th><span className="sr-only">{t('vsOpenReport')}</span></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const vi = visitInfo(s.visits, a.id);
                const r = cell(a.id, thisMonth);
                return (
                  <tr key={a.id} className={a.active ? '' : 'inactive'}>
                    <td>
                      <b>{a[lang]}</b>
                      <div className="hint">{a.code} · {a.province}</div>
                    </td>
                    <td>
                      {vi.last ? (
                        <>
                          <span className="num">{dateLong(vi.last.at, lang)}</span>
                          <div className="hint vs-clip">{vi.last.outcome}</div>
                        </>
                      ) : (
                        <span className="muted">{t('vsNever')}</span>
                      )}
                    </td>
                    <td><NextVisit at={vi.next} now={now} /></td>
                    <td className={`r num${r.target && ach(r) < 0.8 ? ' bad-text' : ''}`}>{r.target ? `${fmtNum(ach(r) * 100, lang, 0)}%` : '—'}</td>
                    <td>
                      <div className="vs-actions">
                        <button type="button" className="btn small primary" onClick={() => setReportId(a.id)}>📄 {t('vsOpenReport')}</button>
                        <button type="button" className="btn small" onClick={() => setRecord({ a, topics: topics[a.id] ?? '' })}>{t('vsRecord')}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>{t('vsHistory')}</h3>
        <p className="hint">{t('vsHistoryLead')}</p>
        <VisitList visits={history} />
      </section>
      {record && <VisitForm a={record.a} mktId={mktId} topics={record.topics} onClose={() => setRecord(null)} onSaved={(name) => { setRecord(null); setFlash(t('vfSaved', { name })); }} />}
    </>
  );
}

export function VisitList({ visits, limit }: { visits: Visit[]; limit?: number }) {
  const { t, lang } = useT();
  const s = useStore();
  const shown = limit ? visits.slice(0, limit) : visits;
  if (!shown.length) return <p className="muted">{t('vsNoHistory')}</p>;
  return (
    <ul className="vs-list">
      {shown.map((v) => {
        const a = s.agents.find((x) => x.id === v.agentId);
        return (
          <li key={v.id}>
            <div className="vs-when num">{dateLong(v.at, lang)}</div>
            <div>
              <b>{a?.[lang] ?? v.agentId}</b> <span className="muted">· {t('vsBy', { name: mktById(v.mktId)?.[lang] ?? '—' })}</span>
              <p>{v.outcome}</p>
              {v.topics.length > 0 && <div className="hint">{t('vsTopicsShort')}: {v.topics.join(' · ')}</div>}
              {v.nextAt !== undefined && <div className="hint">{t('vsNext')}: <span className="num">{dateLong(v.nextAt, lang)}</span></div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function VisitForm({ a, mktId, topics, onClose, onSaved }: { a: Agent; mktId: string; topics: string; onClose: () => void; onSaved: (name: string) => void }) {
  const { t, lang } = useT();
  const [date, setDate] = useState(() => dayKey(Date.now()));
  const [tp, setTp] = useState(topics);
  const [outcome, setOutcome] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const save = () => {
    if (!outcome.trim() || !date || (next && next < date)) return setErr(true);
    addVisit({ agentId: a.id, mktId: mktId === 'all' ? a.mktId : mktId, at: fromDateInput(date), topics: lines(tp), outcome: outcome.trim(), nextAt: next ? fromDateInput(next) - 2 * 3600_000 : undefined });
    onSaved(a[lang]);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal vs-form" role="dialog" aria-modal="true" aria-label={t('vfTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('vfTitle')} · {a[lang]}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>✕</button>
        </div>
        <div className="vs-form-grid">
          <label htmlFor="vf-date">{t('vfDate')}</label>
          <DateInput id="vf-date" value={date} max={dayKey(Date.now())} onChange={(v) => setDate(v)} />
          <label htmlFor="vf-topics">{t('vfTopics')}</label>
          <textarea id="vf-topics" rows={3} value={tp} onChange={(e) => setTp(e.target.value)} />
          <label htmlFor="vf-outcome">{t('vfOutcome')} *</label>
          <div>
            <textarea id="vf-outcome" rows={4} value={outcome} placeholder={t('vfOutcomePh')} aria-invalid={err && !outcome.trim()} onChange={(e) => setOutcome(e.target.value)} />
            {err && !outcome.trim() && <div className="vs-err" role="alert">{t('vfNeedOutcome')}</div>}
          </div>
          <label htmlFor="vf-next">{t('vfNext')}</label>
          <div>
            <DateInput id="vf-next" value={next} min={date} invalid={err && !!next && next < date} onChange={(v) => setNext(v)} />
            {err && next && next < date ? <div className="vs-err" role="alert">{t('vfNextBefore')}</div> : <div className="hint">{t('vfNextHint')}</div>}
          </div>
        </div>
        <div className="vs-form-foot">
          <button type="button" className="btn ghost" onClick={onClose}>{t('vfCancel')}</button>
          <button type="button" className="btn primary" onClick={save}>{t('vfSave')}</button>
        </div>
      </div>
    </div>
  );
}

/** The two-page A4 report a marketing officer prints before visiting a partner (internal: all figures). */
function VisitReport({ a, mktId, topics, setTopics, onBack, onRecord }: { a: Agent; mktId: string; topics: string; setTopics: (v: string) => void; onBack: () => void; onRecord: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(60000);
  const cell = useMemo(() => perfCells(s, now), [s, now]);
  const p = bkkParts(now);
  const thisMonth = monthKey(now);
  const months = rolling12(now);
  const ytdKeys = last13Months(now).map((m) => m.key).filter((k) => k.startsWith(`${p.y}-`));
  const sum = (id: string, keys: string[]) => keys.reduce((acc, k) => addRow(acc, cell(id, k)), zeroRow());
  const cols: { key: string; label: string; r: PerfRow; keys: string[] }[] = [
    { key: 'm', label: t('vrColMonth'), r: cell(a.id, thisMonth), keys: [thisMonth] },
    { key: 'ytd', label: t('vrColYtd'), r: sum(a.id, ytdKeys), keys: ytdKeys },
    { key: 'r12', label: t('vrColR12'), r: sum(a.id, months.map((m) => m.key)), keys: months.map((m) => m.key) },
  ];
  const peers = s.agents.filter((x) => x.active || x.id === a.id);
  const rank = (keys: string[]) => {
    const order = peers.map((x) => ({ id: x.id, v: ach(sum(x.id, keys)) })).sort((x, y) => y.v - x.v);
    return order.findIndex((x) => x.id === a.id) + 1;
  };
  const month = cols[0].r;
  const r12 = cols[2].r;
  const monthStart = bkkTime(p.y, p.mo, 1);
  const mtd = agentStats(a, s.cases, s.proposals, monthStart, now);
  const d90 = agentStats(a, s.cases, s.proposals, now - 90 * DAY_MS, now);
  const gap = Math.max(0, a.target - month.gwp);
  const lr = lossRatio(r12);
  const lrTone = lr <= 0.55 ? 'good' : lr <= 0.7 ? 'warn' : 'bad';

  // Sales detail from the issued policies (year to date, as far as the system has them).
  const yearStart = bkkTime(p.y, 0, 1);
  const sold = s.cases.filter((c) => c.agentId === a.id && c.stamps.issued !== undefined && c.stamps.issued >= yearStart && c.stamps.issued <= now);
  const firstSale = sold.reduce((m, c) => Math.min(m, c.stamps.issued!), now);
  const totGwp = sold.reduce((x, c) => x + (c.premium ?? 0), 0);
  const byClass = [...COVERAGE_TYPES, 'TRV' as const, 'PA' as const].map((ct: CoverageType) => {
    const cs = sold.filter((c) => c.coverage === ct);
    const gwp = cs.reduce((x, c) => x + (c.premium ?? 0), 0);
    return { ct, n: cs.length, gwp };
  }).filter((x) => x.n > 0);
  const pkgMap = new Map<string, { name: string; ct: CoverageType; n: number; gwp: number }>();
  for (const c of sold) {
    const name = c.pkg ? productName({ nameTh: c.pkg.nameTh, nameEn: c.pkg.nameEn, type: c.coverage }, lang) : COVERAGE_LABEL[lang][c.coverage];
    const k = `${c.coverage}|${name}`;
    const cur = pkgMap.get(k) ?? { name, ct: c.coverage, n: 0, gwp: 0 };
    pkgMap.set(k, { ...cur, n: cur.n + 1, gwp: cur.gwp + (c.premium ?? 0) });
  }
  const topPkg = [...pkgMap.values()].sort((x, y) => y.gwp - x.gwp).slice(0, 5);
  // New business vs renewals, year to date, from the same figures as the summary table.
  const ytd = cols[1].r;
  const renGwp = Math.min(ytd.renewGwp, ytd.gwp);
  const nr = [
    { key: 'new', label: t('vrNew'), n: Math.max(0, ytd.policies - ytd.renewed), gwp: ytd.gwp - renGwp },
    { key: 'ren', label: t('vrRenewal'), n: ytd.renewed, gwp: renGwp },
  ];
  const vi = visitInfo(s.visits, a.id);
  const officer = mktById(mktId === 'all' ? a.mktId : mktId) ?? mktById(a.mktId);
  const pct = (v: number) => `${fmtNum(v * 100, lang, 0)}%`;
  const topicList = lines(topics);

  useEffect(() => {
    document.body.classList.add('vr-open');
    return () => document.body.classList.remove('vr-open');
  }, []);

  const head = (n: number) => (
    <header className="vr-head">
      <div className="vr-brand">
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M16 3 5 7v8c0 7 4.7 12 11 14 6.3-2 11-7 11-14V7L16 3Z" fill="var(--accent)" /><path d="M10.5 18.5h11l-1.4-4.2a2 2 0 0 0-1.9-1.3h-4.4a2 2 0 0 0-1.9 1.3L10.5 18.5Zm0 0v2.5m11-2.5v2.5" stroke="var(--accent-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div>
          <b>{t('appName')}</b>
          <div className="vr-title">{t('vrTitle')}</div>
        </div>
      </div>
      <div className="vr-meta">
        <span className="pill tone-warn">{t('vrInternal')}</span>
        <div className="hint">{t('vrPage', { n })}</div>
      </div>
    </header>
  );
  const foot = <footer className="vr-foot">{t('vrPrinted', { at: fmtDateTime(now, lang), name: officer?.[lang] ?? '—' })}</footer>;

  return (
    <div className="vr-wrap">
      <div className="vr-tools no-print">
        <button type="button" className="btn ghost small" onClick={onBack}>← {t('vrBack')}</button>
        <div className="vr-topics-edit">
          <label htmlFor="vr-topics">{t('vrTopicsLabel')}</label>
          <textarea id="vr-topics" rows={3} value={topics} placeholder={t('vrTopicsPh')} onChange={(e) => setTopics(e.target.value)} />
          <span className="hint">{t('vrTopicsHint')}</span>
        </div>
        <div className="vr-tool-btns">
          <button type="button" className="btn primary" onClick={() => window.print()}>🖨 {t('vrPrint')}</button>
          <button type="button" className="btn" onClick={onRecord}>{t('vsRecord')}</button>
        </div>
      </div>

      <article className="vr-page" aria-label={`${t('vrTitle')} ${a[lang]} 1`}>
        {head(1)}
        <section className="vr-partner">
          <div>
            <h2>{a[lang]}</h2>
            <div className="hint">{a.code} · {t(a.kind === 'company' ? 'agCompany' : 'agPerson')} · {t('agLicense')} {a.license} · {a.province}</div>
          </div>
          <dl>
            {a.kind === 'company' && <div><dt>{t('vrContact')}</dt><dd>{lang === 'th' ? a.contactTh : a.contactEn}</dd></div>}
            <div><dt>{t('agContact')}</dt><dd className="num">{a.phone} · LINE {a.line}</dd></div>
            <div><dt>{t('vrMarketing')}</dt><dd>{mktById(a.mktId)?.[lang]}</dd></div>
            <div><dt>{t('agTarget')}</dt><dd className="num">{fmtBaht(a.target, lang)}</dd></div>
          </dl>
        </section>

        <section className="vr-kpis">
          <div className="vr-kpi">
            <div className="eyebrow">{t('vrKpiGwp')}</div>
            <div className="vr-kpi-v num">{fmtBaht(Math.round(month.gwp), lang)}</div>
            <div className="vr-meter" aria-hidden="true"><span className={ach(month) >= 1 ? 'good' : ''} style={{ width: `${Math.min(100, ach(month) * 100)}%` }} /></div>
            <div className="hint">{month.target ? t('vrKpiGwpFoot', { pct: fmtNum(ach(month) * 100, lang, 0) }) : '—'}</div>
            {a.target > 0 && <div className="hint">{gap ? t('vrKpiGap', { v: fmtBaht(Math.round(gap), lang) }) : t('vrKpiHit')}</div>}
          </div>
          <div className="vr-kpi">
            <div className="eyebrow">{t('vrKpiPolicies')}</div>
            <div className="vr-kpi-v num">{fmtNum(month.policies, lang)}</div>
            <div className="hint">{t('vrKpiCom', { v: fmtBaht(Math.round(mtd.commission), lang) })}</div>
          </div>
          <div className="vr-kpi">
            <div className="eyebrow">{t('vrKpiRenew')}</div>
            <div className="vr-kpi-v num">{pct(renewRate(r12))}</div>
            <div className="hint">{t('vrKpiRenewFoot', { a: r12.renewed, b: r12.renewDue })}</div>
          </div>
          <div className="vr-kpi">
            <div className="eyebrow">{t('vrKpiClose')}</div>
            <div className="vr-kpi-v num">{d90.offers ? pct(d90.close) : '—'}</div>
            <div className="hint">{t('vrKpiCloseFoot', { a: d90.accepted, b: d90.offers })}</div>
          </div>
          <div className="vr-kpi">
            <div className="eyebrow">{t('vrKpiLr')}</div>
            <div className={`vr-kpi-v num lr-${lrTone}`}>{pct(lr)}</div>
            <div className="hint">{t(lrTone === 'good' ? 'lrGood' : lrTone === 'warn' ? 'lrWatch' : 'lrHigh')}</div>
          </div>
        </section>

        <section>
          <h3 className="vr-h">{t('vrSummary')}</h3>
          <table className="vr-table">
            <thead>
              <tr>
                <th />
                {cols.map((c) => <th key={c.key} className="r">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><th>{t('vrTarget')}</th>{cols.map((c) => <td key={c.key} className="r num">{fmtBaht(c.r.target, lang)}</td>)}</tr>
              <tr><th>{t('vrActual')}</th>{cols.map((c) => <td key={c.key} className="r num"><b>{fmtBaht(Math.round(c.r.gwp), lang)}</b></td>)}</tr>
              <tr><th>{t('vrAch')}</th>{cols.map((c) => <td key={c.key} className={`r num${c.r.target && ach(c.r) < 0.8 ? ' bad-text' : ''}`}><b>{c.r.target ? pct(ach(c.r)) : '—'}</b></td>)}</tr>
              <tr><th>{t('vrPolicies')}</th>{cols.map((c) => <td key={c.key} className="r num">{fmtNum(c.r.policies, lang)}</td>)}</tr>
              <tr><th>{t('vrRenew')}</th>{cols.map((c) => <td key={c.key} className="r num">{c.r.renewDue ? `${pct(renewRate(c.r))} (${c.r.renewed}/${c.r.renewDue})` : '—'}</td>)}</tr>
              <tr><th>{t('vrRenewGwp')}</th>{cols.map((c) => <td key={c.key} className="r num">{fmtBaht(Math.round(c.r.renewGwp), lang)}</td>)}</tr>
              <tr><th>{t('vrLr')}</th>{cols.map((c) => <td key={c.key} className="r num">{pct(lossRatio(c.r))}</td>)}</tr>
              <tr><th>{t('vrRank')}</th>{cols.map((c) => <td key={c.key} className="r num">{t('vrRankOf', { n: rank(c.keys), of: peers.length })}</td>)}</tr>
            </tbody>
          </table>
        </section>

        <section className="vr-chart">
          <h3 className="vr-h">{t('vrTrend')} <span className="hint">· {t('vrTrendHint')}</span></h3>
          <ClusteredBarChart
            series={[{ key: 'gwp', label: t('vrActual'), color: 'var(--accent)', values: months.map((m) => cell(a.id, m.key).gwp) }]}
            labels={months.map((m) => fmtDate(m.at, lang, { month: 'short' }))}
            full={months.map((m) => fmtDate(m.at, lang, { month: 'long', year: 'numeric' }))}
            format={(v) => fmtBaht(Math.round(v), lang)}
            formatAxis={(v) => (v >= 1000 ? `${fmtNum(v / 1000, lang, 0)}k` : fmtNum(v, lang))}
            height={200}
            ariaLabel={t('vrTrend')}
            refLine={{ value: a.target, label: t('vrTarget') }}
          />
        </section>
        {foot}
      </article>

      <article className="vr-page" aria-label={`${t('vrTitle')} ${a[lang]} 2`}>
        {head(2)}
        <section>
          <h3 className="vr-h">{t('vrByClass')}</h3>
          <p className="hint">{t('vrByClassHint', { from: dateLong(sold.length ? firstSale : yearStart, lang), to: dateLong(now, lang) })}</p>
          {byClass.length === 0 ? (
            <p className="muted">{t('vrNoSales')}</p>
          ) : (
            <table className="vr-table">
              <thead>
                <tr>
                  <th>{t('vrClass')}</th>
                  <th className="r">{t('vrPolicies')}</th>
                  <th className="r">{t('vrActual')}</th>
                  <th className="vr-share-col">{t('vrShare')}</th>
                  <th className="r">{t('vrAvg')}</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map((x) => (
                  <tr key={x.ct}>
                    <th>{COVERAGE_LABEL[lang][x.ct]}</th>
                    <td className="r num">{fmtNum(x.n, lang)}</td>
                    <td className="r num">{fmtBaht(Math.round(x.gwp), lang)}</td>
                    <td className="vr-share-col">
                      <div className="vr-bar" aria-hidden="true"><span style={{ width: `${totGwp ? (x.gwp / totGwp) * 100 : 0}%` }} /></div>
                      <span className="num">{pct(totGwp ? x.gwp / totGwp : 0)}</span>
                    </td>
                    <td className="r num">{fmtBaht(Math.round(x.gwp / x.n), lang)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>{t('vrTotal')}</th>
                  <td className="r num"><b>{fmtNum(sold.length, lang)}</b></td>
                  <td className="r num"><b>{fmtBaht(Math.round(totGwp), lang)}</b></td>
                  <td className="vr-share-col num">100%</td>
                  <td className="r num">{fmtBaht(Math.round(totGwp / Math.max(1, sold.length)), lang)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <div className="vr-2col">
          <section>
            <h3 className="vr-h">{t('vrTopPkg')}</h3>
            {topPkg.length === 0 ? (
              <p className="muted">{t('vrNoSales')}</p>
            ) : (
              <table className="vr-table">
                <thead>
                  <tr><th>{t('vrPackage')}</th><th className="r">{t('vrPolicies')}</th><th className="r">{t('vrActual')}</th></tr>
                </thead>
                <tbody>
                  {topPkg.map((x) => (
                    <tr key={`${x.ct}|${x.name}`}>
                      <td>{x.name}</td>
                      <td className="r num">{fmtNum(x.n, lang)}</td>
                      <td className="r num">{fmtBaht(Math.round(x.gwp), lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section>
            <h3 className="vr-h">{t('vrNewRenew')} <span className="hint">· {t('vrColYtd')}</span></h3>
            <div className="vr-split" aria-hidden="true">
              {nr.map((x) => <span key={x.key} className={`vr-split-${x.key}`} style={{ flexGrow: x.gwp || 0.0001 }} />)}
            </div>
            <table className="vr-table">
              <tbody>
                {nr.map((x) => (
                  <tr key={x.key}>
                    <th><i className={`vr-sw vr-split-${x.key}`} aria-hidden="true" /> {x.label}</th>
                    <td className="r num">{fmtNum(x.n, lang)}</td>
                    <td className="r num">{fmtBaht(Math.round(x.gwp), lang)}</td>
                    <td className="r num">{pct(ytd.gwp ? x.gwp / ytd.gwp : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">{t('vrRenewBook', { due: r12.renewDue, done: r12.renewed, pct: fmtNum(renewRate(r12) * 100, lang, 0), gwp: fmtBaht(Math.round(r12.renewGwp), lang) })}</p>
          </section>
        </div>

        <section className="vr-topics">
          <h3 className="vr-h">{t('vrTopics')}</h3>
          {topicList.length ? (
            <ol>{topicList.map((x, i) => <li key={i}>{x}</li>)}</ol>
          ) : (
            <p className="muted">{t('vrNoTopics')}</p>
          )}
        </section>

        <section className="vr-last">
          <h3 className="vr-h">{t('vrLastVisit')}</h3>
          {vi.last ? (
            <div>
              <div className="hint"><span className="num">{dateLong(vi.last.at, lang)}</span> · {t('vsBy', { name: mktById(vi.last.mktId)?.[lang] ?? '—' })}</div>
              <p>{vi.last.outcome}</p>
              {vi.next !== undefined && <div className="hint">{t('vsNext')}: <span className="num">{dateLong(vi.next, lang)}</span></div>}
            </div>
          ) : (
            <p className="muted">{t('vsNever')}</p>
          )}
        </section>
        {foot}
      </article>
    </div>
  );
}
