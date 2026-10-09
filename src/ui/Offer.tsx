import { useEffect, useState } from 'react';
import { optionPrice } from '../data/agents';
import { installmentPlan } from '../data/packages';
import { vehicleText } from '../data/vehicles';
import { fmtBaht, fmtDate, fmtDateTime, useT } from '../i18n';
import { acceptProposal, declineProposal, markProposalSent, payByLink, totalPremium, useStore, viewProposal } from '../store';
import { StatusPill, TypeTag } from './common';
import { coverText } from './Agent';
import { Uploads } from './Customer';
import { FakeQr } from './icons';

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
  const { t } = useT();
  const s = useStore();
  const pr = s.proposals.find((p) => p.id === id);
  const ag = s.agents.find((a) => a.id === pr?.agentId);
  const [copied, setCopied] = useState(false);
  const [line, setLine] = useState(false);
  if (!pr) return null;
  const link = offerLink(id);
  const msg = t('lineMsg', { name: pr.customer.firstName, car: vehicleText(pr.vehicle), n: pr.options.length, link, agent: ag?.th ?? '' });
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
              <div className="muted">{t('offerTitle')}</div>
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
            <div className="muted">{vehicleText(pr.vehicle)} · {t('sumInsured')} {fmtBaht(pr.vehicle.sumInsured, lang)}</div>
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

        <h3 className="offer-h">{t('offerOptions', { n: pr.options.length })}</h3>
        <div className="offer-options">
          {pr.options.map((o, i) => {
            const p = optionPrice(o, pr.discountPct, pr.vehicle.usage);
            const inst = installmentPlan(p.price);
            const picked = pr.status === 'accepted' ? pr.chosen === i : choice === i;
            return (
              <label key={i} className={`offer-opt${picked ? ' on' : ''}${pr.status === 'accepted' && !picked ? ' dim' : ''}`}>
                {open && <input type="radio" name="offer-opt" className="sr-only" checked={choice === i} onChange={() => setChoice(i)} />}
                <span className="radio-dot no-print" aria-hidden="true" />
                <span className="offer-opt-main">
                  <TypeTag type={o.pkg.type} />
                  <span className="muted">{coverText(o.pkg, t, lang)}</span>
                  {o.addCmi && <span className="chip">{t('plusCmi')}</span>}
                </span>
                <span className="offer-opt-price">
                  {p.discount > 0 && <s className="muted num">{fmtBaht(p.full, lang)}</s>}
                  <b className="num">{fmtBaht(p.price, lang)}</b>
                  {p.discount > 0 && <span className="pill tone-good">{t('offerSave', { v: fmtBaht(p.discount, lang) })}</span>}
                  {inst && <span className="hint num">{t('offerInst', { m: inst.months, v: fmtBaht(inst.monthly, lang) })}</span>}
                </span>
              </label>
            );
          })}
        </div>
        <p className="hint">{t('offerNote')}</p>

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
                <button type="button" className="btn primary" onClick={accept}>{t('offerConfirm', { p: fmtBaht(optionPrice(pr.options[choice], pr.discountPct, pr.vehicle.usage).price, lang) })}</button>
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
            <Uploads c={c} by={asAgent ? ag.id : 'customer'} />
          </div>
        )}
      </article>
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
