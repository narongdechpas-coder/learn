import { useEffect, useMemo, useState } from 'react';
import type { Agent, Case, CoverageType, Customer, Package, Proposal, RenewalItem, UsageCode, Vehicle } from '../types';
import { CATALOGUE_CODES, brandsFor, modelById, modelsOf, siRange, suggestedSumInsured, vehicleText, yearsOf } from '../data/vehicles';
import { QUOTE_TYPES, cmiPremium } from '../data/packages';
import { packagesFor } from '../data/products';
import { caseCommission, rateOf, commissionReceived, mktById, optionPrice, payInfo, settled, type PayState } from '../data/agents';
import { COVERAGE_LABEL, fmtBaht, fmtDate, fmtDateTime, fmtNum, usageText, useT, type TKey } from '../i18n';
import { acceptProposal, agentCollected, agentRemitNotice, createProposal, customerConfirm, submitCase, totalPremium, useStore } from '../store';
import { DAY_MS, bkkParts, bkkTime } from '../lib/time';
import { Field, Segmented, StatusPill, TypeTag, useNow } from './common';
import { SAMPLE_CUSTOMER, Uploads } from './Customer';
import { BrandIcon } from './icons';
import { ShareBox } from './Offer';
import { RenewalReport } from './AgentRenewals';
import { SubmitDocsHost } from './SubmitDocs';

type Tab = 'sell' | 'offers' | 'cases' | 'renew' | 'perf';

export const agentName = (a: Agent | undefined, lang: 'th' | 'en') => (a ? a[lang] : '—');

/** Status of a quotation as the agent sees it. */
export function proposalState(p: Proposal, now: number): 'accepted' | 'declined' | 'expired' | 'viewed' | 'sent' | 'draft' {
  if (p.status === 'accepted') return 'accepted';
  if (p.status === 'declined') return 'declined';
  if (now > p.expiresAt) return 'expired';
  if (p.viewedAt) return 'viewed';
  return p.sentVia.length ? 'sent' : 'draft';
}
export const PROPOSAL_STATE_KEY: Record<ReturnType<typeof proposalState>, TKey> = {
  accepted: 'psAccepted',
  declined: 'psDeclined',
  expired: 'psExpired',
  viewed: 'psViewed',
  sent: 'psSent',
  draft: 'psDraft',
};
export const PROPOSAL_STATE_TONE: Record<ReturnType<typeof proposalState>, string> = {
  accepted: 'good',
  declined: 'muted',
  expired: 'muted',
  viewed: 'info',
  sent: 'wait',
  draft: 'neutral',
};
export const PAY_KEY: Record<PayState, TKey> = { paid: 'payPaid', late: 'payLate', pending: 'payPending', overdue: 'payOverdue' };
export const PAY_TONE: Record<PayState, string> = { paid: 'good', late: 'warn', pending: 'wait', overdue: 'bad' };

/** Label for a payment state; money the agent holds is "awaiting remittance" rather than "awaiting payment". */
export const payKey = (c: Case, st: PayState): TKey => (st === 'pending' && c.collect === 'agent' && c.paidAt ? 'remitPending' : PAY_KEY[st]);

export function PayChip({ c, now }: { c: Case; now: number }) {
  const { t } = useT();
  const p = payInfo(c, now);
  if (!p) return null;
  return <span className={`pill tone-${PAY_TONE[p.state]}`}>{t(c.collect === 'agent' ? 'remitShort' : 'payShort')}: {t(payKey(c, p.state))}</span>;
}

interface Prefill {
  vehicle: Vehicle;
  customer: Partial<Customer>;
  renewalOf?: string;
}

