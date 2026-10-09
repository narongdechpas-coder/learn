import { useMemo, useState } from 'react';
import type { Case, CoverageType, DocKey, Status } from '../types';
import { STAFF, modelOfVehicle, staffById, vehicleText } from '../data/vehicles';
import { COVERAGE_TYPES, REQUIRED_DOCS, estimateQuote } from '../data/packages';
import { COVERAGE_LABEL, DOC_LABEL, SLA_LABEL, STATUS_LABEL, fmtBaht, fmtDate, fmtDateTime, usageText, useT, type TKey } from '../i18n';
import {
  acceptCase,
  markLeadContacted,
  addNote,
  assignCase,
  cancelCase,
  docsMissing,
  issuePolicy,
  markNotificationsRead,
  requestReupload,
  sendQuote,
  totalPremium,
  useStore,
} from '../store';
import { SLA_KEYS, slaFor } from '../lib/sla';
import { BizClock, CaseSla, Field, SOURCE_KEY, SlaChip, StatusPill, TypeTag, useNow } from './common';
import { useFileUrl } from './Customer';
import { AGENTS, caseCommission, mktById, payInfo, settled } from '../data/agents';
import { PAY_TONE, payKey } from './Agent';
import { recordRemit } from '../store';

const agentById = (id?: string) => AGENTS.find((a) => a.id === id);
const byName = (by: string, lang: 'th' | 'en') => staffById(by)?.[lang] ?? agentById(by)?.[lang] ?? (by.startsWith('m') && by.length <= 3 ? mktById(by)?.[lang] : by);

const OPEN: Status[] = ['NEW', 'AWAITING_PAYMENT', 'ACCEPTED', 'QUOTED', 'AWAITING_DOCS', 'DOCS_REVIEW'];
const STATUSES: Status[] = [...OPEN, 'ISSUED', 'CANCELLED'];

