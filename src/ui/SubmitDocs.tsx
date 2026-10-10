import { useEffect, useState } from 'react';
import { subjectText } from '../data/travel';
import type { Case } from '../types';
import { installmentPlan } from '../data/packages';
import { fmtBaht, fmtDateTime, useT } from '../i18n';
import { submitDocs, submitPayIssue, totalPremium, useStore } from '../store';
import { TypeTag } from './common';
import { FakeQr } from './icons';
import { BIZ_DAY_MIN, addBizMinutes } from '../lib/time';

/**
 * After the customer has attached every document: Class 1 goes to the back office for checking;
 * every other cover is paid here and the policy is issued straight away.
 */
export function SubmitDocsModal({ caseId, by, onClose }: { caseId: string; by?: string; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const c = s.cases.find((x) => x.id === caseId);
  const [sent, setSent] = useState(false);
  const [delivery, setDelivery] = useState<'pdf' | 'paper'>('pdf');
  const [pay, setPay] = useState<'qr' | 'card'>('qr');
  const [months, setMonths] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Class 1, and anything a partner handles, goes to the back office as soon as the dialog
  // opens: the dialog is the receipt. (Partners take payment their own way.)
  const review = !!c && (c.coverage === 'T1' || !!c.agentId);
  useEffect(() => {
    if (c && review && !c.stamps.docsComplete) {
      submitDocs(c.id, by);
      setSent(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!c) return null;

  const total = totalPremium(c) ?? 0;
  const plan = installmentPlan(total);
  const t1 = review;

  const payNow = () => {
    setBusy(true);
    setTimeout(() => {
      submitPayIssue(
        c.id,
        delivery === 'paper' ? { method: 'paper', address: c.customer.address } : { method: 'pdf', email: c.customer.email },
        { method: pay, last4: pay === 'card' ? '4242' : undefined, months: pay === 'card' && plan && months ? plan.months : undefined },
      );
      setBusy(false);
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sd-modal" role="dialog" aria-modal="true" aria-label={t('sdTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('sdTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label="close">×</button>
        </div>

        <div className="sd-summary">
          <TypeTag type={c.coverage} />
          <span>{subjectText(c, lang)}{c.addCmi ? ` · ${t('plusCmi')}` : ''}</span>
          <b className="num">{fmtBaht(total, lang)}</b>
        </div>

        {t1 ? (
          <div className="sd-done">
            <div className="done-mark pop-in" aria-hidden="true">✓</div>
            <h4>{t('sdReceived')}</h4>
            <div className="ref-big num">{c.id}</div>
            <p>{t(c.coverage === 'T1' ? 'sdReceivedLead' : 'sdReceivedLeadDocs', { eta: fmtDateTime(addBizMinutes(c.stamps.docsComplete ?? Date.now(), BIZ_DAY_MIN), lang) })}</p>
            <ol className="sd-next">
              <li className="done">{t('sdStepSent')}</li>
              <li>{t(c.coverage === 'T1' ? 'sdStepCheck' : 'sdStepCheckDocs')}</li>
              <li>{t('sdStepIssue')}</li>
            </ol>
            <button type="button" className="btn primary" onClick={onClose}>{t('sdOk')}</button>
            {sent && <p className="hint">{t('sdEmailNote', { email: c.customer.email })}</p>}
          </div>
        ) : c.status === 'ISSUED' ? (
          <div className="sd-done">
            <div className="done-mark pop-in" aria-hidden="true">✓</div>
            <h4>{t('sdIssued')}</h4>
            <div className="ref-big num">{c.policyNo}</div>
            <p>{c.delivery?.method === 'paper' ? t('paidPaper', { no: c.delivery.trackingNo ?? '' }) : t('paidPdf', { email: c.delivery?.email ?? c.customer.email })}</p>
            <button type="button" className="btn primary" onClick={onClose}>{t('sdOk')}</button>
          </div>
        ) : (
          <div className="sd-pay">
            <p className="hint">{t('sdPayLead')}</p>
            <div className="sd-label">{t('deliveryTitle')}</div>
            <div className="sd-options" role="radiogroup" aria-label={t('deliveryTitle')}>
              {(['pdf', 'paper'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={delivery === m} className={`option-card${delivery === m ? ' on' : ''}`} onClick={() => setDelivery(m)}>
                  <span className="radio-dot" aria-hidden="true" />
                  <span><b>{t(m === 'pdf' ? 'deliveryPdf' : 'deliveryPaper')}</b><small>{m === 'pdf' ? c.customer.email : c.customer.address}</small></span>
                </button>
              ))}
            </div>
            <div className="sd-label">{t('sdPayMethod')}</div>
            <div className="sd-options" role="radiogroup" aria-label={t('sdPayMethod')}>
              {(['qr', 'card'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={pay === m} className={`option-card${pay === m ? ' on' : ''}`} onClick={() => setPay(m)}>
                  <span className="radio-dot" aria-hidden="true" />
                  <b>{t(m === 'qr' ? 'payQr' : 'payCard')}</b>
                </button>
              ))}
            </div>
            {pay === 'qr' ? (
              <div className="sd-qr">
                <FakeQr seed={c.id} size={112} />
                <span className="hint">{t('sdQrHint')}</span>
              </div>
            ) : (
              <>
                <p className="hint">{t('offerCardSim')}</p>
                {plan && (
                  <div className="sd-options" role="radiogroup" aria-label={t('payPlan')}>
                    {[0, plan.months].map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={months === m} className={`option-card${months === m ? ' on' : ''}`} onClick={() => setMonths(m)}>
                        <span className="radio-dot" aria-hidden="true" />
                        <b>{m ? t('payInstall', { months: plan.months, monthly: fmtBaht(plan.monthly, lang) }) : t('payFull', { amount: fmtBaht(total, lang) })}</b>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <button type="button" className="btn primary block" disabled={busy} onClick={payNow}>
              {busy ? <><span className="spinner" aria-hidden="true" /> {t('paying')}</> : t('sdPayIssue', { amount: pay === 'card' && plan && months ? `${fmtBaht(plan.monthly, lang)}${t('perMonth')}` : fmtBaht(total, lang) })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Bar under the documents: everything is attached, now confirm to send. */
export function SubmitDocsBar({ c, by }: { c: Case; by?: string }) {
  const { t } = useT();
  return (
    <div className="sd-bar">
      <span>✓ {t('sdReady')}</span>
      <button type="button" className="btn primary" onClick={() => window.dispatchEvent(new CustomEvent('abc-submit-docs', { detail: { id: c.id, by } }))}>{t('sdConfirm')}</button>
    </div>
  );
}

/**
 * Lives at the top of the customer page so the dialog survives the upload panel disappearing
 * once the case moves on (submitted, or issued).
 */
export function SubmitDocsHost() {
  const [req, setReq] = useState<{ id: string; by?: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setReq((e as CustomEvent<{ id: string; by?: string }>).detail);
    window.addEventListener('abc-submit-docs', on);
    return () => window.removeEventListener('abc-submit-docs', on);
  }, []);
  return req ? <SubmitDocsModal caseId={req.id} by={req.by} onClose={() => setReq(null)} /> : null;
}