export function AgentApp({ agentId, onLogout, onOpenOffer }: { agentId: string; onLogout: () => void; onOpenOffer: (id: string, asAgent: boolean) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [tab, setTab] = useState<Tab>('sell');
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [focusCase, setFocusCase] = useState<string | null>(null);
  const agent = s.agents.find((a) => a.id === agentId) ?? s.agents[0];
  const mkt = mktById(agent.mktId);
  const myOffers = s.proposals.filter((p) => p.agentId === agent.id);
  const myCases = s.cases.filter((c) => c.agentId === agent.id);
  const now = useNow(30000);
  const myRenewals = s.renewals.filter((r) => r.agentId === agent.id);
  const renewTodo = myRenewals.filter((r) => r.status === 'open' && r.expiry - now <= 30 * DAY_MS && r.expiry > now - 30 * DAY_MS).length;
  const startRenewal = (r: RenewalItem) => {
    const md = modelById(r.vehicle.modelId);
    const si = suggestedSumInsured(md, r.vehicle.year);
    const [fn, ...ln] = r.customerName.split(' ');
    setPrefill({ vehicle: { ...r.vehicle, sumInsured: si }, customer: { firstName: fn, lastName: ln.join(' '), phone: r.phone }, renewalOf: r.id });
    setTab('sell');
  };
  const todo = myCases.filter((c) => ['AWAITING_DOCS', 'QUOTED'].includes(c.status) || payInfo(c, now)?.state === 'overdue').length;

  const tabs: [Tab, TKey, number?][] = [
    ['sell', 'agTabSell'],
    ['offers', 'agTabOffers', myOffers.filter((p) => proposalState(p, now) === 'viewed').length || undefined],
    ['cases', 'agTabCases', todo || undefined],
    ['renew', 'agTabRenew', renewTodo || undefined],
    ['perf', 'agTabPerf'],
  ];

  return (
    <div className="agent-app">
      <div className="ag-head">
        <div className="ag-who">
          <span className={`ag-avatar kind-${agent.kind}`} aria-hidden="true">{agent.kind === 'company' ? '🏢' : agent[lang].slice(0, 1)}</span>
          <div>
            <div className="eyebrow">{agent.code} · {t(agent.kind === 'company' ? 'agCompany' : 'agPerson')}</div>
            <h2>{agent[lang]}</h2>
            <div className="muted">{t('agLicense')} {agent.license} · {agent.province}{mkt ? ` · ${t('agMkt')}: ${mkt[lang]}` : ''}</div>
          </div>
        </div>
        <div className="ag-tools">
          <span className="pill tone-good">● {t('plSignedIn')}</span>
          <button type="button" className="btn small ghost" onClick={onLogout}>{t('plLogout')}</button>
        </div>
      </div>
      {!agent.active && <p className="callout tone-bad">{t('agSuspended')}</p>}

      <div className="subtabs" role="tablist">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {t(label)} {n ? <span className="nav-badge num">{n}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'sell' && (
        <Sell
          key={`${agent.id}-${prefill?.renewalOf ?? ''}`}
          agent={agent}
          prefill={prefill}
          onOpenOffer={onOpenOffer}
          onCase={(id) => { setFocusCase(id); setTab('cases'); }}
        />
      )}
      {tab === 'offers' && <Offers offers={myOffers} onOpenOffer={onOpenOffer} />}
      {tab === 'cases' && <MyCases agent={agent} cases={myCases} focus={focusCase} setFocus={setFocusCase} />}
      <SubmitDocsHost />
      {tab === 'renew' && <RenewalReport renewals={myRenewals} proposals={myOffers} onRenew={startRenewal} onOpenOffer={(id) => onOpenOffer(id, true)} />}
      {tab === 'perf' && (
        <Perf
          agent={agent}
          cases={myCases}
          offers={myOffers}
          renewals={myRenewals}
          onRenew={startRenewal}
          onReport={() => setTab('renew')}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- sell

function Sell({ agent, prefill, onOpenOffer, onCase }: { agent: Agent; prefill: Prefill | null; onOpenOffer: (id: string, asAgent: boolean) => void; onCase: (id: string) => void }) {
  const { t, lang } = useT();
  const { products } = useStore();
  const pv = prefill?.vehicle;
  const [code, setCode] = useState<UsageCode>(pv?.usage ?? '110');
  const [brandId, setBrandId] = useState(pv?.brandId ?? '');
  const [modelId, setModelId] = useState(pv?.modelId ?? '');
  const [year, setYear] = useState<number | ''>(pv?.year ?? '');
  const [si, setSi] = useState<number | null>(pv?.sumInsured ?? null);
  const [mode, setMode] = useState<'buy' | 'quote'>(prefill ? 'quote' : 'buy');
  const [picked, setPicked] = useState<string[]>([]);
  const [cmi, setCmi] = useState(true);
  const [disc, setDisc] = useState(0);
  const [cust, setCust] = useState<Customer>(() => ({ ...SAMPLE_CUSTOMER(), ...(prefill?.customer ?? {}) }));
  const [consent, setConsent] = useState(false);
  const [collect, setCollect] = useState<'link' | 'agent'>('link');
  const [quoteType, setQuoteType] = useState<CoverageType>('T1');
  const [made, setMade] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const brands = brandsFor(code);
  const models = brandId ? modelsOf(brandId, code) : [];
  const model = modelId ? modelById(modelId) : undefined;
  const years = model ? yearsOf(model) : [];
  const suggested = model && year ? suggestedSumInsured(model, year) : 0;
  const range = suggested ? siRange(suggested) : null;
  const sumInsured = si ?? suggested;
  const pkgs = useMemo(() => (model && year ? packagesFor(model, code, year, sumInsured, { channel: 'partner', agentId: agent.id }).filter((p) => p.type !== 'CMI') : []), [model, code, year, sumInsured, agent.id, products]);
  const cmiPrice = cmiPremium(code);
  const cmiOnly = useMemo(() => (model && year ? packagesFor(model, code, year, sumInsured, { channel: 'partner', agentId: agent.id }).find((p) => p.type === 'CMI') : undefined), [model, code, year, sumInsured, agent.id, products]);
  const all: Package[] = cmiOnly ? [...pkgs, cmiOnly] : pkgs;
  const chosen = all.filter((p) => picked.includes(p.id));
  const maxDisc = Math.round(Math.max(0, ...chosen.filter((p) => p.type !== 'CMI').map((p) => rateOf(p) * 100)));
  const vehicle: Vehicle | null = model && year ? { brandId, modelId, year, sumInsured, usage: code, ...(sumInsured !== suggested ? { suggestedSI: suggested } : {}) } : null;

  useEffect(() => {
    if (disc > maxDisc) setDisc(maxDisc);
  }, [maxDisc, disc]);

  const toggle = (id: string) => {
    setErr('');
    if (mode === 'buy') return setPicked([id]);
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));
  };
  const reset = (level: 'code' | 'brand' | 'model' | 'year') => {
    if (level === 'code') setBrandId('');
    if (level === 'code' || level === 'brand') setModelId('');
    if (level !== 'year') setYear('');
    setSi(null);
    setPicked([]);
  };
  const setC = (k: keyof Customer, v: string) => setCust((c) => ({ ...c, [k]: v }));

  const submit = () => {
    if (!vehicle || !chosen.length) return setErr(t('agPickPkg'));
    if (!cust.firstName.trim() || !/^0\d{8,9}$/.test(cust.phone.replace(/\D/g, ''))) return setErr(t('agNeedCust'));
    if (mode === 'buy' && !consent) return setErr(t('agNeedConsent'));
    const options = chosen.map((p) => ({ pkg: p, addCmi: cmi && p.type !== 'CMI' }));
    // It is only a renewal while the car is still the one on the expiring policy.
    const sameCar = !!pv && pv.modelId === vehicle.modelId && pv.year === vehicle.year && pv.usage === vehicle.usage;
    const id = createProposal({ agentId: agent.id, vehicle, customer: cust, options, discountPct: disc, renewalOf: sameCar ? prefill?.renewalOf : undefined });
    if (mode === 'quote') return setMade(id);
    // Buying on the spot: the agent confirms for the customer, who has agreed in person.
    const caseId = acceptProposal(id, 0, 'agent', collect);
    if (caseId) onCase(caseId);
  };

  const requestQuote = () => {
    if (!vehicle) return;
    const id = submitCase({ source: 'quote', vehicle, coverage: quoteType, addCmi: cmi && cmiPrice !== undefined, desiredSI: sumInsured, customer: cust, agentId: agent.id, collect }, false);
    onCase(id);
  };

  if (made) {
    return (
      <div className="ag-made card">
        <div className="done-mark" aria-hidden="true">✓</div>
        <h3>{t('agMade', { id: made })}</h3>
        <p className="muted">{t('agMadeLead')}</p>
        <ShareBox id={made} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => onOpenOffer(made, true)}>{t('agPreview')}</button>
          <button type="button" className="btn" onClick={() => { setMade(null); setPicked([]); }}>{t('agNewQuote')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ag-sell">
      {prefill?.renewalOf && <p className="callout tone-info">↻ {t('agRenewPrefill')}</p>}
      <section className="card ag-car">
        <h3>{t('agCar')}</h3>
        <div className="ag-car-grid">
          <Field label={t('usageCode')} htmlFor="ag-code">
            <select id="ag-code" value={code} onChange={(e) => { setCode(e.target.value as UsageCode); reset('code'); }}>
              {CATALOGUE_CODES.map((c) => (
                <option key={c} value={c}>{usageText(c, lang)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('brand')} htmlFor="ag-brand">
            <div className="ag-brand-sel">
              {brandId && <BrandIcon id={brandId} size={26} />}
              <select id="ag-brand" value={brandId} onChange={(e) => { setBrandId(e.target.value); reset('brand'); }}>
                <option value="">—</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </Field>
          <Field label={t('model')} htmlFor="ag-model">
            <select id="ag-model" value={modelId} disabled={!brandId} onChange={(e) => { setModelId(e.target.value); reset('model'); }}>
              <option value="">—</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.noPackage ? ` (${t('agQuoteOnly')})` : ''}</option>
              ))}
            </select>
          </Field>
          <Field label={t('year')} htmlFor="ag-year">
            <select id="ag-year" value={year} disabled={!modelId} onChange={(e) => { setYear(Number(e.target.value)); reset('year'); }}>
              <option value="">—</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
          <div className="field ag-si">
            <label htmlFor="ag-si">{t('sumInsured')}</label>
            {range ? (
              <>
                <div className="ag-si-val num">{fmtBaht(sumInsured, lang)}</div>
                <input id="ag-si" type="range" min={range.min} max={range.max} step={1000} value={sumInsured} onChange={(e) => { setSi(Number(e.target.value)); }} />
                <div className="hint">{t('siAdjust')}</div>
              </>
            ) : (
              <div className="hint">{t('siPending')}</div>
            )}
          </div>
        </div>
      </section>

      {model?.noPackage && vehicle ? (
        <section className="card">
          <h3>{t('agNoPkgTitle')}</h3>
          <p className="muted">{t('agNoPkgLead')}</p>
          <div className="ag-quote-req">
            <Segmented id="ag-qtype" label={t('filterType')} value={quoteType} onChange={setQuoteType} options={QUOTE_TYPES.map((k) => ({ value: k, label: COVERAGE_LABEL[lang][k] }))} />
            <CustomerFields cust={cust} setC={setC} />
            <button type="button" className="btn primary" onClick={requestQuote} disabled={!agent.active}>{t('agSendQuoteReq')}</button>
          </div>
        </section>
      ) : (
        <section className="card ag-pkgs">
          <div className="card-head">
            <div>
              <h3>{t('agPackages')}</h3>
              <p className="hint">{mode === 'buy' ? t('agBuyHint') : t('agQuoteHint', { n: chosen.length })}</p>
            </div>
            <Segmented id="ag-mode" label={t('agMode')} value={mode} onChange={(m) => { setMode(m); setPicked((p) => (m === 'buy' ? p.slice(0, 1) : p)); setErr(''); }} options={[
              { value: 'buy', label: t('agModeBuy') },
              { value: 'quote', label: t('agModeQuote') },
            ]} />
          </div>
          {!vehicle ? (
            <p className="muted pad">{t('siPending')}</p>
          ) : (
            <div className="table-wrap">
              <table className="data ag-pkg-table">
                <thead>
                  <tr>
                    <th aria-label={t('agSelect')} />
                    <th>{t('filterType')}</th>
                    <th>{t('agCover')}</th>
                    <th className="r">{t('premium')}</th>
                    <th className="r ag-int">{t('agCommission')}</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((p) => {
                    const on = picked.includes(p.id);
                    const pr = optionPrice({ pkg: p, addCmi: false }, 0, code);
                    return (
                      <tr key={p.id} className={on ? 'on' : ''} onClick={() => toggle(p.id)}>
                        <td>
                          <input type={mode === 'buy' ? 'radio' : 'checkbox'} name="ag-pkg" aria-label={p.id} checked={on} onChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td><TypeTag type={p.type} /></td>
                        <td className="muted">{coverText(p, t, lang)}</td>
                        <td className="r num">{fmtBaht(p.premium, lang)}</td>
                        <td className="r num ag-int">{fmtBaht(Math.round(pr.commission), lang)} <span className="muted">({Math.round(rateOf(p) * 100)}%)</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {vehicle && cmiPrice !== undefined && (
            <label className="check ag-cmi">
              <input type="checkbox" checked={cmi} onChange={(e) => setCmi(e.target.checked)} />
              <span>{t('addCmi', { price: fmtBaht(cmiPrice, lang) })}</span>
            </label>
          )}
        </section>
      )}

      {vehicle && !model?.noPackage && (
        <section className="card ag-summary">
          <div className="ag-sum-grid">
            <div>
              <h3>{t('agCustomer')}</h3>
              <CustomerFields cust={cust} setC={setC} full={mode === 'buy'} />
            </div>
            <div>
              <h3>{t('agPrice')}</h3>
                <div className="field ag-disc">
                  <label htmlFor="ag-disc">{t('agDiscount')} <b className="num">{disc}%</b></label>
                  <input id="ag-disc" type="range" min={0} max={maxDisc} step={1} value={disc} disabled={!chosen.length} onChange={(e) => setDisc(Number(e.target.value))} />
                  <div className="hint">{t('agDiscountHint', { max: maxDisc })}</div>
                </div>
              {chosen.length === 0 ? (
                <p className="muted">{t('agPickPkg')}</p>
              ) : (
                <ul className="ag-price-list">
                  {chosen.map((p) => {
                    const pr = optionPrice({ pkg: p, addCmi: cmi && p.type !== 'CMI' }, disc, code);
                    return (
                      <li key={p.id}>
                        <TypeTag type={p.type} />
                        <span className="ag-price">
                          {pr.discount > 0 && <s className="muted num">{fmtBaht(pr.full, lang)}</s>}
                          <b className="num">{fmtBaht(pr.price, lang)}</b>
                        </span>
                          <span className="ag-int hint num">
                            {t('agComNet', { gross: fmtBaht(Math.round(pr.commission), lang), disc: fmtBaht(pr.discount, lang), net: fmtBaht(Math.round(pr.net), lang) })}
                          </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {mode === 'buy' && (
                <>
                  <fieldset className="ag-collect">
                    <legend>{t('agCollect')}</legend>
                    <label className="check"><input type="radio" name="ag-collect" checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
                    <label className="check"><input type="radio" name="ag-collect" checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
                  </fieldset>
                  <label className="check ag-consent">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>{t('agConsent')}</span>
                  </label>
                </>
              )}
              {err && <p className="error" role="alert">{err}</p>}
              <button type="button" className="btn primary block" disabled={!agent.active} onClick={submit}>
                {mode === 'buy' ? t('agBuyNow') : t('agMakeQuote', { n: chosen.length || '' })}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CustomerFields({ cust, setC, full = false }: { cust: Customer; setC: (k: keyof Customer, v: string) => void; full?: boolean }) {
  const { t } = useT();
  const keys: (keyof Customer)[] = full ? ['firstName', 'lastName', 'phone', 'email', 'idCard', 'plate', 'province', 'address'] : ['firstName', 'lastName', 'phone', 'email'];
  return (
    <div className="form-grid ag-cust">
      {keys.map((k) => (
        <Field key={k} label={t(k as TKey)} htmlFor={`ag-c-${k}`}>
          <input id={`ag-c-${k}`} value={cust[k]} onChange={(e) => setC(k, e.target.value)} />
        </Field>
      ))}
    </div>
  );
}

export function coverText(p: Package, t: (k: TKey, v?: Record<string, string | number>) => string, lang: 'th' | 'en') {
  const bits: string[] = [];
  if (p.type === 'CMI') return t('agCmiOnly');
  if (p.repair) bits.push(t(p.repair === 'dealer' ? 'repairDealer' : 'repairGarage'));
  if (p.ownDamage) bits.push(`${t('agOd')} ${fmtBaht(p.ownDamage, lang)}`);
  if (p.deductible) bits.push(`${t('deductible')} ${fmtBaht(p.deductible, lang)}`);
  if (!p.ownDamage && p.fireTheft) bits.push(`${t('fireTheft')} ${fmtBaht(p.fireTheft, lang)}`);
  if (!bits.length) bits.push(t('agTpOnly'));
  return bits.join(' · ');
}

// ---------------------------------------------------------------- offers

function Offers({ offers, onOpenOffer }: { offers: Proposal[]; onOpenOffer: (id: string, asAgent: boolean) => void }) {
  const { t, lang } = useT();
  const now = useNow(30000);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [share, setShare] = useState<string | null>(null);
  const list = offers.filter((p) => filter === 'all' || ['viewed', 'sent', 'draft'].includes(proposalState(p, now)));
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>{t('agTabOffers')}</h3>
          <p className="hint">{t('agOffersLead')}</p>
        </div>
        <Segmented id="ag-of" label={t('filterStatus')} value={filter} onChange={setFilter} options={[
          { value: 'open', label: t('agOpenOffers') },
          { value: 'all', label: t('filterAll') },
        ]} />
      </div>
      {list.length === 0 ? (
        <p className="muted pad">{t('agNoOffers')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data ag-offers">
            <thead>
              <tr>
                <th>{t('agRef')}</th>
                <th>{t('agCustomer')}</th>
                <th>{t('agCar')}</th>
                <th className="r">{t('agOptions')}</th>
                <th>{t('agValidTo')}</th>
                <th>{t('filterStatus')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 60).map((p) => {
                const st = proposalState(p, now);
                const live = ['viewed', 'sent', 'draft'].includes(st);
                return (
                  <tr key={p.id}>
                    <td className="num">{p.id}</td>
                    <td>{p.customer.firstName} {p.customer.lastName}</td>
                    <td className="muted">{vehicleText(p.vehicle)}</td>
                    <td className="r num">{p.options.length}{p.discountPct ? <span className="muted"> · −{p.discountPct}%</span> : null}</td>
                    <td className="num">{fmtDate(p.expiresAt, lang)}</td>
                    <td>
                      <span className={`pill tone-${PROPOSAL_STATE_TONE[st]}`}>{t(PROPOSAL_STATE_KEY[st])}</span>
                      {p.viewedAt && st !== 'accepted' && <div className="hint num">{t('agViewedAt', { t: fmtDateTime(p.viewedAt, lang) })}</div>}
                    </td>
                    <td className="ag-row-actions">
                      <button type="button" className="btn small ghost" onClick={() => onOpenOffer(p.id, true)}>{t('agOpen')}</button>
                      {live && <button type="button" className="btn small" onClick={() => setShare(share === p.id ? null : p.id)}>{t('agShare')}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {share && (
        <div className="modal-backdrop" onClick={() => setShare(null)}>
          <div className="modal" role="dialog" aria-label={t('agShare')} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('agShare')} {share}</h3>
              <button type="button" className="btn ghost small" onClick={() => setShare(null)} aria-label="close">×</button>
            </div>
            <ShareBox id={share} />
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- my cases

function MyCases({ agent, cases, focus, setFocus }: { agent: Agent; cases: Case[]; focus: string | null; setFocus: (id: string | null) => void }) {
  const { t, lang } = useT();
  const now = useNow(30000);
  const [filter, setFilter] = useState<'todo' | 'all'>('todo');
  const needs = (c: Case) => ['NEW', 'ACCEPTED', 'QUOTED', 'AWAITING_DOCS', 'DOCS_REVIEW'].includes(c.status) || !settled(payInfo(c, now)?.state ?? 'paid');
  const list = cases.filter((c) => filter === 'all' || needs(c) || c.id === focus).sort((a, b) => b.createdAt - a.createdAt);
  const c = focus ? cases.find((x) => x.id === focus) : undefined;
  return (
    <div className="ag-cases">
      <section className="card">
        <div className="card-head">
          <div>
            <h3>{t('agTabCases')}</h3>
            <p className="hint">{t('agCasesLead')}</p>
          </div>
          <Segmented id="ag-cf" label={t('filterStatus')} value={filter} onChange={setFilter} options={[
            { value: 'todo', label: t('agTodo') },
            { value: 'all', label: t('filterAll') },
          ]} />
        </div>
        {list.length === 0 ? (
          <p className="muted pad">{t('agNoCases')}</p>
        ) : (
          <ul className="ag-case-list">
            {list.slice(0, 50).map((x) => (
              <li key={x.id}>
                <button type="button" className={`case-row${x.id === focus ? ' on' : ''}`} onClick={() => setFocus(x.id)}>
                  <div className="cr-top">
                    <span className="num ref">{x.id}</span>
                    <StatusPill status={x.status} />
                  </div>
                  <div className="cr-mid">
                    <b>{x.customer.firstName} {x.customer.lastName}</b>
                    <span className="muted">{vehicleText(x.vehicle)}</span>
                  </div>
                  <div className="cr-bot">
                    <TypeTag type={x.coverage} />
                    <PayChip c={x} now={now} />
                    <span className="muted num">{fmtDateTime(x.createdAt, lang)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="ag-case-detail">
        {c ? <AgentCase key={c.id} c={c} agent={agent} now={now} /> : <p className="muted pad center-text">{t('selectCase')}</p>}
      </div>
    </div>
  );
}

function AgentCase({ c, agent, now }: { c: Case; agent: Agent; now: number }) {
  const { t, lang } = useT();
  const [collect, setCollect] = useState<'link' | 'agent'>(c.collect ?? 'link');
  const pay = payInfo(c, now);
  const com = caseCommission(c);
  const total = totalPremium(c);
  return (
    <article className="case-detail card">
      <header className="cd-head">
        <div>
          <div className="eyebrow num">{c.id}{c.proposalId ? ` · ${c.proposalId}` : ''}</div>
          <h3>{c.customer.firstName} {c.customer.lastName}</h3>
          <div className="cd-tags">
            <StatusPill status={c.status} />
            <TypeTag type={c.coverage} />
            {c.addCmi && <span className="chip">{t('plusCmi')}</span>}
            <PayChip c={c} now={now} />
          </div>
        </div>
      </header>
      <dl className="ag-kv">
        <div><dt>{t('agCar')}</dt><dd>{vehicleText(c.vehicle)} · {fmtBaht(c.vehicle.sumInsured, lang)}</dd></div>
        <div><dt>{t('premium')}</dt><dd className="num">{total !== undefined ? fmtBaht(total, lang) : t('agWaitQuote')}{c.discount ? <span className="muted"> ({t('agInclDisc', { v: fmtBaht(c.discount, lang) })})</span> : null}</dd></div>
        {total !== undefined && (
          <div className="ag-int"><dt>{t('agCommission')}</dt><dd className="num">{fmtBaht(Math.round(com.net), lang)} <span className="muted">{commissionReceived(c) ? t('comReceived') : t('comPending')}</span></dd></div>
        )}
        {c.policyNo && <div><dt>{t('agPolicyNo')}</dt><dd className="num">{c.policyNo}</dd></div>}
        {pay && <div><dt>{t(c.collect === 'agent' ? 'remitShort' : 'payShort')}</dt><dd>{t(payKey(c, pay.state))} · {t('agDue', { d: fmtDate(pay.due, lang) })}</dd></div>}
      </dl>

      {c.status === 'QUOTED' && (
        <div className="callout tone-info ag-confirm">
          <p>{t('agQuotedLead', { p: fmtBaht(total ?? 0, lang) })}</p>
          <fieldset className="ag-collect">
            <legend>{t('agCollect')}</legend>
            <label className="check"><input type="radio" name={`col-${c.id}`} checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
            <label className="check"><input type="radio" name={`col-${c.id}`} checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
          </fieldset>
          <button type="button" className="btn primary" onClick={() => customerConfirm(c.id, agent.id, collect)}>{t('agConfirmFor')}</button>
        </div>
      )}

      {c.collect === 'agent' && c.stamps.confirmed && c.status !== 'CANCELLED' && (
        <div className="ag-money">
          {!c.paidAt ? (
            <button type="button" className="btn" onClick={() => agentCollected(c.id)}>💵 {t('agCollected')}</button>
          ) : !c.remittedAt ? (
            <>
              <p className="hint">{t('agRemitLead', { d: pay ? fmtDate(pay.due, lang) : '—' })}</p>
              <button type="button" className="btn" disabled={c.log.some((l) => l.action === 'remitNotice')} onClick={() => agentRemitNotice(c.id)}>
                {c.log.some((l) => l.action === 'remitNotice') ? `✓ ${t('agRemitSent')}` : t('agRemitNotice')}
              </button>
            </>
          ) : (
            <p className="ok-note">✓ {t('agRemitted', { d: fmtDate(c.remittedAt, lang) })}</p>
          )}
        </div>
      )}

      {c.renewalOf ? <p className="callout tone-info">↻ {t('renewNoDocs')}</p> : <Uploads c={c} by={agent.id} />}
    </article>
  );
}

// ---------------------------------------------------------------- performance

function Perf({ agent, cases, offers, renewals, onRenew, onReport }: { agent: Agent; cases: Case[]; offers: Proposal[]; renewals: RenewalItem[]; onRenew: (r: RenewalItem) => void; onReport: () => void }) {
  const { t, lang } = useT();
  const now = useNow(60000);
  const p = bkkParts(now);
  const monthStart = bkkTime(p.y, p.mo, 1);
  const issuedMonth = cases.filter((c) => (c.stamps.issued ?? 0) >= monthStart);
  const gwp = issuedMonth.reduce((a, c) => a + (c.premium ?? 0), 0);
  const issuedAll = cases.filter((c) => c.stamps.issued);
  const comIn = issuedAll.filter((c) => commissionReceived(c) && (c.remittedAt ?? c.paidAt ?? 0) >= monthStart).reduce((a, c) => a + caseCommission(c).net, 0);
  const comWait = issuedAll.filter((c) => !commissionReceived(c)).reduce((a, c) => a + caseCommission(c).net, 0);
  const pctTarget = agent.target ? gwp / agent.target : 0;
  const daysIn = new Date(Date.UTC(p.y, p.mo + 1, 0)).getUTCDate();
  const pace = (p.d / daysIn) * agent.target;

  const notOpened = offers.filter((o) => proposalState(o, now) === 'sent' && now - o.createdAt > DAY_MS);
  const expiring = offers.filter((o) => ['viewed', 'sent'].includes(proposalState(o, now)) && o.expiresAt - now < 3 * DAY_MS);
  const docsMissing = cases.filter((c) => c.status === 'AWAITING_DOCS');
  const unpaid = cases.filter((c) => payInfo(c, now) && !settled(payInfo(c, now)!.state));
  const due = renewals.filter((r) => r.expiry >= now - 7 * DAY_MS && r.expiry - now <= 90 * DAY_MS && r.status !== 'renewed' && r.status !== 'lost').sort((a, b) => a.expiry - b.expiry);

  return (
    <div className="ag-perf">
      <div className="kpis">
        <div className="kpi">
          <div className="eyebrow">{t('agKpiPolicies')}</div>
          <div className="kpi-value num">{fmtNum(issuedMonth.length, lang)}</div>
          <div className="kpi-foot muted">{t('agThisMonth')}</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">{t('agKpiGwp')}</div>
          <div className="kpi-value num">{fmtBaht(Math.round(gwp), lang)}</div>
          <div className="kpi-foot muted">{t('agThisMonth')}</div>
        </div>
            <div className="kpi ag-int">
              <div className="eyebrow">{t('comReceived')}</div>
              <div className="kpi-value num">{fmtBaht(Math.round(comIn), lang)}</div>
              <div className="kpi-foot muted">{t('agThisMonth')}</div>
            </div>
            <div className="kpi ag-int">
              <div className="eyebrow">{t('comPending')}</div>
              <div className="kpi-value num">{fmtBaht(Math.round(comWait), lang)}</div>
              <div className="kpi-foot muted">{t('agComPendingNote')}</div>
            </div>
      </div>

      <section className="card ag-target">
        <div className="card-head">
          <div>
            <h3>{t('agTarget')}</h3>
            <p className="hint">{t('agTargetLead', { target: fmtBaht(agent.target, lang) })}</p>
          </div>
          <div className={`ag-target-pct num tone-${pctTarget >= 1 ? 'good' : gwp >= pace ? 'info' : 'warn'}`}>{fmtNum(pctTarget * 100, lang, 0)}%</div>
        </div>
        <div className="meter ag-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, pctTarget * 100)}%` }} />
          <i style={{ left: `${Math.min(100, (pace / agent.target) * 100)}%` }} />
        </div>
        <p className="hint">{gwp >= pace ? t('agOnPace') : t('agBehind', { v: fmtBaht(Math.round(pace - gwp), lang) })}</p>
      </section>

      <div className="dash-2col">
        <section className="card">
          <h3>{t('agFollow')}</h3>
          <ul className="ag-follow">
            <FollowRow n={notOpened.length} label={t('agFuNotOpened')} />
            <FollowRow n={expiring.length} label={t('agFuExpiring')} />
            <FollowRow n={docsMissing.length} label={t('agFuDocs')} />
            <FollowRow n={unpaid.length} label={t('agFuUnpaid')} tone={unpaid.some((c) => payInfo(c, now)?.state === 'overdue') ? 'bad' : 'wait'} />
          </ul>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t('agRenewals')}</h3>
              <p className="hint">{t('agRenewalsLead')}</p>
            </div>
            <button type="button" className="btn small" onClick={onReport}>{t('agOpenReport')}</button>
          </div>
          {due.length === 0 ? (
            <p className="muted">{t('agNoRenewals')}</p>
          ) : (
            <ul className="ag-renew">
              {due.slice(0, 4).map((r) => {
                const days = Math.ceil((r.expiry - now) / DAY_MS);
                return (
                  <li key={r.id}>
                    <div>
                      <b>{r.customerName}</b> <span className="muted">· {vehicleText(r.vehicle)}</span>
                      <div className="hint num">{r.policyNo} · {COVERAGE_LABEL[lang][r.coverage]} · {fmtBaht(r.premium, lang)}</div>
                    </div>
                    <span className={`pill tone-${days <= 0 ? 'bad' : days <= 30 ? 'warn' : 'neutral'}`}>{days <= 0 ? t('agExpired', { n: -days }) : t('agExpiresIn', { n: days })}</span>
                    {r.status === 'quoted' ? (
                      <span className="pill tone-info">{t('renQuoted')}</span>
                    ) : (
                      <button type="button" className="btn small" onClick={() => onRenew(r)}>{t('agRenewBtn')}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {due.length > 4 && <p className="hint">{t('mktMore', { n: due.length - 4 })}</p>}
        </section>
      </div>
    </div>
  );
}

function FollowRow({ n, label, tone = 'wait' }: { n: number; label: string; tone?: string }) {
  return (
    <li className={n ? '' : 'zero'}>
      <span className={`ag-fu-n num tone-${n ? tone : 'muted'}`}>{n}</span>
      <span>{label}</span>
    </li>
  );
}
