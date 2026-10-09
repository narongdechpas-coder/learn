import { useState } from 'react';
import type { DocKey, Email } from '../types';
import { vehicleText } from '../data/vehicles';
import { COVERAGE_LABEL, DOC_LABEL, EMAIL_TEXT, SLA_LABEL, fmtBaht, fmtDate, fmtDateTime, translate, useT } from '../i18n';
import { useStore } from '../store';
import { Segmented } from './common';

export function Mail({ onOpenCase }: { onOpenCase: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [aud, setAud] = useState<'all' | Email['audience']>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = s.emails.filter((e) => aud === 'all' || e.audience === aud);

  const render = (e: Email) => {
    const c = s.cases.find((x) => x.id === e.caseId);
    const lead = c ? undefined : s.leads.find((x) => x.id === e.caseId);
    const offer = s.proposals.find((x) => x.id === e.caseId);
    const p: Record<string, string | number> = { ...e.params, ref: e.caseId };
    if (lead) p.car = vehicleText(lead.vehicle);
    if (typeof e.params.price === 'number') p.price = fmtBaht(e.params.price, lang);
    if (c) {
      p.car = vehicleText(c.vehicle);
      p.type = COVERAGE_LABEL[lang][c.coverage];
      p.source = translate(lang, c.source === 'package' ? 'srcPackage' : c.source === 'self' ? 'srcSelf' : 'srcQuote');
    }
    if (typeof e.params.premium === 'number') p.premium = fmtBaht(e.params.premium, lang);
    if (offer) p.car = vehicleText(offer.vehicle);
    if (typeof e.params.expiry === 'number') p.expiry = fmtDate(e.params.expiry, lang, { day: 'numeric', month: 'short', year: 'numeric' });
    if (e.params.agent) p.agent = s.agents.find((a) => a.id === e.params.agent)?.[lang] ?? String(e.params.agent);
    if (e.params.sla) p.sla = SLA_LABEL[lang][e.params.sla as 'accept'];
    if (e.template === 'custSelfIssued')
      p.delivery = e.params.deliveryMethod === 'paper' ? translate(lang, 'paidPaper', { no: e.params.trackingNo }) : translate(lang, 'paidPdf', { email: e.params.sendTo });
    if (e.params.docs) p.docs = String(e.params.docs).split(',').map((k) => DOC_LABEL[lang][k as DocKey]).join(', ');
    const tpl = EMAIL_TEXT[lang][e.template];
    const fill = (x: string) => Object.entries(p).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), x);
    return { subject: fill(tpl.subject), body: fill(tpl.body) };
  };

  return (
    <div className="mail">
      <div className="dash-head">
        <div>
          <h2>{t('mailTitle')}</h2>
          <p className="lead">{t('mailLead')}</p>
        </div>
        <Segmented id="mail-aud" label={t('to')} value={aud} onChange={setAud} options={[
          { value: 'all', label: t('filterAll') },
          { value: 'customer', label: t('toCustomer') },
          { value: 'staff', label: t('toStaff') },
          { value: 'agent', label: t('toAgent') },
        ]} />
      </div>
      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark" aria-hidden="true">✉</div>
          <p>{t('noMail')}</p>
        </div>
      ) : (
        <ul className="mail-list">
          {list.map((e) => {
            const r = render(e);
            const open = openId === e.id;
            return (
              <li key={e.id} className={open ? 'open' : ''}>
                <button type="button" className="mail-row" aria-expanded={open} onClick={() => setOpenId(open ? null : e.id)}>
                  <span className={`aud aud-${e.audience}`}>{e.audience === 'staff' ? t('toStaff') : e.audience === 'agent' ? t('toAgent') : t('toCustomer')}</span>
                  <span className="mail-subject">{r.subject}</span>
                  <span className="muted num">{fmtDateTime(e.at, lang)}</span>
                </button>
                {open && (
                  <div className="mail-body">
                    <div className="muted">{t('to')}: {e.to}</div>
                    <pre>{r.body}</pre>
                    {e.template !== 'custLead' && <button type="button" className="btn small" onClick={() => onOpenCase(e.caseId)}>{t('openCase')} →</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
