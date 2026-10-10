import { useEffect, useState } from 'react';
import { optionPrice } from '../data/agents';
import { installmentPlan } from '../data/packages';
import { vehicleText } from '../data/vehicles';
import { COVER_KEYS, subjectText, tripRange } from '../data/travel';
import { COVER_LABEL, TravelCertificate, coverValue } from './Travel';
import { PA_COVER_LABEL, PaCertificate } from './Pa';
import { PA_COVER_KEYS, occName } from '../data/pa';
import { fmtBaht, fmtDate, fmtDateTime, useT } from '../i18n';
import { acceptProposal, declineProposal, markProposalSent, payByLink, totalPremium, useStore, viewProposal } from '../store';
import { StatusPill, TypeTag } from './common';
import { EXTRA_KEY, productName } from './Products';
import { getCatalog } from '../data/products';
import type { Proposal } from '../types';
import { Uploads } from './Customer';
import { FakeQr } from './icons';
import { SubmitDocsHost } from './SubmitDocs';

/** Ask the app to open a quotation (the customer link, or the agent's own preview). */
export const openOffer = (id: string, asAgent: boolean, print = false) => window.dispatchEvent(new CustomEvent('abc-open-offer', { detail: { id, asAgent, print } }));

export const offerLink = (id: string) => {
  try {
    return `${location.href.split('#')[0]}#offer/${id}`;
  } catch {
    return `#offer/${id}`;
  }
};

/** Ways to send a quotation: copy the link, print to PDF, or LINE (simulated). */
export function ShareBox({ id }: { id: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const pr = s.proposals.find((p) => p.id === id);
  const ag = s.agents.find((a) => a.id === pr?.agentId);
  const [copied, setCopied] = useState(false);
  const [line, setLine] = useState(false);
  if (!pr) return null;
  const link = offerLink(id);
  const msg = t('lineMsg', { name: pr.customer.firstName, car: subjectText(pr, lang), n: pr.options.length, link, agent: ag?.th ?? '' });
  const sent = (v: 'link' | 'pdf' | 'line') => pr.sentVia.includes(v);
  return (
    <div className="share-box">
      <div className="share-link">
        <input readOnly value={link} aria-label={t('shareLink')} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn small" onClick={() => {
          try {
            void navigator.clipboard?.writeText(link);
          } catch {
            /* ignore */
          }
          markProposalSent(id, 'link');
          setCopied(true);
        }}>{copied || sent('link') ? `✓ ${t('shareSent')}` : t('shareCopy')}</button>
      </div>
      <div className="share-actions">
        <button type="button" className="btn small ghost" onClick={() => { markProposalSent(id, 'pdf'); openOffer(id, true, true); }}>📄 {t('sharePdf')}</button>
        <button type="button" className="btn small line-btn" onClick={() => setLine((v) => !v)}>{sent('line') ? '✓ ' : ''}LINE</button>
        <button type="button" className="btn small ghost" onClick={() => openOffer(id, false)}>🔗 {t('shareOpenAsCustomer')}</button>
      </div>
      {line && (
        <div className="line-preview">
          <div className="line-bubble">{msg}</div>
          <button type="button" className="btn small line-btn" onClick={() => { markProposalSent(id, 'line'); markProposalSent(id, 'link'); setLine(false); }}>{t('lineSend')}</button>
        </div>
      )}
      <p className="hint">{t('shareHint')}</p>
    </div>
  );
}

