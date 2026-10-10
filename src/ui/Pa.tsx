import { useEffect, useMemo, useState } from 'react';
import type { Agent, Case, Customer as CustomerT, DocKey, OccClass, Package, PaCover, RenewalItem } from '../types';
import { HEALTH_QUESTIONS, OCCUPATIONS, PA_COVER_KEYS, getPaProducts, occName, occupationById, paEnd, paPackages, paRefusal, type PaApplicant } from '../data/pa';
import { ageOn, tripRange } from '../data/travel';
import { fmtBaht, fmtDate, fmtDateTime, useT, type TKey } from '../i18n';
import { acceptProposal, createProposal, docMeta, sendRenewalPreview, setReminders, storeFiles, submitCase, totalPremium, trackStep, useStore } from '../store';
import { OCR_DOC, OCR_SAMPLE, OcrBox, fakeDocSync } from './extras';
import { optionPrice, rateOf } from '../data/agents';
import { dayKey } from '../lib/time';
import { Field, Segmented, DateInput, toDmy } from './common';
import { productName } from './Products';
import { HERO_IMG, HeroBanner } from './HeroBanner';
import { coverValue } from './Travel';

type T = ReturnType<typeof useT>['t'];

export const PA_COVER_LABEL: Record<keyof PaCover, TKey> = {
  death: 'pacDeath',
  medical: 'pacMedical',
  hospitalDaily: 'pacHospital',
  funeral: 'pacFuneral',
};
const HEALTH_KEYS: TKey[] = ['paQ1', 'paQ2', 'paQ3'];
const CLASS_KEY: Record<OccClass | 4, TKey> = { 1: 'paClass1', 2: 'paClass2', 3: 'paClass3', 4: 'paClass4' };

const paName = (p: { nameTh?: string; nameEn?: string }, lang: 'th' | 'en') => productName({ ...p, type: 'PA' }, lang);
const periodText = (start: string, end: string, lang: 'th' | 'en') => tripRange({ start, end } as never, lang);

/* ---------------- shared pieces ---------------- */