export function BackOffice({
  staffId,
  setStaffId,
  focusId,
  setFocusId,
  compact = false,
}: {
  staffId: string;
  setStaffId: (id: string) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  compact?: boolean;
}) {
  const { t, lang } = useT();
  const s = useStore();
  const now = useNow(15000);
  const [status, setStatus] = useState<'open' | 'all' | Status>('open');
  const [type, setType] = useState<'all' | CoverageType>('all');
  const [owner, setOwner] = useState<string>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const [bellOpen, setBellOpen] = useState(false);
  const [tab, setTab] = useState<'cases' | 'leads' | 'remit'>('cases');
  const [channel, setChannel] = useState('all');
  const openLeads = s.leads.filter((l) => !l.caseId && !l.contacted).length;
  const remitDue = s.cases.filter((c) => c.collect === 'agent' && c.stamps.issued && !c.remittedAt && payInfo(c, now)?.state === 'overdue').length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.cases
      .filter((c) => (status === 'open' ? OPEN.includes(c.status) : status === 'all' ? true : c.status === status))
      .filter((c) => type === 'all' || c.coverage === type)
      .filter((c) => owner === 'all' || (owner === 'none' ? !c.assignee : c.assignee === owner))
      .filter((c) => channel === 'all' || (channel === 'direct' ? !c.agentId : channel === 'agent' ? !!c.agentId : c.agentId === channel))
      .filter((c) => !needle || `${c.id} ${c.customer.firstName} ${c.customer.lastName} ${c.customer.plate}`.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [s.cases, status, type, owner, q, channel]);

  const counts = useMemo(() => {
    const m: Partial<Record<Status, number>> = {};
    for (const c of s.cases) m[c.status] = (m[c.status] ?? 0) + 1;
    return m;
  }, [s.cases]);
  const openCount = OPEN.reduce((n, k) => n + (counts[k] ?? 0), 0);
  const unread = s.notifications.filter((n) => !n.read).length;
  const focus = focusId ? s.cases.find((c) => c.id === focusId) : undefined;

  return (
    <div className={`backoffice${compact ? ' compact' : ''}`}>
      <div className="bo-head">
        <div>
          <h2>{t('inbox')}</h2>
          <div className="bo-sub">
            <span className="count-badge num">{openCount}</span> {t('open')} · <span className="num">{counts.NEW ?? 0}</span> {STATUS_LABEL[lang].NEW}
            <BizClock now={now} />
          </div>
        </div>
        <div className="bo-tools">
          <label className="inline-field" htmlFor="work-as">
            <span>{t('workAs')}</span>
            <select id="work-as" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {STAFF.map((x) => (
                <option key={x.id} value={x.id}>{x[lang]}</option>
              ))}
            </select>
          </label>
          <div className="bell-wrap">
            <button
              type="button"
              className={`bell${unread ? ' ring' : ''}`}
              aria-label={`${t('notifications')} (${unread})`}
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
              </svg>
              {unread > 0 && <span className="bell-count num">{unread > 99 ? '99+' : unread}</span>}
            </button>
            {bellOpen && (
              <div className="bell-menu" role="dialog" aria-label={t('notifications')}>
                <div className="bell-menu-head">
                  <b>{t('notifications')}</b>
                  <button type="button" className="link" onClick={() => markNotificationsRead()}>{t('markRead')}</button>
                </div>
                {s.notifications.length === 0 ? (
                  <p className="muted pad">{t('noNotif')}</p>
                ) : (
                  <ul>
                    {s.notifications.slice(0, 30).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`notif kind-${n.kind}${n.read ? '' : ' unread'}`}
                          onClick={() => {
                            if (n.kind === 'lead') setTab('leads');
                            else if (n.kind === 'remit') setTab('remit');
                            else {
                              setTab('cases');
                              setFocusId(n.caseId);
                            }
                            setBellOpen(false);
                            markNotificationsRead();
                          }}
                        >
                          <span>{notifText(n, lang, t)}</span>
                          <span className="muted num">{fmtDateTime(n.at, lang)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="subtabs bo-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'cases'} className={tab === 'cases' ? 'on' : ''} onClick={() => setTab('cases')}>{t('tabCases')}</button>
        <button role="tab" aria-selected={tab === 'leads'} className={tab === 'leads' ? 'on' : ''} onClick={() => setTab('leads')}>
          {t('tabLeads')} {openLeads > 0 && <span className="nav-badge num">{openLeads}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'remit'} className={tab === 'remit' ? 'on' : ''} onClick={() => setTab('remit')}>
          {t('tabRemit')} {remitDue > 0 && <span className="nav-badge num">{remitDue}</span>}
        </button>
      </div>

      {tab === 'leads' ? <LeadsList /> : tab === 'remit' ? <RemitList staffId={staffId} now={now} onOpen={(id) => { setTab('cases'); setFocusId(id); }} /> : (<>
      <div className="filters">
        <label htmlFor="bo-q" className="sr-only">{t('searchCase')}</label>
        <input id="bo-q" className="search" placeholder={t('searchCase')} value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }} />
        <select id="bo-status" aria-label={t('filterStatus')} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setLimit(30); }}>
          <option value="open">{t('open')} ({openCount})</option>
          <option value="all">{t('filterAll')} ({s.cases.length})</option>
          {STATUSES.map((x) => (
            <option key={x} value={x}>{STATUS_LABEL[lang][x]} ({counts[x] ?? 0})</option>
          ))}
        </select>
        <select id="bo-type" aria-label={t('filterType')} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">{t('filterType')}: {t('filterAll')}</option>
          {COVERAGE_TYPES.map((x) => (
            <option key={x} value={x}>{COVERAGE_LABEL[lang][x]}</option>
          ))}
        </select>
        <select id="bo-channel" aria-label={t('filterChannel')} value={channel} onChange={(e) => { setChannel(e.target.value); setLimit(30); }}>
          <option value="all">{t('filterChannel')}: {t('filterAll')}</option>
          <option value="direct">{t('chDirect')}</option>
          <option value="agent">{t('chAgent')}</option>
          {s.agents.map((a) => (
            <option key={a.id} value={a.id}>· {a[lang]}</option>
          ))}
        </select>
        <select id="bo-owner" aria-label={t('filterStaff')} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="all">{t('filterStaff')}: {t('filterAll')}</option>
          <option value="none">{t('unassigned')}</option>
          {STAFF.map((x) => (
            <option key={x.id} value={x.id}>{x[lang]}</option>
          ))}
        </select>
      </div>

      <div className="bo-body">
        <div className="case-list">
          {filtered.length === 0 ? (
            <p className="muted pad">{t('emptyFilter')}</p>
          ) : (
            <>
              <ul>
                {filtered.slice(0, limit).map((c) => (
                  <li key={c.id}>
                    <button type="button" className={`case-row${c.id === focusId ? ' on' : ''}${c.status === 'NEW' ? ' is-new' : ''}`} onClick={() => setFocusId(c.id)}>
                      <div className="cr-top">
                        <span className="num ref">{c.id}</span>
                        <StatusPill status={c.status} />
                      </div>
                      <div className="cr-mid">
                        <b>{c.customer.firstName} {c.customer.lastName}</b>
                        <span className="muted">{vehicleText(c.vehicle)}</span>
                      </div>
                      <div className="cr-bot">
                        <TypeTag type={c.coverage} />
                        <span className={`src src-${c.source}`}>{t(SOURCE_KEY[c.source])}</span>
                        {c.agentId && <span className="src src-agent" title={agentById(c.agentId)?.[lang]}>{t('chAgentShort', { code: agentById(c.agentId)?.code ?? '' })}</span>}
                        <span className="muted num">{fmtDateTime(c.createdAt, lang)}</span>
                        <span className="cr-owner muted">{staffById(c.assignee)?.[lang] ?? t('unassigned')}</span>
                        {OPEN.includes(c.status) && <CaseSla c={c} now={now} />}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="list-foot">
                <span className="muted">{t('showing', { n: Math.min(limit, filtered.length), total: filtered.length })}</span>
                {limit < filtered.length && (
                  <button className="btn small" type="button" onClick={() => setLimit((l) => l + 30)}>{t('more')}</button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="case-detail-wrap">
          {focus ? <CaseDetail key={focus.id} c={focus} staffId={staffId} now={now} onClose={() => setFocusId(null)} /> : <p className="muted pad center-text">{t('selectCase')}</p>}
        </div>
      </div>
      </>)}
    </div>
  );
}

function LeadsList() {
  const { t, lang } = useT();
  const s = useStore();
  const [limit, setLimit] = useState(30);
  const leads = s.leads;
  return (
    <div className="leads">
      <p className="lead">{t('leadsLead')}</p>
      <div className="table-wrap card">
        <table className="data leads-table">
          <thead>
            <tr>
              <th>{t('colCreated')}</th>
              <th>{t('colContact')}</th>
              <th>{t('colCar')}</th>
              <th className="r">{t('colFrom')}</th>
              <th>{t('colStatus')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.slice(0, limit).map((l) => (
              <tr key={l.id}>
                <td className="num">{fmtDateTime(l.at, lang)}</td>
                <td className="num">{l.contact}</td>
                <td>{vehicleText(l.vehicle)}</td>
                <td className="r num">{fmtBaht(l.fromPrice, lang)}</td>
                <td>
                  {l.caseId ? (
                    <span className="pill tone-good">{t('leadConverted')} · <span className="ref">{l.caseId}</span></span>
                  ) : l.contacted ? (
                    <span className="pill tone-neutral">{t('leadContacted')}</span>
                  ) : (
                    <span className="pill tone-wait">{t('leadNew')}</span>
                  )}
                </td>
                <td>{!l.caseId && !l.contacted && <button type="button" className="btn small" onClick={() => markLeadContacted(l.id)}>{t('markContacted')}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="list-foot">
        <span className="muted">{t('showing', { n: Math.min(limit, leads.length), total: leads.length })}</span>
        {limit < leads.length && <button className="btn small" type="button" onClick={() => setLimit((x) => x + 30)}>{t('more')}</button>}
      </div>
    </div>
  );
}

export function notifText(n: { kind: string; caseId: string; params?: Record<string, string | number> }, lang: 'th' | 'en', t: (k: TKey, p?: Record<string, string | number>) => string) {
  const ref = n.caseId;
  switch (n.kind) {
    case 'new':
      return t('nNew', { ref, source: t(SOURCE_KEY[(n.params?.source as 'quote') ?? 'package']) }) + (n.params?.agent ? ` · ${agentById(String(n.params.agent))?.[lang] ?? ''}` : '');
    case 'remit':
      return t('nRemit', { ref, agent: agentById(String(n.params?.agent ?? ''))?.[lang] ?? '' });
    case 'claim':
      return t('nClaim', { ref, claimNo: String(n.params?.claimNo ?? '') });
    case 'lead':
      return t('nLead', { contact: String(n.params?.contact ?? '') });
    case 'self':
      return t('nSelf', { ref, type: COVERAGE_LABEL[lang][(n.params?.type as 'T2P') ?? 'T2P'] });
    case 'confirmed':
      return t('nConfirmed', { ref });
    case 'docs':
      return t('nDocs', { ref });
    case 'declined':
      return t('nDeclined', { ref });
    default:
      return t('nSla', { ref, sla: SLA_LABEL[lang][(n.params?.sla as 'accept') ?? 'accept'] });
  }
}

function CaseDetail({ c, staffId, now, onClose }: { c: Case; staffId: string; now: number; onClose: () => void }) {
  const { t, lang } = useT();
  const model = modelOfVehicle(c.vehicle);
  const suggested = estimateQuote(model, c.vehicle.usage, c.desiredSI ?? c.vehicle.sumInsured, c.coverage);
  const [price, setPrice] = useState<number>(c.quotedPremium ?? suggested);
  const [mode, setMode] = useState<null | 'cancel' | 'reupload'>(null);
  const [reason, setReason] = useState('');
  const [pick, setPick] = useState<DocKey[]>([]);
  const [note, setNote] = useState('');
  const isOpen = OPEN.includes(c.status);
  const total = totalPremium(c);
  const slas = SLA_KEYS.map((k) => slaFor(c, k, now)).filter(Boolean);

  return (
    <article className="case-detail">
      <header className="cd-head">
        <div>
          <div className="eyebrow num">{c.id} · {t(SOURCE_KEY[c.source])}</div>
          <h3>{c.customer.firstName} {c.customer.lastName}</h3>
          <div className="cd-tags">
            <StatusPill status={c.status} />
            <TypeTag type={c.coverage} />
            {c.addCmi && <span className="chip">{t('plusCmi')}</span>}
            {c.vehicle.custom && <span className="pill tone-wait">{t('customCarTag')}</span>}
            {c.callback && c.callback !== 'none' && <span className="pill tone-info">☎ {t('callbackChip', { slot: t(({ asap: 'cbAsap', morning: 'cbMorning', afternoon: 'cbAfternoon', evening: 'cbEvening' } as const)[c.callback]) })}</span>}
            {c.claims?.length ? <span className="pill tone-bad">{t('claimsLabel')} {c.claims.length}</span> : null}
          </div>
        </div>
        <button type="button" className="btn ghost small" onClick={onClose} aria-label="close">×</button>
      </header>

      {slas.length > 0 && (
        <div className="cd-sla">
          {slas.map((r) => (
            <SlaChip key={r!.key} r={r!} />
          ))}
        </div>
      )}

      {isOpen && (
        <div className="cd-actions">
          {c.status === 'NEW' && (
            <button className="btn primary" type="button" onClick={() => acceptCase(c.id, staffId)}>{t('actAccept')}</button>
          )}
          {(c.status === 'ACCEPTED' || c.status === 'QUOTED') && c.source === 'quote' && (
            <div className="quote-box">
              <Field htmlFor={`qp-${c.id}`} label={t('quotePremium')} hint={t('suggested', { price: fmtBaht(suggested, lang) })}>
                <input id={`qp-${c.id}`} type="number" min={0} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </Field>
              <button className="btn primary" type="button" disabled={!(price > 0)} onClick={() => sendQuote(c.id, price, staffId)}>
                {t(c.status === 'QUOTED' ? 'actRequote' : 'actQuote')}
              </button>
            </div>
          )}
          {c.status === 'DOCS_REVIEW' && (
            <>
              <button className="btn primary" type="button" onClick={() => issuePolicy(c.id, staffId)}>{t('actIssue')}</button>
              <button className="btn" type="button" onClick={() => setMode(mode === 'reupload' ? null : 'reupload')}>{t('actReupload')}</button>
            </>
          )}
          {(c.status === 'AWAITING_DOCS' || c.status === 'AWAITING_PAYMENT' || (c.status === 'QUOTED' && c.source === 'quote')) && <span className="muted">⏳ {t('waitCustomer')}</span>}
          <button className="btn ghost danger" type="button" onClick={() => setMode(mode === 'cancel' ? null : 'cancel')}>{t('actCancel')}</button>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="inline-confirm">
          <Field htmlFor={`cr-${c.id}`} label={t('cancelReason')}>
            <input id={`cr-${c.id}`} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="actions">
            <button className="btn danger" type="button" disabled={!reason.trim()} onClick={() => { cancelCase(c.id, reason.trim(), staffId); setMode(null); }}>{t('confirmCancel')}</button>
            <button className="btn ghost" type="button" onClick={() => setMode(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}
      {mode === 'reupload' && (
        <div className="inline-confirm">
          <div className="eyebrow">{t('reuploadPick')}</div>
          <div className="chips-row">
            {REQUIRED_DOCS[c.coverage].map((k) => (
              <label key={k} className="check">
                <input id={`ru-${c.id}-${k}`} type="checkbox" checked={pick.includes(k)} onChange={(e) => setPick((p) => (e.target.checked ? [...p, k] : p.filter((x) => x !== k)))} />
                {DOC_LABEL[lang][k]}
              </label>
            ))}
          </div>
          <Field htmlFor={`rn-${c.id}`} label={t('reuploadNote')}>
            <input id={`rn-${c.id}`} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="actions">
            <button className="btn primary" type="button" disabled={!pick.length} onClick={() => { requestReupload(c.id, pick, reason.trim() || '-', staffId); setMode(null); setPick([]); }}>{t('send')}</button>
            <button className="btn ghost" type="button" onClick={() => setMode(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {c.agentId && <AgentBox c={c} staffId={staffId} now={now} />}

      <div className="cd-grid">
        <section>
          <h4>{t('vehicleInfo')}</h4>
          <dl className="kv">
            <dt>{t('car')}</dt><dd>{vehicleText(c.vehicle)}</dd>
            <dt>{t('usageCode')}</dt><dd>{usageText(c.vehicle.usage, lang)}</dd>
            <dt>{t('plate')}</dt><dd>{c.customer.plate} · {c.customer.province}</dd>
            <dt>{t('chassis')}</dt><dd className="num">{c.customer.chassis}</dd>
            <dt>{t('sumInsured')}</dt><dd className="num">{fmtBaht(c.desiredSI ?? c.vehicle.sumInsured, lang)}{c.vehicle.suggestedSI && <div className="hint">{t('siAdjusted', { pct: `${c.vehicle.sumInsured > c.vehicle.suggestedSI ? '+' : ''}${(((c.vehicle.sumInsured - c.vehicle.suggestedSI) / c.vehicle.suggestedSI) * 100).toFixed(1)}`, v: fmtBaht(c.vehicle.suggestedSI, lang) })}</div>}</dd>
            {c.pkg?.repair && (<><dt>{t('coverage')}</dt><dd>{t(c.pkg.repair === 'dealer' ? 'repairDealer' : 'repairGarage')} · {t('deductible')} {c.pkg.deductible ? fmtBaht(c.pkg.deductible, lang) : t('none')}</dd></>)}
            <dt>{t('premium')}</dt><dd className="num">{total !== undefined ? fmtBaht(total, lang) : t('waitingQuote')}</dd>
            <dt>{t('startDate')}</dt><dd>{c.customer.startDate}</dd>
            {c.policyNo && (<><dt>Policy</dt><dd className="num">{c.policyNo}</dd></>)}
            {c.payment && (<><dt>{t('paidBy')}</dt><dd>{t(c.payment.method === 'qr' ? 'payQr' : 'payCard')}{c.payment.months ? ` · ${t('paidInstall', { months: c.payment.months })}` : ''}</dd></>)}
            {c.delivery && (<><dt>{t('deliveryLabel')}</dt><dd>{c.delivery.method === 'paper' ? t('paidPaper', { no: c.delivery.trackingNo ?? '' }) : t('paidPdf', { email: c.delivery.email ?? '' })}</dd></>)}
          </dl>
        </section>
        <section>
          <h4>{t('customerInfo')}</h4>
          <dl className="kv">
            <dt>{t('idCard')}</dt><dd className="num">{c.customer.idCard}</dd>
            <dt>{t('phone')}</dt><dd className="num">{c.customer.phone}</dd>
            <dt>{t('email')}</dt><dd>{c.customer.email}</dd>
            <dt>{t('address')}</dt><dd>{c.customer.address}</dd>
            {c.customer.driver1 && (<><dt>{t('driver1')}</dt><dd>{c.customer.driver1}</dd></>)}
            {c.customer.driver2 && (<><dt>{t('driver2')}</dt><dd>{c.customer.driver2}</dd></>)}
          </dl>
          <Field htmlFor={`as-${c.id}`} label={t('assignTo')}>
            <select id={`as-${c.id}`} value={c.assignee ?? ''} onChange={(e) => assignCase(c.id, e.target.value, staffId)} disabled={!isOpen}>
              <option value="" disabled>{t('unassigned')}</option>
              {STAFF.map((x) => (
                <option key={x.id} value={x.id}>{x[lang]}</option>
              ))}
            </select>
          </Field>
        </section>
      </div>

      {c.claims && c.claims.length > 0 && (
        <section>
          <h4>{t('claimsLabel')}</h4>
          <ul className="claim-list">
            {c.claims.map((cl) => (
              <li key={cl.no}><b className="num">{cl.no}</b> · {fmtDateTime(cl.at, lang)} · {cl.place}{cl.note ? ` · ${cl.note}` : ''}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4>{t('documents')} <span className="muted">({REQUIRED_DOCS[c.coverage].length - docsMissing(c).length}/{REQUIRED_DOCS[c.coverage].length})</span></h4>
        <div className="doc-grid small">
          {REQUIRED_DOCS[c.coverage].map((k) => (
            <BackDoc key={k} c={c} k={k} />
          ))}
        </div>
      </section>

      <section>
        <h4>{t('history')}</h4>
        <ol className="history">
          {history(c).map((h, i) => (
            <li key={i}>
              <span className="muted num">{fmtDateTime(h.at, lang)}</span>
              <span>{h.text}</span>
              <span className="muted">{h.by === 'customer' ? t('byCustomer') : h.by === 'system' ? t('bySystem') : byName(h.by, lang)}</span>
            </li>
          ))}
        </ol>
        <form
          className="note-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            addNote(c.id, note.trim(), staffId);
            setNote('');
          }}
        >
          <label htmlFor={`note-${c.id}`} className="sr-only">{t('actNote')}</label>
          <input id={`note-${c.id}`} placeholder={t('notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn small" type="submit">{t('actNote')}</button>
        </form>
      </section>
    </article>
  );

  function history(c: Case) {
    const out: { at: number; by: string; text: string }[] = [];
    if (c.seeded) {
      const order = ['submitted', 'accepted', 'quoted', 'confirmed', 'docsComplete', 'paid', 'issued', 'cancelled'] as const;
      for (const st of order) {
        const at = c.stamps[st];
        if (!at) continue;
        if (c.source !== 'quote' && (st === 'quoted' || st === 'confirmed')) continue;
        if (c.source === 'self' && st === 'accepted') continue;
        const by = st === 'submitted' || st === 'confirmed' || st === 'docsComplete' || st === 'paid' ? (c.agentId && st !== 'paid' ? c.agentId : 'customer') : c.assignee ?? 'system';
        const key: Record<typeof st, TKey> = {
          submitted: c.source === 'package' ? 'lSubmitPackage' : c.source === 'self' ? 'lSelfStart' : 'lSubmitQuote',
          paid: 'lPaid',
          accepted: 'lAccept',
          quoted: 'lQuote',
          confirmed: 'lConfirm',
          docsComplete: 'nDocs',
          issued: 'lIssue',
          cancelled: 'lCancel',
        };
        out.push({ at, by, text: t(key[st], { price: fmtBaht(c.quotedPremium ?? 0, lang), ref: c.id, text: '-', method: c.payment ? t(c.payment.method === 'qr' ? 'payQr' : 'payCard') : '' }) });
      }
    }
    for (const l of c.log) {
      const map: Record<string, TKey> = {
        submitPackage: 'lSubmitPackage',
        selfStart: 'lSelfStart',
        paid: 'lPaid',
        submitQuote: 'lSubmitQuote',
        accept: 'lAccept',
        assign: 'lAssign',
        quote: 'lQuote',
        confirm: 'lConfirm',
        decline: 'lDecline',
        upload: 'lUpload',
        issue: 'lIssue',
        reupload: 'lReupload',
        cancel: 'lCancel',
        note: 'lNote',
        claim: 'lClaim',
        collected: 'lCollected',
        remitted: 'lRemitted',
        remitNotice: 'lRemitNotice',
        nudge: 'lNudge',
      };
      let text = t(map[l.action] ?? 'lNote', {
        price: fmtBaht(Number(l.text ?? 0), lang),
        doc: l.text && l.action === 'upload' ? DOC_LABEL[lang][l.text as DocKey] : '',
        text: l.text ?? '',
        method: l.action === 'paid' ? t(l.text === 'qr' ? 'payQr' : 'payCard') : '',
      });
      if (l.action === 'assign') text += `: ${staffById(l.text)?.[lang] ?? ''}`;
      out.push({ at: l.at, by: l.by, text });
    }
    return out.sort((a, b) => b.at - a.at);
  }
}

/** Sub-agent sale: who sold it, discount, commission and the money. */
function AgentBox({ c, staffId, now }: { c: Case; staffId: string; now: number }) {
  const { t, lang } = useT();
  const ag = agentById(c.agentId);
  const pay = payInfo(c, now);
  const com = caseCommission(c);
  if (!ag) return null;
  return (
    <section className="agent-box">
      <div>
        <div className="eyebrow">{t('chAgent')} · {ag.code}</div>
        <b>{ag[lang]}</b>
        <div className="hint">{t(ag.kind === 'company' ? 'agCompany' : 'agPerson')} · {t('agMkt')}: {mktById(ag.mktId)?.[lang]} · ☎ {ag.phone}</div>
      </div>
      <dl className="agent-box-kv">
        {c.proposalId && <div><dt>{t('agRef')}</dt><dd className="num">{c.proposalId}</dd></div>}
        <div><dt>{t('agDiscount')}</dt><dd className="num">{c.discount ? fmtBaht(c.discount, lang) : '—'}</dd></div>
        <div><dt>{t('agCommission')}</dt><dd className="num">{totalPremium(c) !== undefined ? fmtBaht(Math.round(com.net), lang) : '—'}</dd></div>
        {c.collect && <div><dt>{t('agCollect')}</dt><dd>{t(c.collect === 'agent' ? 'chCollectAgent' : 'chCollectLink')}</dd></div>}
        {pay && <div><dt>{t(c.collect === 'agent' ? 'remitShort' : 'payShort')}</dt><dd><span className={`pill tone-${PAY_TONE[pay.state]}`}>{t(payKey(c, pay.state))}</span> <span className="hint">{t('agDue', { d: fmtDate(pay.due, lang) })}</span></dd></div>}
      </dl>
      {c.collect === 'agent' && c.stamps.issued && !c.remittedAt && (
        <button type="button" className="btn small primary" onClick={() => recordRemit(c.id, staffId)}>{t('actRemit')}</button>
      )}
    </section>
  );
}

/** Premium the agents collected themselves and still owe ABC (15 days from issue). */
function RemitList({ staffId, now, onOpen }: { staffId: string; now: number; onOpen: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const rows = s.cases
    .filter((c) => c.collect === 'agent' && c.stamps.issued && c.status !== 'CANCELLED')
    .map((c) => ({ c, p: payInfo(c, now)! }))
    .filter((r) => r.p && (show === 'all' || !settled(r.p.state)))
    .sort((a, b) => a.p.due - b.p.due);
  const sumBy = (st: string) => rows.filter((r) => r.p.state === st).reduce((a, r) => a + (totalPremium(r.c) ?? 0), 0);
  return (
    <section className="leads remit">
      <div className="list-head">
        <div>
          <h3>{t('tabRemit')}</h3>
          <p className="hint">{t('remitLead', { overdue: fmtBaht(Math.round(sumBy('overdue')), lang), pending: fmtBaht(Math.round(sumBy('pending')), lang) })}</p>
        </div>
        <select id="bo-remit-show" aria-label={t('filterStatus')} value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
          <option value="open">{t('remitOpen')}</option>
          <option value="all">{t('filterAll')}</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="muted pad">{t('mktNoLate')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('colCase')}</th>
                <th>{t('chAgent')}</th>
                <th className="r">{t('premium')}</th>
                <th>{t('remitDue')}</th>
                <th>{t('filterStatus')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, p }) => (
                <tr key={c.id}>
                  <td><button type="button" className="link num" onClick={() => onOpen(c.id)}>{c.id}</button><div className="hint">{c.customer.firstName} {c.customer.lastName}</div></td>
                  <td>{agentById(c.agentId)?.[lang]}{c.log.some((l) => l.action === 'remitNotice') && !c.remittedAt && <div className="hint">✓ {t('remitNoticed')}</div>}</td>
                  <td className="r num">{fmtBaht(totalPremium(c) ?? 0, lang)}</td>
                  <td className="num">{fmtDate(p.due, lang)}</td>
                  <td><span className={`pill tone-${PAY_TONE[p.state]}`}>{t(payKey(c, p.state))}</span>{p.doneAt && <div className="hint num">{fmtDate(p.doneAt, lang)}</div>}</td>
                  <td>{!c.remittedAt && <button type="button" className="btn small" onClick={() => recordRemit(c.id, staffId)}>{t('actRemit')}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BackDoc({ c, k }: { c: Case; k: DocKey }) {
  const { t, lang } = useT();
  const meta = c.docs[k];
  const url = useFileUrl(`${c.id}:${k}`, c.seeded ? undefined : meta?.at);
  const [big, setBig] = useState(false);
  const [broken, setBroken] = useState(false);
  return (
    <div className={`doc-tile${meta ? ' has' : ''}`}>
      <button type="button" className="doc-thumb" onClick={() => url && setBig(true)} disabled={!url} aria-label={DOC_LABEL[lang][k]}>
        {url && !broken ? <img src={url} alt="" onError={() => setBroken(true)} /> : <span aria-hidden="true">{meta ? '✓' : '—'}</span>}
      </button>
      <div className="doc-label">{DOC_LABEL[lang][k]}</div>
      <div className="hint">{meta ? (c.seeded ? t('sampleDoc') : meta.name) : t('missing')}</div>
      {big && url && (
        <div className="lightbox" role="dialog" aria-label={DOC_LABEL[lang][k]} onClick={() => setBig(false)}>
          <img src={url} alt={DOC_LABEL[lang][k]} />
        </div>
      )}
    </div>
  );
}