/** The quotation as the customer sees it (also the agent's preview and the printable PDF). */
export function OfferPage({ id, asAgent, print, onBack }: { id: string; asAgent: boolean; print: boolean; onBack: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const pr = s.proposals.find((p) => p.id === id);
  const ag = s.agents.find((a) => a.id === pr?.agentId);
  const [choice, setChoice] = useState(0);
  const [consent, setConsent] = useState(false);
  const [collect, setCollect] = useState<'link' | 'agent'>('link');
  const [otp, setOtp] = useState<'' | 'sent'>('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [cert, setCert] = useState(false);

  useEffect(() => {
    if (pr && !asAgent) viewProposal(pr.id);
  }, [pr?.id, asAgent]);
  useEffect(() => {
    if (!print) return;
    const h = setTimeout(() => window.print(), 400);
    return () => clearTimeout(h);
  }, [print]);

  if (!pr || !ag) {
    return (
      <div className="offer card pad">
        <p>{t('offerMissing')}</p>
        <button type="button" className="btn" onClick={onBack}>{t('back')}</button>
      </div>
    );
  }
  const now = Date.now();
  const isTravel = pr.options.every((o) => o.pkg.type === 'TRV');
  const isPa = pr.options.every((o) => o.pkg.type === 'PA');
  const expired = pr.status === 'open' && now > pr.expiresAt;
  const c = pr.caseId ? s.cases.find((x) => x.id === pr.caseId) : undefined;
  const open = pr.status === 'open' && !expired;

  const accept = () => {
    setErr('');
    if (asAgent && !consent) return setErr(t('agNeedConsent'));
    if (!asAgent && code.trim().length !== 6) return setErr(t('otpErr'));
    acceptProposal(pr.id, choice, asAgent ? 'agent' : 'customer', asAgent ? collect : 'link');
  };

  return (
    <div className={`offer-wrap${print ? ' printing' : ''}`}>
      <div className="offer-bar no-print">
        <button type="button" className="btn small ghost" onClick={onBack}>← {t('back')}</button>
        <span className="muted">{asAgent ? t('offerAgentView') : t('offerCustView')}</span>
        <button type="button" className="btn small" onClick={() => window.print()}>📄 {t('sharePdf')}</button>
      </div>
      <article className="offer card">
        <header className="offer-head">
          <div className="offer-brand">
            <span className="logo" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="34" height="34"><path d="M16 3 5 7v8c0 7 4.7 12 11 14 6.3-2 11-7 11-14V7L16 3Z" fill="var(--accent)" /></svg>
            </span>
            <div>
              <b>{t('appName')}</b>
              <div className="muted">{t(isTravel ? 'trOfferTitle' : isPa ? 'paOfferTitle' : 'offerTitle')}</div>
            </div>
          </div>
          <div className="offer-ref">
            <div className="num"><b>{pr.id}</b></div>
            <div className="hint">{t('offerIssued', { d: fmtDate(pr.createdAt, lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}</div>
            <div className={`hint${expired ? ' bad-text' : ''}`}>{t('offerValid', { d: fmtDate(pr.expiresAt, lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}</div>
          </div>
        </header>

        <div className="offer-parties">
          <div>
            <div className="eyebrow">{t('offerFor')}</div>
            <b>{t('offerDear', { name: `${pr.customer.firstName} ${pr.customer.lastName}` })}</b>
            <div className="muted">{pr.vehicle ? `${vehicleText(pr.vehicle)} · ${t('sumInsured')} ${fmtBaht(pr.vehicle.sumInsured, lang)}` : `${subjectText(pr, lang)}${pr.options[0]?.pkg.travel ? ` · ${tripRange(pr.options[0].pkg.travel.trip, lang)}` : ''}${pr.options[0]?.pkg.accident ? ` · ${tripRange(pr.options[0].pkg.accident as never, lang)}` : ''}`}</div>
          </div>
          <div className="offer-agent">
            <div className="eyebrow">{t('offerAgent')}</div>
            <b>{ag[lang]}</b>
            <div className="hint">{t('agLicense')} {ag.license}{ag.kind === 'company' && ag.contactTh ? ` · ${lang === 'th' ? ag.contactTh : ag.contactEn}` : ''}</div>
            <div className="offer-contact no-print">
              <a className="btn small" href={`tel:${ag.phone.replace(/\D/g, '')}`}>☎ {ag.phone}</a>
              <span className="btn small line-btn" role="note">LINE {ag.line}</span>
            </div>
            <div className="print-only hint">☎ {ag.phone} · LINE {ag.line}</div>
          </div>
        </div>

        <CoverTable pr={pr} picked={pr.status === 'accepted' ? pr.chosen : choice} onPick={open ? setChoice : undefined} />
        <p className="hint">{t(isTravel ? 'trOfferNote' : isPa ? 'paOfferNote' : 'offerNote')}</p>

        {expired && <p className="callout tone-bad">{t('offerExpired')}</p>}
        {pr.status === 'declined' && <p className="callout">{t('offerDeclined')}</p>}

        {open && (
          <div className="offer-accept no-print">
            {asAgent ? (
              <>
                <fieldset className="ag-collect">
                  <legend>{t('agCollect')}</legend>
                  <label className="check"><input type="radio" name="of-collect" checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
                  <label className="check"><input type="radio" name="of-collect" checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
                </fieldset>
                <label className="check ag-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>{t('agConsent')}</span>
                </label>
                {err && <p className="error" role="alert">{err}</p>}
                <button type="button" className="btn primary" onClick={accept}>{t('agConfirmFor')}</button>
              </>
            ) : otp === '' ? (
              <div className="offer-cta">
                <button type="button" className="btn primary" onClick={() => { setOtp('sent'); setCode(''); }}>{t('offerChoose')}</button>
                <button type="button" className="btn ghost" onClick={() => declineProposal(pr.id)}>{t('offerNotNow')}</button>
              </div>
            ) : (
              <div className="otp-box">
                <p>{t('otpSent', { phone: pr.customer.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1-xxx-$2') })}</p>
                <div className="otp-row">
                  <input inputMode="numeric" maxLength={6} aria-label="OTP" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
                  <button type="button" className="link" onClick={() => setCode('428531')}>{t('otpFill')}</button>
                </div>
                {err && <p className="error" role="alert">{err}</p>}
                <button type="button" className="btn primary" onClick={accept}>{t('offerConfirm', { p: fmtBaht(optionPrice(pr.options[choice], pr.discountPct, pr.vehicle?.usage).price, lang) })}</button>
              </div>
            )}
          </div>
        )}

        {pr.status === 'accepted' && c && (
          <div className="offer-after no-print">
            <div className="ok-note">✓ {t('offerAccepted', { ref: c.id, by: pr.acceptedBy === 'agent' ? t('offerByAgent') : t('offerByCust'), at: fmtDateTime(pr.acceptedAt ?? now, lang) })}</div>
            <div className="cd-tags"><StatusPill status={c.status} /></div>
            {c.collect === 'link' && !c.paidAt && c.status !== 'CANCELLED' && <PayBox caseId={c.id} amount={totalPremium(c) ?? 0} />}
            {c.collect === 'link' && c.paidAt && <p className="ok-note">✓ {t('offerPaid', { d: fmtDateTime(c.paidAt, lang) })}</p>}
            {c.collect === 'agent' && <p className="hint">{t('offerPayAgent', { agent: ag[lang] })}</p>}
            {c.status === 'ISSUED' && c.policyNo && (
              <div className="ok-note">
                ✓ {t('policyIssued', { no: c.policyNo })}{' '}
                {(c.coverage === 'TRV' || c.coverage === 'PA') && <button type="button" className="btn small" onClick={() => setCert((v) => !v)}>{t(cert ? 'trHideCert' : 'trViewCert')}</button>}
              </div>
            )}
            {cert && c.coverage === 'TRV' && <TravelCertificate c={c} />}
            {cert && c.coverage === 'PA' && <PaCertificate c={c} />}
            {c.coverage === 'TRV' ? (
              <p className="hint">✈️ {t('trInstant')}</p>
            ) : c.coverage === 'PA' ? (
              <p className="hint">{c.pkg?.accident?.referral && !c.renewalOf ? `🔎 ${t('paReviewNote')}` : `⚡ ${t('paInstantNote')}`}</p>
            ) : c.renewalOf ? (
              <p className="hint">↻ {t('renewNoDocs')}</p>
            ) : (
              <Uploads c={c} by={asAgent ? ag.id : 'customer'} />
            )}
          </div>
        )}
      </article>
      <SubmitDocsHost />
    </div>
  );
}

function PayBox({ caseId, amount }: { caseId: string; amount: number }) {
  const { t, lang } = useT();
  const [method, setMethod] = useState<'qr' | 'card'>('qr');
  return (
    <div className="pay-box">
      <h4>{t('offerPayTitle', { v: fmtBaht(amount, lang) })}</h4>
      <div className="segmented" role="radiogroup" aria-label={t('offerPayTitle', { v: '' })}>
        <button type="button" role="radio" aria-checked={method === 'qr'} className={method === 'qr' ? 'on' : ''} onClick={() => setMethod('qr')}>{t('payQr')}</button>
        <button type="button" role="radio" aria-checked={method === 'card'} className={method === 'card' ? 'on' : ''} onClick={() => setMethod('card')}>{t('payCard')}</button>
      </div>
      {method === 'qr' ? (
        <div className="qr-box">
          <FakeQr seed={caseId} size={132} />
          <span className="qr-amount num">{fmtBaht(amount, lang)}</span>
        </div>
      ) : (
        <p className="hint">{t('offerCardSim')}</p>
      )}
      <button type="button" className="btn primary" onClick={() => payByLink(caseId, method, method === 'card' ? '4242' : undefined)}>{t('offerPaySim')}</button>
    </div>
  );
}

/**
 * Every option side by side with its cover, limits and price. While the quotation is open the customer
 * (or the agent) picks an option from the column headers; prints on one A4 portrait page.
 */
function CoverTable({ pr, picked, onPick }: { pr: Proposal; picked?: number; onPick?: (i: number) => void }) {
  const { t, lang } = useT();
  const cmiStd = getCatalog().find((p) => p.type === 'CMI');
  const cmiMed = cmiStd?.medical ?? 80_000;
  const cmiDeath = cmiStd?.pa ?? 500_000;
  const money = (n: number) => (n ? fmtBaht(n, lang) : t('ofNo'));
  const prices = pr.options.map((o) => optionPrice(o, pr.discountPct, pr.vehicle?.usage));
  const seats = pr.options.find((o) => o.pkg.passengers !== undefined)?.pkg.passengers ?? 0;
  type Row = { label: string; cell: (i: number) => string; strong?: boolean; render?: (i: number, v: string) => React.ReactNode };
  const opt = (i: number) => pr.options[i];
  const vol = (i: number, fn: () => string) => (opt(i).pkg.type === 'CMI' ? '—' : fn());
  const hasCmi = (i: number) => opt(i).pkg.type === 'CMI' || opt(i).addCmi;
  const travel = pr.options.every((o) => o.pkg.type === 'TRV');
  const pa = pr.options.every((o) => o.pkg.type === 'PA');
  const priceGroup: [string, Row[]] = [t(travel || pa ? 'trOfGroupPrice' : 'ofGroupPrice'), [
    { label: t('ofFull'), cell: (i) => fmtBaht(prices[i].full, lang), render: (i, v) => (prices[i].discount ? <s>{v}</s> : v) },
    ...(prices.some((p) => p.discount > 0)
      ? [{ label: t('ofDiscount'), cell: (i: number) => (prices[i].discount ? t('offerSave', { v: fmtBaht(prices[i].discount, lang) }) : '—'), render: (i: number, v: string) => (prices[i].discount ? <span className="pill tone-good">{v}</span> : v) }]
      : []),
    { label: t('ofPay'), cell: (i) => fmtBaht(prices[i].price, lang), strong: true },
    { label: t('ofInst'), cell: (i) => { const pl = installmentPlan(prices[i].price); return pl ? `${fmtBaht(pl.monthly, lang)} × ${pl.months}` : '—'; } },
  ]];
  const groups: [string, Row[]][] = pa ? [
    [t('ofGroupPa'), [
      ...PA_COVER_KEYS.map((k) => ({ label: t(PA_COVER_LABEL[k]), cell: (i: number) => { const v = opt(i).pkg.accident?.cover[k] ?? 0; return v ? `${fmtBaht(v, lang)}${k === 'hospitalDaily' ? ` ${t('paPerDay')}` : ''}` : t('ofNo'); } })),
      { label: t('paMotorcycle'), cell: (i) => (opt(i).pkg.accident?.motorcycle ? t('covered') : t('ofNo')) },
      { label: t('paOccupation'), cell: (i) => { const a = opt(i).pkg.accident; return a ? `${occName(a.occupation, lang, a.occupationText)} (${a.occClass})` : '—'; } },
    ]],
    priceGroup,
  ] : travel ? [
    [t('ofGroupTravel'), [
      ...COVER_KEYS.map((k) => ({ label: t(COVER_LABEL[k]), cell: (i: number) => { const v = coverValue(opt(i).pkg.travel?.cover[k] ?? 0, t, lang); return v === t('trNotCovered') ? t('ofNo') : v; } })),
      { label: t('trSchengen'), cell: (i) => (opt(i).pkg.travel?.schengen ? t('trYes') : t('ofNo')) },
    ]],
    priceGroup,
  ] : [
    [t('ofGroupCar'), [
      { label: t('repairType'), cell: (i) => vol(i, () => (opt(i).pkg.repair ? t(opt(i).pkg.repair === 'dealer' ? 'repairDealer' : 'repairGarage') : '—')) },
      { label: t('ownDamage'), cell: (i) => vol(i, () => money(opt(i).pkg.ownDamage)) },
      { label: t('deductible'), cell: (i) => vol(i, () => (opt(i).pkg.deductible ? fmtBaht(opt(i).pkg.deductible, lang) : t('none'))) },
      { label: t('fireTheft'), cell: (i) => vol(i, () => money(opt(i).pkg.fireTheft)) },
      { label: t('flood'), cell: (i) => vol(i, () => (opt(i).pkg.flood ? t('covered') : t('ofNo'))) },
    ]],
    [t('ofGroupTp'), [
      { label: t('ofTpbiPerson'), cell: (i) => vol(i, () => money(opt(i).pkg.tpbiPerson)) },
      { label: t('ofTpbiAccident'), cell: (i) => vol(i, () => money(opt(i).pkg.tpbiAccident)) },
      { label: t('ofTppd'), cell: (i) => vol(i, () => money(opt(i).pkg.tppd)) },
    ]],
    [t('ofGroupRider'), [
      { label: `${t('rdRy01Short')} · ${t('rdDriver')}`, cell: (i) => vol(i, () => money(opt(i).pkg.pa)) },
      { label: `${t('rdRy01Short')} · ${t('rdPassenger')} (${t('ofPeople', { n: seats })})`, cell: (i) => vol(i, () => money(opt(i).pkg.paPassenger ?? opt(i).pkg.pa)) },
      ...(pr.options.some((o) => o.pkg.tempDriver || o.pkg.tempPassenger)
        ? [
            { label: `${t('rdRy01Temp')} · ${t('rdDriver')}`, cell: (i: number) => vol(i, () => (opt(i).pkg.tempDriver ? `${fmtBaht(opt(i).pkg.tempDriver, lang)}${t('rdPerWeek')}` : t('ofNo'))) },
            { label: `${t('rdRy01Temp')} · ${t('rdPassenger')}`, cell: (i: number) => vol(i, () => (opt(i).pkg.tempPassenger ? `${fmtBaht(opt(i).pkg.tempPassenger, lang)}${t('rdPerWeek')}` : t('ofNo'))) },
          ]
        : []),
      { label: `${t('rdRy02')} (${t('ofPeople', { n: seats + 1 })})`, cell: (i) => vol(i, () => money(opt(i).pkg.medical)) },
      { label: t('rdRy03'), cell: (i) => vol(i, () => money(opt(i).pkg.bail)) },
      { label: t('ofExtras'), cell: (i) => vol(i, () => (opt(i).pkg.extras ?? []).filter((x) => x !== 'flood').map((x) => t(EXTRA_KEY[x])).join(', ') || '—') },
    ]],
    [t('ofGroupCmi'), [
      { label: t('ofCmiIncl'), cell: (i) => (hasCmi(i) ? t('ofIncl') : t('ofNotIncl')) },
      { label: t('ofCmiMedical'), cell: (i) => (hasCmi(i) ? fmtBaht(cmiMed, lang) : '—') },
      { label: t('ofCmiDeath'), cell: (i) => (hasCmi(i) ? fmtBaht(cmiDeath, lang) : '—') },
    ]],
    priceGroup,
  ];
  return (
    <section className="offer-cover">
      <h3 className="offer-h">
        <span className="no-print">{onPick ? t('ofPickTitle', { n: pr.options.length }) : t('ofCoverTitle')}</span>
        <span className="print-only">{t('ofCoverTitle')}</span>
      </h3>
      <div className="table-wrap">
        <table className={`offer-cover-table${onPick ? ' pickable' : ''}`}>
          <thead>
            <tr>
              <th scope="col" />
              {pr.options.map((o, i) => (
                <th key={i} scope="col" className={`oc-opt${picked === i ? ' pick' : ''}`} aria-selected={picked === i}>
                  <div className="oc-no">{t('ofOption', { n: i + 1 })}</div>
                  {o.pkg.type !== 'TRV' && o.pkg.type !== 'PA' && <TypeTag type={o.pkg.type} />}
                  {o.pkg.nameTh && <div className="oc-name">{productName(o.pkg, lang)}</div>}
                  {onPick ? (
                    <label className={`oc-pick no-print${picked === i ? ' on' : ''}`}>
                      <input type="radio" name="offer-opt" className="sr-only" checked={picked === i} onChange={() => onPick(i)} />
                      <span className="radio-dot" aria-hidden="true" />
                      {t('ofPick')}
                      <span className="sr-only"> {t('ofOption', { n: i + 1 })}</span>
                    </label>
                  ) : (
                    pr.status === 'accepted' && picked === i && <span className="pill tone-good oc-chosen">✓ {t('ofChosen')}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map(([g, rows]) => (
            <tbody key={g}>
              <tr className="oc-group"><th scope="rowgroup" colSpan={pr.options.length + 1}><span>{g}</span></th></tr>
              {rows.map((r) => (
                <tr key={r.label} className={r.strong ? 'oc-strong' : ''}>
                  <th scope="row">{r.label}</th>
                  {pr.options.map((_, i) => {
                    const v = r.cell(i);
                    const off = v === t('ofNo') || v === '—' || v === t('ofNotIncl');
                    return (
                      <td key={i} className={`num${off ? ' oc-off' : ''}${picked === i ? ' pick' : ''}`} onClick={onPick ? () => onPick(i) : undefined}>
                        {r.render ? r.render(i, v) : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