/** Plans side by side: one column per plan, one row per benefit. */
export function PaCoverTable({ pkgs, chosen, onChoose }: { pkgs: Package[]; chosen?: string; onChoose?: (p: Package) => void }) {
  const { t, lang } = useT();
  return (
    <div className="table-wrap tr-table-wrap">
      <table className="data tr-cover-table pa-cover-table">
        <thead>
          <tr>
            <th>{t('coverage')}</th>
            {pkgs.map((p) => <th key={p.id} className={`r${p.id === chosen ? ' pick' : ''}`}>{paName(p, lang)}</th>)}
          </tr>
        </thead>
        <tbody>
          {PA_COVER_KEYS.map((k) => (
            <tr key={k}>
              <th>{t(PA_COVER_LABEL[k])}</th>
              {pkgs.map((p) => <td key={p.id} className={`r num${p.id === chosen ? ' pick' : ''}`}>{coverValue(p.accident?.cover[k] ?? 0, t, lang)}</td>)}
            </tr>
          ))}
          <tr>
            <th>{t('paMotorcycle')}</th>
            {pkgs.map((p) => <td key={p.id} className={`r${p.id === chosen ? ' pick' : ''}`}>{p.accident?.motorcycle ? `✓ ${t('paMotorcycleOn')}` : t('paMotorcycleOff')}</td>)}
          </tr>
          <tr className="tr-price-row">
            <th>{t('premium')}</th>
            {pkgs.map((p) => <td key={p.id} className={`r num${p.id === chosen ? ' pick' : ''}`}><b>{fmtBaht(p.premium, lang)}</b></td>)}
          </tr>
          {onChoose && (
            <tr>
              <th />
              {pkgs.map((p) => (
                <td key={p.id} className="r"><button type="button" className="btn small primary" onClick={() => onChoose(p)}>{t('trChoose')}</button></td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Why the back office has to look at an application before it is issued. */
export function referralReasons(c: { pkg?: Package }, t: T): string[] {
  const a = c.pkg?.accident;
  if (!a?.referral) return [];
  return [...(a.occClass === 3 ? [t('paWhyClass3')] : []), ...(occupationById(a.occupation)?.other ? [t('paWhyOther', { job: a.occupationText ?? '' })] : []), ...a.health.flatMap((yes, i) => (yes ? [t('paWhyHealth', { q: t(HEALTH_KEYS[i]) })] : []))];
}

/** Insured person, occupation and cover of a PA case (back office, partner, customer). */
export function PaKv({ c }: { c: Case }) {
  const { t, lang } = useT();
  const a = c.pkg?.accident;
  if (!a) return null;
  const total = totalPremium(c);
  const age = c.customer.birthDate ? ageOn(c.customer.birthDate, a.start) : NaN;
  const why = referralReasons(c, t);
  return (
    <>
      {why.length > 0 && (
        <div className="callout tone-warn pa-referral">
          <b>⚠ {t('paReferralTitle')}</b>
          <ul>{why.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      <dl className="kv">
        <dt>{t('trPlan')}</dt>
        <dd>{paName(c.pkg!, lang)}{c.pkg?.ver ? <span className="muted"> · v{c.pkg.ver}</span> : null}</dd>
        <dt>{t('paOccupation')}</dt>
        <dd>{occName(a.occupation, lang, a.occupationText)} <span className="muted">· {t(CLASS_KEY[a.occClass])}</span></dd>
        <dt>{t('paMotorcycle')}</dt>
        <dd>{a.motorcycle ? `✓ ${t('paMotorcycleOn')}` : t('paMotorcycleOff')}</dd>
        <dt>{t('trPeriod')}</dt>
        <dd>{periodText(a.start, a.end, lang)}</dd>
        <dt>{t('paBirth')}</dt>
        <dd>{c.customer.birthDate ? toDmy(c.customer.birthDate) : '—'}{Number.isFinite(age) ? <span className="muted"> · {t('trAge', { n: age })}</span> : null}</dd>
        <dt>{t('trBeneficiary')}</dt>
        <dd>{c.customer.beneficiary || '—'}</dd>
        <dt>{t('paHealth')}</dt>
        <dd>{a.health.some(Boolean) ? t('paHealthYes', { n: a.health.filter(Boolean).length }) : t('paHealthNo')}</dd>
        <dt>{t('pacDeath')}</dt>
        <dd className="num">{fmtBaht(a.cover.death, lang)}</dd>
        <dt>{t('premium')}</dt>
        <dd className="num">{total !== undefined ? fmtBaht(total, lang) : '—'}</dd>
        {c.policyNo && (<><dt>Policy</dt><dd className="num">{c.policyNo}</dd></>)}
        {c.payment && (<><dt>{t('paidBy')}</dt><dd>{t(c.payment.method === 'qr' ? 'payQr' : 'payCard')}</dd></>)}
      </dl>
    </>
  );
}

/** Policy schedule of a PA policy. */
export function PaCertificate({ c }: { c: Case }) {
  const { t, lang } = useT();
  const a = c.pkg?.accident;
  if (!a) return null;
  return (
    <div className="policy-doc tr-cert pa-cert reveal">
      <div className="pd-head">
        <div>
          <b>Jacky ประกันภัย · Jacky Insurance</b>
          <div className="muted">{t('paCertTitle')}</div>
        </div>
        <div className="pd-no num">{c.policyNo}</div>
      </div>
      <dl>
        <div><dt>{t('insured')}</dt><dd>{c.customer.firstName} {c.customer.lastName}</dd></div>
        <div><dt>{t('idCard')}</dt><dd className="num">{c.customer.idCard}</dd></div>
        <div><dt>{t('paBirth')}</dt><dd className="num">{c.customer.birthDate ? toDmy(c.customer.birthDate) : '—'}</dd></div>
        <div><dt>{t('paOccupation')}</dt><dd>{occName(a.occupation, lang, a.occupationText)} ({t(CLASS_KEY[a.occClass])})</dd></div>
        <div><dt>{t('trBeneficiary')}</dt><dd>{c.customer.beneficiary || '—'}</dd></div>
        <div><dt>{t('trPlan')}</dt><dd>{paName(c.pkg!, lang)}</dd></div>
        <div><dt>{t('trPeriod')}</dt><dd>{periodText(a.start, a.end, lang)}</dd></div>
        {PA_COVER_KEYS.filter((k) => a.cover[k]).map((k) => (
          <div key={k}><dt>{t(PA_COVER_LABEL[k])}</dt><dd className="num">{fmtBaht(a.cover[k], lang)}{k === 'hospitalDaily' ? ` ${t('paPerDay')}` : ''}</dd></div>
        ))}
        <div><dt>{t('paMotorcycle')}</dt><dd>{a.motorcycle ? t('paMotorcycleOn') : t('paMotorcycleOff')}</dd></div>
        <div><dt>{t('premium')}</dt><dd className="num">{fmtBaht(c.premium ?? totalPremium(c) ?? 0, lang)}</dd></div>
      </dl>
      <div className="pd-foot muted">e-Policy · {fmtDateTime(c.stamps.issued ?? Date.now(), lang)} · DEMO</div>
    </div>
  );
}

/** Issued PA policy: expiry, renewal reminders (like motor) and a preview of the reminder email. */
export function PaRenewBox({ c }: { c: Case }) {
  const { t, lang } = useT();
  const s = useStore();
  const [sent, setSent] = useState(false);
  const a = c.pkg?.accident;
  if (!a) return null;
  const prod = s.paProducts.find((p) => p.id === a.productId);
  const endText = fmtDate(new Date(`${a.end}T12:00:00+07:00`).getTime(), lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const ageThen = c.customer.birthDate ? ageOn(c.customer.birthDate, a.end) : NaN;
  const tooOld = !!prod && Number.isFinite(ageThen) && ageThen + 1 > prod.renewAge;
  const rem = c.reminders ?? { renewal: true, tax: false };
  const nextPrice = c.premium ?? c.pkg?.premium ?? 0;
  return (
    <div className="renew-box pa-renew">
      <b>{t('renewTitle')}</b>
      <p className="hint">{tooOld ? t('paRenewTooOld', { date: endText, age: prod!.renewAge }) : t('paRenewLead', { date: endText, price: fmtBaht(nextPrice, lang) })}</p>
      <label className="check"><input id={`rr-${c.id}`} type="checkbox" checked={rem.renewal} onChange={(e) => setReminders(c.id, { ...rem, renewal: e.target.checked })} />{t('remindRenew')}</label>
      {sent ? (
        <p className="ok-note" role="status">✓ {t('renewSent')}</p>
      ) : (
        <button type="button" className="link" onClick={() => { sendRenewalPreview(c.id, nextPrice, endText); setSent(true); }}>{t('renewPreview')} →</button>
      )}
    </div>
  );
}

/* ---------------- applicant: age, job, add-on, health ---------------- */

export interface PaForm {
  birth: string;
  start: string;
  occupation: string;
  /** Description when the occupation is "other". */
  occOther: string;
  motorcycle: boolean;
  health: (boolean | null)[];
}

export const defaultPaForm = (): PaForm => ({ birth: '1990-05-15', start: dayKey(Date.now()), occupation: 'office', occOther: '', motorcycle: false, health: Array(HEALTH_QUESTIONS).fill(null) });

/** Validate the applicant; the result is what the plans are priced on. */
export function checkPa(f: PaForm, t: T, renewal = false) {
  const errors: Partial<Record<'birth' | 'start' | 'occupation' | 'health', string>> = {};
  if (!f.start || f.start < dayKey(Date.now())) errors.start = t('paErrStart');
  const age = f.birth && f.start ? ageOn(f.birth, f.start) : NaN;
  if (!Number.isFinite(age) || age < 0) errors.birth = t('trErrBirth');
  const occ = occupationById(f.occupation);
  if (!occ) errors.occupation = t('errRequired');
  else if (occ.cls === 4) errors.occupation = t('paErrOccupation');
  else if (occ.other && !f.occOther.trim()) errors.occupation = t('paErrOther');
  if (!renewal && f.health.some((x) => x === null)) errors.health = t('paErrHealth');
  const applicant: PaApplicant = { birth: f.birth, start: f.start, occupation: f.occupation, occupationText: f.occOther, motorcycle: f.motorcycle, health: f.health.map(Boolean), renewal };
  return { applicant, age, occ, errors };
}

/** Age range accepted by the plans on sale (for the age error). */
function ageRange(renewal: boolean) {
  const live = getPaProducts().filter((p) => !p.archived);
  return { min: Math.min(...live.map((p) => p.minAge)), max: Math.max(...live.map((p) => (renewal ? p.renewAge : p.maxAge))) };
}

export function PaFields({ f, set, errors, idPrefix = 'pa', renewal = false }: { f: PaForm; set: (p: Partial<PaForm>) => void; errors: ReturnType<typeof checkPa>['errors']; idPrefix?: string; renewal?: boolean }) {
  const { t, lang } = useT();
  const occ = occupationById(f.occupation);
  const age = f.birth && f.start ? ageOn(f.birth, f.start) : NaN;
  const mcPct = Math.max(0, ...getPaProducts().filter((p) => !p.archived).map((p) => p.motorcyclePct));
  return (
    <div className="tr-fields pa-fields">
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">1</span>{t('paAboutYou')}</div>
        <div className="tr-date-grid">
          <Field htmlFor={`${idPrefix}-birth`} label={t('paBirth')} error={errors.birth} hint={Number.isFinite(age) ? t('trAge', { n: age }) : undefined}>
            <DateInput id={`${idPrefix}-birth`} value={f.birth} max={dayKey(Date.now())} onChange={(v) => set({ birth: v })} invalid={!!errors.birth} />
          </Field>
          <Field htmlFor={`${idPrefix}-start`} label={t('paStart')} error={errors.start} hint={f.start ? t('paCoverTo', { date: fmtDate(new Date(`${paEnd(f.start)}T12:00:00+07:00`).getTime(), lang, { day: 'numeric', month: 'short', year: 'numeric' }) }) : undefined}>
            <DateInput id={`${idPrefix}-start`} value={f.start} min={dayKey(Date.now())} onChange={(v) => set({ start: v })} invalid={!!errors.start} />
          </Field>
          <Field htmlFor={`${idPrefix}-occ`} label={t('paOccupation')} error={errors.occupation} hint={occ ? (occ.other ? t('paOtherHint') : t(CLASS_KEY[occ.cls])) : undefined}>
            <select id={`${idPrefix}-occ`} value={f.occupation} onChange={(e) => set({ occupation: e.target.value })} aria-invalid={!!errors.occupation}>
              {([1, 2, 3, 4] as const).map((cls) => (
                <optgroup key={cls} label={t(CLASS_KEY[cls])}>
                  {OCCUPATIONS.filter((o) => o.cls === cls && !o.other).map((o) => <option key={o.id} value={o.id}>{o[lang]}</option>)}
                </optgroup>
              ))}
              {OCCUPATIONS.filter((o) => o.other).map((o) => <option key={o.id} value={o.id}>{o[lang]}</option>)}
            </select>
          </Field>
          {occ?.other && (
            <Field htmlFor={`${idPrefix}-occ-other`} label={t('paOtherLabel')}>
              <input id={`${idPrefix}-occ-other`} value={f.occOther} placeholder={t('paOtherPh')} onChange={(e) => set({ occOther: e.target.value })} aria-invalid={!!errors.occupation && !f.occOther.trim()} />
            </Field>
          )}
        </div>
      </div>
      {mcPct > 0 && (
        <div className="tr-sec">
          <div className="section-label"><span className="section-n">2</span>{t('paAddOn')}</div>
          <label className={`option-card pa-mc${f.motorcycle ? ' on' : ''}`}>
            <input id={`${idPrefix}-mc`} type="checkbox" checked={f.motorcycle} onChange={(e) => set({ motorcycle: e.target.checked })} />
            <span>
              <b>🏍️ {t('paMotorcycleAdd', { pct: mcPct })}</b>
              <small>{t('paMotorcycleHint')}</small>
            </span>
          </label>
        </div>
      )}
      {!renewal && (
        <div className="tr-sec">
          <div className="section-label"><span className="section-n">{mcPct > 0 ? 3 : 2}</span>{t('paHealthTitle')}</div>
          <ol className={`pa-health${errors.health ? ' invalid' : ''}`}>
            {HEALTH_KEYS.map((k, i) => (
              <li key={k}>
                <span>{t(k)}</span>
                <span className="pa-yn" role="radiogroup" aria-label={t(k)}>
                  {([false, true] as const).map((v) => (
                    <label key={String(v)} className={`chip-radio${f.health[i] === v ? ' on' : ''}`}>
                      <input type="radio" name={`${idPrefix}-q${i}`} id={`${idPrefix}-q${i}-${v ? 'yes' : 'no'}`} checked={f.health[i] === v} onChange={() => set({ health: f.health.map((x, j) => (j === i ? v : x)) })} />
                      {t(v ? 'paYes' : 'paNo')}
                    </label>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          {errors.health && <p className="error" role="alert">{errors.health}</p>}
          <p className="hint">{t('paHealthNote')}</p>
        </div>
      )}
    </div>
  );
}

/** Plan cards: price for the applicant's job class, main benefits. */
export function PaPlanCards({ pkgs, onChoose }: { pkgs: Package[]; onChoose: (p: Package) => void }) {
  const { t, lang } = useT();
  const products = getPaProducts();
  return (
    <div className="tr-plan-grid">
      {pkgs.map((p) => {
        const prod = products.find((x) => x.id === p.id);
        const hl = prod ? (lang === 'en' && prod.highlightsEn.length ? prod.highlightsEn : prod.highlightsTh) : [];
        const tag = prod ? (lang === 'en' && prod.tagEn ? prod.tagEn : prod.tagTh) : '';
        const a = p.accident!;
        return (
          <article key={p.id} className="tr-plan pa-plan">
            <header>
              <b>{paName(p, lang)}</b>
              {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
            </header>
            {tag && <p className="hint">{tag}</p>}
            <div className="tr-plan-price num">{fmtBaht(p.premium, lang)}<small> {t('perYear')}</small></div>
            <ul className="tr-plan-list">
              {PA_COVER_KEYS.map((k) => (
                <li key={k}><span>{t(PA_COVER_LABEL[k])}</span><b className="num">{coverValue(a.cover[k], t, lang)}{k === 'hospitalDaily' && a.cover[k] ? ` ${t('paPerDay')}` : ''}</b></li>
              ))}
            </ul>
            {hl.length > 0 && <ul className="ct-hl">{hl.map((h) => <li key={h}>{h}</li>)}</ul>}
            {a.motorcycle && <span className="chip tr-schengen-chip">🏍️ {t('paMotorcycleOn')}</span>}
            <button type="button" className="btn primary block" onClick={() => onChoose(p)}>{t('trChoose')}</button>
          </article>
        );
      })}
    </div>
  );
}

/* ---------------- insured person's details ---------------- */

const samplePerson = (birth: string): CustomerT => ({
  firstName: 'สมศรี',
  lastName: 'มีสุข',
  idCard: '1103700045678',
  phone: '0891234567',
  email: 'somsri@example.com',
  address: '88 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  plate: '',
  province: '',
  chassis: '',
  startDate: '',
  driver1: '',
  driver2: '',
  birthDate: birth,
  beneficiary: 'นายสมชาย มีสุข (คู่สมรส)',
});
const blankPerson = (birth: string): CustomerT => ({ ...samplePerson(birth), firstName: '', lastName: '', idCard: '', phone: '', email: '', address: '', beneficiary: '' });

export function usePaPersonForm(birth: string, initial?: Partial<CustomerT>, needDocs = true) {
  const { t } = useT();
  const [cust, setCust] = useState<CustomerT>(() => ({ ...blankPerson(birth), ...initial }));
  const [declared, setDeclared] = useState(false);
  // ID card copy: read by the (simulated) OCR and attached to the application. A renewal needs none.
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerT | 'declare' | 'docs', string>>>({});
  useEffect(() => setCust((c) => ({ ...c, birthDate: birth })), [birth]);
  const validate = (needDeclare = true): CustomerT | null => {
    const e: typeof errors = {};
    if (needDocs && !files.idcard) e.docs = t('paErrDocs');
    for (const k of ['firstName', 'lastName', 'idCard', 'phone', 'email', 'beneficiary'] as const) if (!(cust[k] ?? '').trim()) e[k] = t('errRequired');
    if (!e.idCard && !/^\d{13}$/.test(cust.idCard.replace(/[\s-]/g, ''))) e.idCard = t('errIdCard');
    if (!e.phone && !/^0\d{9}$/.test(cust.phone.replace(/[\s-]/g, ''))) e.phone = t('errPhone');
    if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email)) e.email = t('errEmail');
    if (needDeclare && !declared) e.declare = t('trErrDeclare');
    setErrors(e);
    if (Object.keys(e).length) return null;
    return { ...cust, idCard: cust.idCard.replace(/[\s-]/g, ''), phone: cust.phone.replace(/[\s-]/g, ''), beneficiary: (cust.beneficiary ?? '').trim(), birthDate: birth };
  };
  const fields = (idPrefix = 'pf', withDeclare = true) => {
    const input = (k: keyof CustomerT, label: TKey, opts: { optional?: boolean; type?: string; inputMode?: 'numeric' | 'tel' | 'email'; hint?: string } = {}) => (
      <Field key={k} htmlFor={`${idPrefix}-${k}`} label={<>{t(label)}{opts.optional && <span className="opt"> ({t('optional')})</span>}</>} error={errors[k]} hint={opts.hint}>
        <input id={`${idPrefix}-${k}`} type={opts.type ?? 'text'} inputMode={opts.inputMode} value={cust[k] ?? ''} onChange={(e) => setCust((c) => ({ ...c, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
      </Field>
    );
    return (
      <>
        {needDocs && (
          <OcrBox
            idPrefix={`${idPrefix}-ocr`}
            kinds={['id']}
            title={t('paDocsTitle')}
            lead={t('paDocsLead')}
            attached={files.idcard ? ['id'] : []}
            invalid={!!errors.docs}
            onRead={(kind, file) => {
              setCust((c) => ({ ...c, ...OCR_SAMPLE[kind] }));
              setFiles((f) => ({ ...f, [OCR_DOC[kind]]: file }));
            }}
          />
        )}
        {errors.docs && <p className="error" role="alert">{errors.docs}</p>}
        <div className="tr-form-grid">
          {input('firstName', 'firstName')}
          {input('lastName', 'lastName')}
          {input('idCard', 'idCard', { inputMode: 'numeric' })}
          {input('phone', 'phone', { type: 'tel', inputMode: 'tel' })}
          {input('email', 'email', { type: 'email', inputMode: 'email' })}
          {input('address', 'addrIdCard', { optional: true })}
          {input('beneficiary', 'trBeneficiary', { hint: t('paBeneficiaryHint') })}
        </div>
        {withDeclare && (
          <label className={`check tr-declare${errors.declare ? ' invalid' : ''}`}>
            <input id={`${idPrefix}-declare`} type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            <span>{t('paDeclare')}</span>
          </label>
        )}
        {withDeclare && errors.declare && <p className="error" role="alert">{errors.declare}</p>}
      </>
    );
  };
  const fillSample = () => {
    const sample = samplePerson(birth);
    setCust(sample);
    if (needDocs) setFiles({ idcard: fakeDocSync('idcard', { customer: sample }) });
  };
  return { cust, setCust, validate, fields, files, fillSample, setDeclared };
}

/* ---------------- customer buying flow ---------------- */

type PaStep = 'about' | 'plan' | 'form' | 'checkout' | 'sent';

function PaSteps({ step }: { step: PaStep }) {
  const { t } = useT();
  const order: [PaStep[], TKey][] = [[['about'], 'paStepAbout'], [['plan'], 'trStepPlan'], [['form'], 'paStepForm'], [['checkout', 'sent'], 'trStepPay']];
  const cur = order.findIndex(([s]) => s.includes(step));
  return (
    <ol className="steps" aria-label="steps">
      {order.map(([, key], i) => (
        <li key={key} className={i < cur ? 'done' : i === cur ? 'current' : ''} aria-current={i === cur ? 'step' : undefined}>
          <span className="step-n">{i < cur ? '✓' : i + 1}</span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Refusal or review notice for the applicant, if any. */
function PaNotice({ chk, pkgs, renewal = false }: { chk: ReturnType<typeof checkPa>; pkgs: Package[]; renewal?: boolean }) {
  const { t } = useT();
  if (chk.errors.occupation || chk.errors.birth || chk.errors.start) return null;
  if (!pkgs.length) {
    const r = ageRange(renewal);
    const live = getPaProducts().filter((p) => !p.archived);
    const why = live.length && live.every((p) => paRefusal(p, chk.applicant) === 'age') ? t('paErrAge', { min: r.min, max: r.max }) : t('trNoPlan');
    return <p className="callout tone-bad">{why}</p>;
  }
  if (pkgs[0].accident?.referral) return <p className="callout tone-warn pa-review-note">🔎 {t('paReviewNote')}</p>;
  return <p className="callout tone-good pa-instant-note">⚡ {t('paInstantNote')}</p>;
}

export function PaBuy({ renderCheckout, onTrack }: { renderCheckout: (id: string, restart: () => void) => React.ReactNode; onTrack: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [step, setStep] = useState<PaStep>('about');
  const [f, setF] = useState<PaForm>(defaultPaForm);
  const [tried, setTried] = useState(false);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const set = (p: Partial<PaForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkPa(f, t);
  const errors = tried ? chk.errors : {};
  const ok = !Object.keys(chk.errors).length;
  const pkgs = useMemo(() => (ok ? paPackages(chk.applicant, { channel: 'self' }) : []), [JSON.stringify(chk.applicant), ok, s.paProducts]);
  const form = usePaPersonForm(f.birth);
  useEffect(() => trackStep('visit'), []);

  const goPlans = () => {
    setTried(true);
    if (!ok || !pkgs.length) return;
    setStep('plan');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg?.accident) return;
    const customer = form.validate();
    if (!customer) return;
    const referral = pkg.accident.referral;
    // A referred application goes to the back office (like a Class 1 package); the rest pay and are issued at once.
    const id = submitCase({ source: referral ? 'package' : 'self', coverage: 'PA', pkg, addCmi: false, customer: { ...customer, startDate: pkg.accident.start }, docs: docMeta(form.files) });
    void storeFiles(id, form.files);
    setCaseId(id);
    setStep(referral ? 'sent' : 'checkout');
  };
  const restart = () => {
    setStep('about');
    setPkg(null);
    setCaseId(null);
    setTried(false);
  };

  return (
    <div className="buy travel pa">
      {step === 'about' && <HeroBanner img={HERO_IMG.pa} title={t('paTitle')} lead={t('paLead')} className="hero-pa" />}
      <PaSteps step={step} />

      {step === 'about' && (
        <section className="panel wide tr-panel">
          <h2>{t('paInfo')}</h2>
          <PaFields f={f} set={set} errors={errors} />
          {(tried || ok) && <PaNotice chk={chk} pkgs={pkgs} />}
          <div className="tr-next">
            {pkgs.length > 0 && <span className="teaser-price num">{t('trFrom', { price: fmtBaht(pkgs[0].premium, lang) })}</span>}
            <button type="button" className="btn primary" onClick={goPlans}>{t('trSeePlans')} →</button>
          </div>
        </section>
      )}

      {step === 'plan' && (
        <section className="panel wide tr-panel">
          <div className="panel-head">
            <div>
              <h2>{t('paPlanTitle')}</h2>
              <p className="lead">{occName(f.occupation, lang, f.occOther)} · {chk.occ ? t(CLASS_KEY[chk.occ.cls]) : ''} · {t('trAge', { n: chk.age })}{f.motorcycle ? ` · 🏍️ ${t('paMotorcycleOn')}` : ''}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={() => setStep('about')}>{t('trChange')}</button>
          </div>
          <PaNotice chk={chk} pkgs={pkgs} />
          <PaPlanCards pkgs={pkgs} onChoose={(p) => { setPkg(p); setStep('form'); }} />
          <details className="tr-compare">
            <summary>{t('trCompare')}</summary>
            <PaCoverTable pkgs={pkgs} onChoose={(p) => { setPkg(p); setStep('form'); }} />
          </details>
        </section>
      )}

      {step === 'form' && pkg?.accident && (
        <section className="panel wide tr-panel">
          <div className="panel-head">
            <div>
              <h2>{t('paFormTitle')}</h2>
              <p className="lead">{t('paFormLead')}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={form.fillSample}>{t('trSample')}</button>
          </div>
          <div className="tr-chosen">
            <b>{paName(pkg, lang)}</b>
            <span className="muted">{periodText(pkg.accident.start, pkg.accident.end, lang)}</span>
            <b className="num">{fmtBaht(pkg.premium, lang)}</b>
            <button type="button" className="link" onClick={() => setStep('plan')}>{t('trChange')}</button>
          </div>
          <form onSubmit={submit} noValidate>
            {form.fields()}
            <div className="actions">
              <button type="submit" className="btn primary">{t(pkg.accident.referral ? 'paSendReview' : 'trToPay')} →</button>
            </div>
          </form>
        </section>
      )}

      {step === 'checkout' && caseId && renderCheckout(caseId, restart)}

      {step === 'sent' && caseId && (
        <section className="panel wide done pa-sent">
          <div className="done-mark pop-in" aria-hidden="true">✓</div>
          <h2>{t('paSentTitle')}</h2>
          <div className="ref-big num">{caseId}</div>
          <p>{t('paSentLead')}</p>
          <div className="actions center">
            <button type="button" className="btn" onClick={() => onTrack(caseId)}>{t('paTrack')}</button>
            <button type="button" className="btn primary" onClick={restart}>{t('newRequest')}</button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- partner: sell or quote PA ---------------- */

/** A PA renewal the partner starts from the renewal list: the person and their plan are filled in. */
export interface PaPrefill {
  renewalOf: string;
  productId: string;
  form: Partial<PaForm>;
  customer: Partial<CustomerT>;
}

export const paPrefillFrom = (r: RenewalItem): PaPrefill | null => {
  if (!r.pa) return null;
  const [firstName, ...ln] = r.customerName.split(' ');
  return {
    renewalOf: r.id,
    productId: r.pa.productId,
    form: { birth: r.pa.birthDate, start: dayKey(Math.max(Date.now() + 86_400_000, r.expiry + 86_400_000)), occupation: r.pa.occupation, occOther: r.pa.occupationText ?? '', motorcycle: r.pa.motorcycle },
    customer: { firstName, lastName: ln.join(' '), phone: r.phone, idCard: r.pa.idCard, email: r.pa.email, beneficiary: 'ทายาทโดยธรรม' },
  };
};

/** Partner screen for PA: sell on the spot or send a quotation of up to three plans, as for motor and travel. */
export function PaSell({ agent, onCase, renderMade, initialPick, prefill }: { agent: Agent; onCase: (id: string) => void; renderMade: (id: string, again: () => void) => React.ReactNode; initialPick?: string; prefill?: PaPrefill | null }) {
  const { t, lang } = useT();
  const s = useStore();
  const renewal = !!prefill;
  const [f, setF] = useState<PaForm>(() => ({ ...defaultPaForm(), ...prefill?.form }));
  const [mode, setMode] = useState<'buy' | 'quote'>('buy');
  const first = prefill?.productId ?? initialPick;
  const [picked, setPicked] = useState<string[]>(first ? [first] : []);
  const [disc, setDisc] = useState(0);
  const [collect, setCollect] = useState<'link' | 'agent'>('link');
  const [consent, setConsent] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const pickedPlan = initialPick ? s.paProducts.find((p) => p.id === initialPick) : undefined;
  const set = (p: Partial<PaForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkPa(f, t, renewal);
  const ok = !Object.keys(chk.errors).length;
  const pkgs = useMemo(() => (ok ? paPackages(chk.applicant, { channel: 'partner', agentId: agent.id }) : []), [JSON.stringify(chk.applicant), ok, agent.id, s.paProducts]);
  const chosen = pkgs.filter((p) => picked.includes(p.id));
  const maxDisc = Math.round(Math.max(0, ...chosen.map((p) => rateOf(p) * 100)));
  // A renewal keeps the documents already on file.
  const form = usePaPersonForm(f.birth, prefill?.customer, !renewal);
  useEffect(() => {
    if (disc > maxDisc) setDisc(maxDisc);
  }, [maxDisc, disc]);

  const toggle = (id: string) => {
    setErr('');
    if (mode === 'buy') return setPicked([id]);
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  };
  const submit = async () => {
    if (!ok) return setErr(Object.values(chk.errors)[0] ?? t('trNoPlan'));
    if (!chosen.length) return setErr(t('agPickPkg'));
    const customer = form.validate(mode === 'buy');
    if (!customer) return setErr(t('agNeedCust'));
    if (mode === 'buy' && !consent) return setErr(t('agNeedConsent'));
    const options = chosen.map((p) => ({ pkg: p, addCmi: false }));
    const id = createProposal({ agentId: agent.id, customer: { ...customer, startDate: f.start }, options, discountPct: disc, renewalOf: prefill?.renewalOf, ...(renewal ? {} : { docs: docMeta(form.files) }) });
    if (!renewal) await storeFiles(id, form.files);
    if (mode === 'quote') return setMade(id);
    const caseId = acceptProposal(id, 0, 'agent', collect);
    if (caseId) onCase(caseId);
  };

  if (made) return <>{renderMade(made, () => { setMade(null); setPicked([]); })}</>;

  return (
    <div className="ag-sell tr-sell pa-sell">
      {pickedPlan && <p className="callout tone-info tr-picked">✓ {t('trPickedFromCatalog', { name: lang === 'en' ? pickedPlan.nameEn || pickedPlan.nameTh : pickedPlan.nameTh })}</p>}
      {renewal && <p className="callout tone-info">↻ {t('paRenewing')}</p>}
      <section className="card">
        <h3>🩹 {t('paInfo')}</h3>
        <PaFields f={f} set={set} errors={chk.errors} idPrefix="ag-pa" renewal={renewal} />
      </section>
      <section className="card ag-pkgs">
        <div className="card-head">
          <div>
            <h3>{t('paPlanTitle')}</h3>
            <p className="hint">{mode === 'buy' ? t('trBuyHint') : t('trQuoteHint', { n: chosen.length })}</p>
          </div>
          <Segmented id="ag-pa-mode" label={t('agMode')} value={mode} onChange={(m) => { setMode(m); setPicked((p) => (m === 'buy' ? p.slice(0, 1) : p)); setErr(''); }} options={[
            { value: 'buy', label: t('agModeBuy') },
            { value: 'quote', label: t('agModeQuote') },
          ]} />
        </div>
        {ok && <PaNotice chk={chk} pkgs={pkgs} renewal={renewal} />}
        {!ok || !pkgs.length ? (
          <p className="muted pad">{ok ? '' : Object.values(chk.errors)[0]}</p>
        ) : (
          <div className="table-wrap">
            <table className="data ag-pkg-table tr-ag-table">
              <thead>
                <tr>
                  <th aria-label={t('agSelect')} />
                  <th>{t('trPlan')}</th>
                  <th>{t('agCover')}</th>
                  <th className="r">{t('premium')}</th>
                  <th className="r ag-int">{t('agCommission')}</th>
                </tr>
              </thead>
              <tbody>
                {pkgs.map((p) => {
                  const on = picked.includes(p.id);
                  const pr = optionPrice({ pkg: p, addCmi: false }, 0);
                  return (
                    <tr key={p.id} className={on ? 'on' : ''} onClick={() => toggle(p.id)}>
                      <td><input type={mode === 'buy' ? 'radio' : 'checkbox'} name="ag-pa-pkg" aria-label={p.id} checked={on} onChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} /></td>
                      <td><b>{paName(p, lang)}</b>{p.accident?.motorcycle && <div className="hint">🏍️ {t('paMotorcycleOn')}</div>}</td>
                      <td className="muted">{t('pacMedical')} {fmtBaht(p.accident?.cover.medical ?? 0, lang)} · {t('pacHospital')} {fmtBaht(p.accident?.cover.hospitalDaily ?? 0, lang)}</td>
                      <td className="r num">{fmtBaht(p.premium, lang)}</td>
                      <td className="r num ag-int">{fmtBaht(Math.round(pr.commission), lang)} <span className="muted">({Math.round(rateOf(p) * 100)}%)</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {pkgs.length > 0 && (
        <section className="card ag-summary">
          <div className="ag-sum-grid">
            <div>
              <h3>{t('paInsured')}</h3>
              <div className="tr-ag-sample"><button type="button" className="btn small ghost" onClick={() => { form.fillSample(); form.setDeclared(true); }}>{t('trSample')}</button></div>
              {form.fields('ag-pf', mode === 'buy')}
            </div>
            <div>
              <h3>{t('agPrice')}</h3>
              <div className="field ag-disc">
                <label htmlFor="ag-pa-disc">{t('agDiscount')} <b className="num">{disc}%</b></label>
                <input id="ag-pa-disc" type="range" min={0} max={maxDisc} step={1} value={disc} disabled={!chosen.length} onChange={(e) => setDisc(Number(e.target.value))} />
                <div className="hint">{t('trDiscountHint', { max: maxDisc })}</div>
              </div>
              {chosen.length === 0 ? (
                <p className="muted">{t('agPickPkg')}</p>
              ) : (
                <ul className="ag-price-list">
                  {chosen.map((p) => {
                    const pr = optionPrice({ pkg: p, addCmi: false }, disc);
                    return (
                      <li key={p.id}>
                        <b>{paName(p, lang)}</b>
                        <span className="ag-price">
                          {pr.discount > 0 && <s className="muted num">{fmtBaht(pr.full, lang)}</s>}
                          <b className="num">{fmtBaht(pr.price, lang)}</b>
                        </span>
                        <span className="ag-int hint num">{t('agComNet', { gross: fmtBaht(Math.round(pr.commission), lang), disc: fmtBaht(pr.discount, lang), net: fmtBaht(Math.round(pr.net), lang) })}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {mode === 'buy' && (
                <>
                  <fieldset className="ag-collect">
                    <legend>{t('agCollect')}</legend>
                    <label className="check"><input type="radio" name="ag-pa-collect" checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
                    <label className="check"><input type="radio" name="ag-pa-collect" checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
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
