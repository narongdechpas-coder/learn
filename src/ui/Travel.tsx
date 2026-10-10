import { useEffect, useMemo, useState } from 'react';
import type { Agent, Case, Customer as CustomerT, Line, Package, TravelCover, Trip, TripType } from '../types';
import { COVER_KEYS, ageOn, getTravelProducts, makeTrip, travelPackages, tripRange, tripText } from '../data/travel';
import { fmtBaht, fmtDate, fmtDateTime, useT, type TKey } from '../i18n';
import { acceptProposal, createProposal, submitCase, totalPremium, trackStep, useStore } from '../store';
import { optionPrice, rateOf } from '../data/agents';
import { dayKey } from '../lib/time';
import { Field, Segmented } from './common';
import { productName } from './Products';
import { HERO_IMG, HeroBanner } from './HeroBanner';

type T = ReturnType<typeof useT>['t'];

export const COVER_LABEL: Record<keyof TravelCover, TKey> = {
  medical: 'trcMedical',
  death: 'trcDeath',
  evacuation: 'trcEvacuation',
  tripCancel: 'trcTripCancel',
  baggage: 'trcBaggage',
  baggageDelay: 'trcBaggageDelay',
  flightDelay: 'trcFlightDelay',
  liability: 'trcLiability',
};

/* ---------------- home page ---------------- */

const LINES: { line: Line; icon: string; title: TKey; desc: TKey; live: boolean }[] = [
  { line: 'motor', icon: '🚗', title: 'lineMotor', desc: 'lineMotorDesc', live: true },
  { line: 'travel', icon: '✈️', title: 'lineTravel', desc: 'lineTravelDesc', live: true },
  { line: 'pa', icon: '🩹', title: 'linePa', desc: 'linePaDesc', live: false },
  { line: 'fire', icon: '🏠', title: 'lineFire', desc: 'lineFireDesc', live: false },
];

/** Customer navigation between lines of business; lines not on sale yet are shown but disabled. */
export function LineNav({ line, onPick }: { line: Line | null; onPick: (l: Line | null) => void }) {
  const { t } = useT();
  return (
    <nav className="line-nav" aria-label={t('lineNavLabel')}>
      <button type="button" className={`ln-item${line === null ? ' on' : ''}`} aria-current={line === null ? 'page' : undefined} onClick={() => onPick(null)}>
        <span aria-hidden="true">🏠</span> {t('lineNavHome')}
      </button>
      {LINES.map((x) => (
        <button
          key={x.line}
          type="button"
          className={`ln-item ln-${x.line}${line === x.line ? ' on' : ''}${x.live ? '' : ' soon'}`}
          aria-current={line === x.line ? 'page' : undefined}
          disabled={!x.live}
          onClick={() => onPick(x.line)}
        >
          <span aria-hidden="true">{x.icon}</span> {t(x.title)}
          {!x.live && <small className="ln-soon">{t('lineNavSoon')}</small>}
        </button>
      ))}
    </nav>
  );
}

/** Customer home: one card per line of business; lines not on sale yet carry a "Coming soon" mark. */
export function ProductHome({ onPick }: { onPick: (l: Line) => void }) {
  const { t } = useT();
  return (
    <>
    <HeroBanner img={HERO_IMG.home} title={t('homeTitle')} lead={t('homeLead')} className="hero-home" />
    <section className="panel wide line-home">
      <div className="line-grid">
        {LINES.map((x) =>
          x.live ? (
            <button key={x.line} type="button" className={`line-card line-${x.line}`} onClick={() => onPick(x.line)}>
              <img className="line-thumb" src={HERO_IMG[x.line]} alt="" loading="lazy" />
              <span className="line-icon" aria-hidden="true">{x.icon}</span>
              <b>{t(x.title)}</b>
              <span className="line-desc">{t(x.desc)}</span>
              <span className="line-go">{t('homeStart')} →</span>
            </button>
          ) : (
            <div key={x.line} className={`line-card line-${x.line} soon`} aria-disabled="true">
              <img className="line-thumb" src={HERO_IMG[x.line]} alt="" loading="lazy" />
              <span className="line-icon" aria-hidden="true">{x.icon}</span>
              <b>{t(x.title)}</b>
              <span className="line-desc">{t(x.desc)}</span>
              <span className="soon-mark" aria-label={t('comingSoon')}>{t('comingSoon')}</span>
            </div>
          ),
        )}
      </div>
    </section>
    </>
  );
}

/* ---------------- shared pieces ---------------- */

export const coverValue = (v: number, t: T, lang: 'th' | 'en') => (v ? fmtBaht(v, lang) : t('trNotCovered'));

/** Plans side by side: one column per plan, one row per benefit. */
export function TravelCoverTable({ pkgs, chosen, onChoose, priceLabel }: { pkgs: Package[]; chosen?: string; onChoose?: (p: Package) => void; priceLabel?: (p: Package) => string }) {
  const { t, lang } = useT();
  return (
    <div className="table-wrap tr-table-wrap">
      <table className="data tr-cover-table">
        <thead>
          <tr>
            <th>{t('coverage')}</th>
            {pkgs.map((p) => (
              <th key={p.id} className={`r${p.id === chosen ? ' pick' : ''}`}>{productName({ nameTh: p.nameTh, nameEn: p.nameEn, type: 'TRV' }, lang)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COVER_KEYS.map((k) => (
            <tr key={k}>
              <th>{t(COVER_LABEL[k])}</th>
              {pkgs.map((p) => (
                <td key={p.id} className={`r num${p.id === chosen ? ' pick' : ''}`}>{coverValue(p.travel?.cover[k] ?? 0, t, lang)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <th>{t('trSchengen')}</th>
            {pkgs.map((p) => (
              <td key={p.id} className={`r${p.id === chosen ? ' pick' : ''}`}>{p.travel?.schengen ? `✓ ${t('trYes')}` : t('trNo')}</td>
            ))}
          </tr>
          <tr className="tr-price-row">
            <th>{t('premium')}</th>
            {pkgs.map((p) => (
              <td key={p.id} className={`r num${p.id === chosen ? ' pick' : ''}`}><b>{priceLabel ? priceLabel(p) : fmtBaht(p.premium, lang)}</b></td>
            ))}
          </tr>
          {onChoose && (
            <tr>
              <th />
              {pkgs.map((p) => (
                <td key={p.id} className="r">
                  <button type="button" className="btn small primary" onClick={() => onChoose(p)}>{t('trChoose')}</button>
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Trip and traveller details of a travel case (back office, partner, customer). */
export function TravelKv({ c }: { c: Case }) {
  const { t, lang } = useT();
  const tr = c.pkg?.travel;
  if (!tr) return null;
  const total = totalPremium(c);
  const age = c.customer.birthDate ? ageOn(c.customer.birthDate, tr.trip.start) : NaN;
  return (
    <dl className="kv">
      <dt>{t('trPlan')}</dt>
      <dd>{productName({ nameTh: c.pkg?.nameTh, nameEn: c.pkg?.nameEn, type: 'TRV' }, lang)}{c.pkg?.ver ? <span className="muted"> · v{c.pkg.ver}</span> : null}</dd>
      <dt>{t('trType')}</dt>
      <dd>{t(tr.trip.type === 'annual' ? 'trAnnual' : 'trSingle')}</dd>
      <dt>{t('trZone')}</dt>
      <dd>{lang === 'th' ? tr.trip.zoneTh : tr.trip.zoneEn}{tr.trip.dest ? ` · ${tr.trip.dest}` : ''}</dd>
      <dt>{t('trPeriod')}</dt>
      <dd>{tripRange(tr.trip, lang)} <span className="muted">({t('trDays', { n: tr.trip.days })})</span></dd>
      <dt>{t('trBirth')}</dt>
      <dd>{c.customer.birthDate ?? '—'}{Number.isFinite(age) ? <span className="muted"> · {t('trAge', { n: age })}</span> : null}</dd>
      <dt>{t('trPassport')}</dt>
      <dd className="num">{c.customer.passport || '—'}</dd>
      {c.customer.beneficiary && (<><dt>{t('trBeneficiary')}</dt><dd>{c.customer.beneficiary}</dd></>)}
      <dt>{t('trcMedical')}</dt>
      <dd className="num">{fmtBaht(tr.cover.medical, lang)}</dd>
      <dt>{t('trSchengen')}</dt>
      <dd>{tr.schengen ? `✓ ${t('trYes')}` : t('trNo')}</dd>
      <dt>{t('premium')}</dt>
      <dd className="num">{total !== undefined ? fmtBaht(total, lang) : '—'}</dd>
      {c.policyNo && (<><dt>Policy</dt><dd className="num">{c.policyNo}</dd></>)}
      {c.payment && (<><dt>{t('paidBy')}</dt><dd>{t(c.payment.method === 'qr' ? 'payQr' : 'payCard')}</dd></>)}
    </dl>
  );
}

/** Policy schedule and certificate of insurance (with the Schengen statement when it applies). */
export function TravelCertificate({ c }: { c: Case }) {
  const { t, lang } = useT();
  const tr = c.pkg?.travel;
  if (!tr) return null;
  return (
    <div className="policy-doc tr-cert reveal">
      <div className="pd-head">
        <div>
          <b>Jacky ประกันภัย · Jacky Insurance</b>
          <div className="muted">{t('trCertTitle')}</div>
        </div>
        <div className="pd-no num">{c.policyNo}</div>
      </div>
      <dl>
        <div><dt>{t('insured')}</dt><dd>{c.customer.firstName} {c.customer.lastName}</dd></div>
        <div><dt>{t('trPassport')}</dt><dd className="num">{c.customer.passport || '—'}</dd></div>
        <div><dt>{t('trBirth')}</dt><dd className="num">{c.customer.birthDate ?? '—'}</dd></div>
        <div><dt>{t('trPlan')}</dt><dd>{productName({ nameTh: c.pkg?.nameTh, nameEn: c.pkg?.nameEn, type: 'TRV' }, lang)} · {t(tr.trip.type === 'annual' ? 'trAnnual' : 'trSingle')}</dd></div>
        <div><dt>{t('trZone')}</dt><dd>{lang === 'th' ? tr.trip.zoneTh : tr.trip.zoneEn}{tr.trip.dest ? ` · ${tr.trip.dest}` : ''}</dd></div>
        <div><dt>{t('trPeriod')}</dt><dd>{tripRange(tr.trip, lang)} ({t('trDays', { n: tr.trip.days })})</dd></div>
        {COVER_KEYS.filter((k) => tr.cover[k]).map((k) => (
          <div key={k}><dt>{t(COVER_LABEL[k])}</dt><dd className="num">{fmtBaht(tr.cover[k], lang)}</dd></div>
        ))}
        <div><dt>{t('premium')}</dt><dd className="num">{fmtBaht(c.premium ?? totalPremium(c) ?? 0, lang)}</dd></div>
      </dl>
      {tr.schengen && <p className="tr-schengen">✓ {t('trCertSchengen')}</p>}
      <div className="pd-foot muted">e-Policy · {fmtDateTime(c.stamps.issued ?? Date.now(), lang)} · DEMO</div>
    </div>
  );
}

/* ---------------- customer buying flow ---------------- */

/** Trip details shared by the customer and partner screens. */
export interface TripForm {
  type: TripType;
  zoneId: string;
  dest: string;
  start: string;
  end: string;
  birth: string;
}

const addDays = (d: string, n: number) => dayKey(new Date(`${d}T12:00:00+07:00`).getTime() + n * 86_400_000);
export const defaultTripForm = (): TripForm => {
  const start = addDays(dayKey(Date.now()), 14);
  return { type: 'single', zoneId: 'asia', dest: '', start, end: addDays(start, 6), birth: '1990-05-15' };
};

/** Validate a trip form and work out the trip and the traveller's age. */
export function checkTrip(f: TripForm, t: T) {
  const errors: Partial<Record<'dates' | 'start' | 'birth', string>> = {};
  if (!f.start || f.start < dayKey(Date.now())) errors.start = t('trErrStart');
  const trip = makeTrip(f.type, f.zoneId, f.start, f.end, f.dest.trim());
  if (f.type === 'single' && !trip) errors.dates = t('trErrDates');
  const age = f.birth && f.start ? ageOn(f.birth, f.start) : NaN;
  if (!Number.isFinite(age) || age < 0) errors.birth = t('trErrBirth');
  return { trip, age, errors };
}

/** Trip type, zone, dates and date of birth. */
export function TripFields({ f, set, errors, idPrefix = 'tr' }: { f: TripForm; set: (p: Partial<TripForm>) => void; errors: ReturnType<typeof checkTrip>['errors']; idPrefix?: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const trip = makeTrip(f.type, f.zoneId, f.start, f.end);
  return (
    <div className="tr-fields">
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">1</span>{t('trType')}</div>
        <div className="option-grid" role="radiogroup" aria-label={t('trType')}>
          {(['single', 'annual'] as const).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={f.type === x} className={`option-card${f.type === x ? ' on' : ''}`} onClick={() => set({ type: x })}>
              <span className="radio-dot" aria-hidden="true" />
              <span>
                <b>{t(x === 'single' ? 'trSingle' : 'trAnnual')}</b>
                <small>{t(x === 'single' ? 'trSingleHint' : 'trAnnualHint')}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">2</span>{t('trZone')}</div>
        <div className="tr-zone-grid" role="radiogroup" aria-label={t('trZone')}>
          {s.travelZones.map((z) => (
            <button key={z.id} type="button" role="radio" aria-checked={f.zoneId === z.id} className={`option-card tr-zone${f.zoneId === z.id ? ' on' : ''}`} onClick={() => set({ zoneId: z.id })}>
              <span className="radio-dot" aria-hidden="true" />
              <span>
                <b>{lang === 'th' ? z.nameTh : z.nameEn}</b>
                <small>{lang === 'th' ? z.noteTh : z.noteEn}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">3</span>{t('trPeriod')}</div>
        <div className="tr-date-grid">
          <Field htmlFor={`${idPrefix}-start`} label={t('trStart')} error={errors.start}>
            <input id={`${idPrefix}-start`} type="date" value={f.start} min={dayKey(Date.now())} onChange={(e) => set({ start: e.target.value })} aria-invalid={!!errors.start} />
          </Field>
          {f.type === 'single' ? (
            <Field htmlFor={`${idPrefix}-end`} label={t('trEnd')} error={errors.dates} hint={trip ? t('trDays', { n: trip.days }) : undefined}>
              <input id={`${idPrefix}-end`} type="date" value={f.end} min={f.start} onChange={(e) => set({ end: e.target.value })} aria-invalid={!!errors.dates} />
            </Field>
          ) : (
            <div className="tr-annual-to">
              <span className="field-label">{t('trEnd')}</span>
              <span className="hint">{trip ? t('trCoverTo', { date: fmtDate(new Date(`${trip.end}T12:00:00+07:00`).getTime(), lang, { day: 'numeric', month: 'short', year: 'numeric' }) }) : '—'} · {t('trAnnualNote')}</span>
            </div>
          )}
          <Field htmlFor={`${idPrefix}-dest`} label={<>{t('trDest')} <span className="opt">({t('optional')})</span></>}>
            <input id={`${idPrefix}-dest`} value={f.dest} placeholder={t('trDestPh')} onChange={(e) => set({ dest: e.target.value })} />
          </Field>
          <Field htmlFor={`${idPrefix}-birth`} label={t('trBirth')} error={errors.birth} hint={f.birth && f.start && Number.isFinite(ageOn(f.birth, f.start)) ? t('trAge', { n: ageOn(f.birth, f.start) }) : undefined}>
            <input id={`${idPrefix}-birth`} type="date" value={f.birth} max={dayKey(Date.now())} onChange={(e) => set({ birth: e.target.value })} aria-invalid={!!errors.birth} />
          </Field>
        </div>
      </div>
    </div>
  );
}

/** Plan cards for a trip: price, main benefits, Schengen mark. */
export function PlanCards({ pkgs, chosen, onChoose, priceOf }: { pkgs: Package[]; chosen?: string; onChoose: (p: Package) => void; priceOf?: (p: Package) => number }) {
  const { t, lang } = useT();
  const products = getTravelProducts();
  return (
    <div className="tr-plan-grid">
      {pkgs.map((p) => {
        const prod = products.find((x) => x.id === p.id);
        const hl = prod ? (lang === 'en' && prod.highlightsEn.length ? prod.highlightsEn : prod.highlightsTh) : [];
        const tag = prod ? (lang === 'en' && prod.tagEn ? prod.tagEn : prod.tagTh) : '';
        return (
          <article key={p.id} className={`tr-plan${p.id === chosen ? ' on' : ''}`}>
            <header>
              <b>{productName({ nameTh: p.nameTh, nameEn: p.nameEn, type: 'TRV' }, lang)}</b>
              {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
            </header>
            {tag && <p className="hint">{tag}</p>}
            <div className="tr-plan-price num">{fmtBaht(priceOf ? priceOf(p) : p.premium, lang)}<small> {t(p.travel?.trip.type === 'annual' ? 'perYear' : 'trPerTrip')}</small></div>
            <ul className="tr-plan-list">
              <li><span>{t('trcMedical')}</span><b className="num">{fmtBaht(p.travel?.cover.medical ?? 0, lang)}</b></li>
              <li><span>{t('trcDeath')}</span><b className="num">{fmtBaht(p.travel?.cover.death ?? 0, lang)}</b></li>
              <li><span>{t('trcTripCancel')}</span><b className="num">{coverValue(p.travel?.cover.tripCancel ?? 0, t, lang)}</b></li>
            </ul>
            {hl.length > 0 && <ul className="ct-hl">{hl.map((h) => <li key={h}>{h}</li>)}</ul>}
            {p.travel?.schengen && <span className="chip tr-schengen-chip">✓ {t('trSchengen')}</span>}
            <button type="button" className="btn primary block" onClick={() => onChoose(p)}>{t('trChoose')}</button>
          </article>
        );
      })}
    </div>
  );
}

const sampleTraveller = (birth: string): CustomerT => ({
  firstName: 'Somchai',
  lastName: 'Jaidee',
  idCard: '1103700012345',
  phone: '0812345678',
  email: 'somchai@example.com',
  address: '',
  plate: '',
  province: '',
  chassis: '',
  startDate: '',
  driver1: '',
  driver2: '',
  passport: 'AA1234567',
  birthDate: birth,
  beneficiary: 'ทายาทโดยธรรม',
});

const blankTraveller = (birth: string): CustomerT => ({ ...sampleTraveller(birth), firstName: '', lastName: '', idCard: '', phone: '', email: '', passport: '', beneficiary: '' });

type TravelStep = 'trip' | 'plan' | 'form' | 'checkout';

function TravelSteps({ step }: { step: TravelStep }) {
  const { t } = useT();
  const order: [TravelStep, TKey][] = [['trip', 'trStepTrip'], ['plan', 'trStepPlan'], ['form', 'trStepForm'], ['checkout', 'trStepPay']];
  const cur = order.findIndex(([s]) => s === step);
  return (
    <ol className="steps" aria-label="steps">
      {order.map(([s, key], i) => (
        <li key={s} className={i < cur ? 'done' : i === cur ? 'current' : ''} aria-current={i === cur ? 'step' : undefined}>
          <span className="step-n">{i < cur ? '✓' : i + 1}</span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Traveller details form; returns the cleaned customer, or null with errors shown. */
export function useTravellerForm(birth: string) {
  const { t } = useT();
  const [cust, setCust] = useState<CustomerT>(() => blankTraveller(birth));
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerT | 'declare', string>>>({});
  useEffect(() => setCust((c) => ({ ...c, birthDate: birth })), [birth]);
  const validate = (needDeclare = true): CustomerT | null => {
    const e: typeof errors = {};
    for (const k of ['firstName', 'lastName', 'idCard', 'phone', 'email', 'passport'] as const) if (!(cust[k] ?? '').trim()) e[k] = t('errRequired');
    if (!e.idCard && !/^\d{13}$/.test(cust.idCard.replace(/[\s-]/g, ''))) e.idCard = t('errIdCard');
    if (!e.phone && !/^0\d{9}$/.test(cust.phone.replace(/[\s-]/g, ''))) e.phone = t('errPhone');
    if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email)) e.email = t('errEmail');
    if (!e.passport && !/^[A-Z0-9]{6,9}$/i.test((cust.passport ?? '').trim())) e.passport = t('trErrPassport');
    if (needDeclare && !declared) e.declare = t('trErrDeclare');
    setErrors(e);
    if (Object.keys(e).length) return null;
    return { ...cust, idCard: cust.idCard.replace(/[\s-]/g, ''), phone: cust.phone.replace(/[\s-]/g, ''), passport: (cust.passport ?? '').trim().toUpperCase(), birthDate: birth };
  };
  const fields = (idPrefix = 'tf', withDeclare = true) => {
    const input = (k: keyof CustomerT, label: TKey, opts: { optional?: boolean; type?: string; inputMode?: 'numeric' | 'tel' | 'email' } = {}) => (
      <Field key={k} htmlFor={`${idPrefix}-${k}`} label={<>{t(label)}{opts.optional && <span className="opt"> ({t('optional')})</span>}</>} error={errors[k]}>
        <input id={`${idPrefix}-${k}`} type={opts.type ?? 'text'} inputMode={opts.inputMode} value={cust[k] ?? ''} onChange={(e) => setCust((c) => ({ ...c, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
      </Field>
    );
    return (
      <>
        <div className="tr-form-grid">
          {input('firstName', 'firstName')}
          {input('lastName', 'lastName')}
          {input('passport', 'trPassport')}
          {input('idCard', 'idCard', { inputMode: 'numeric' })}
          {input('phone', 'phone', { type: 'tel', inputMode: 'tel' })}
          {input('email', 'email', { type: 'email', inputMode: 'email' })}
          {input('beneficiary', 'trBeneficiary', { optional: true })}
        </div>
        {withDeclare && (
          <label className={`check tr-declare${errors.declare ? ' invalid' : ''}`}>
            <input id={`${idPrefix}-declare`} type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            <span>{t('trDeclare')}</span>
          </label>
        )}
        {withDeclare && errors.declare && <p className="error" role="alert">{errors.declare}</p>}
      </>
    );
  };
  return { cust, setCust, validate, fields, fillSample: () => setCust(sampleTraveller(birth)), setDeclared };
}

export function TravelBuy({ onHome, renderCheckout }: { onHome: () => void; renderCheckout: (id: string, restart: () => void) => React.ReactNode }) {
  const { t, lang } = useT();
  const s = useStore();
  const [step, setStep] = useState<TravelStep>('trip');
  const [f, setF] = useState<TripForm>(defaultTripForm);
  const [tried, setTried] = useState(false);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const set = (p: Partial<TripForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkTrip(f, t);
  const errors = tried ? chk.errors : {};
  const maxAge = Math.max(0, ...s.travelProducts.filter((p) => !p.archived).map((p) => p.maxAge));
  const pkgs = useMemo(() => (chk.trip && Number.isFinite(chk.age) ? travelPackagesSelf(chk.trip, chk.age) : []), [JSON.stringify(chk.trip), chk.age, s.travelProducts]);
  const form = useTravellerForm(f.birth);
  useEffect(() => trackStep('visit'), []);

  const goPlans = () => {
    setTried(true);
    if (Object.keys(chk.errors).length || !chk.trip) return;
    setStep('plan');
  };
  const choose = (p: Package) => {
    setPkg(p);
    setStep('form');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    const customer = form.validate();
    if (!customer) return;
    const id = submitCase({ source: 'self', coverage: 'TRV', pkg, addCmi: false, customer: { ...customer, startDate: pkg.travel?.trip.start ?? '' } });
    setCaseId(id);
    setStep('checkout');
  };
  const restart = () => {
    setStep('trip');
    setPkg(null);
    setCaseId(null);
    setTried(false);
  };
  const tooOld = chk.trip && Number.isFinite(chk.age) && chk.age > maxAge;

  return (
    <div className="buy travel">
      {step === 'trip' && <HeroBanner img={HERO_IMG.travel} title={t('trTitle')} lead={t('trLead')} className="hero-travel" />}
      <TravelSteps step={step} />

      {step === 'trip' && (
        <section className="panel wide tr-panel">
          <h2>{t('trInfo')}</h2>
          <TripFields f={f} set={set} errors={errors} />
          <div className="tr-next">
            {chk.trip && pkgs.length > 0 && <span className="teaser-price num">{t('trFrom', { price: fmtBaht(Math.min(...pkgs.map((p) => p.premium)), lang) })}</span>}
            {tooOld && <span className="error">{t('trErrAge', { n: maxAge })}</span>}
            <button type="button" className="btn primary" onClick={goPlans} disabled={!!tooOld}>{t('trSeePlans')} →</button>
          </div>
        </section>
      )}

      {step === 'plan' && chk.trip && (
        <section className="panel wide tr-panel">
          <div className="panel-head">
            <div>
              <h2>{t('trPlanTitle')}</h2>
              <p className="lead">{tripText(chk.trip, lang)} · {tripRange(chk.trip, lang)} · {t('trAge', { n: chk.age })}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={() => setStep('trip')}>{t('trChange')}</button>
          </div>
          {pkgs.length === 0 ? (
            <p className="muted">{t('trNoPlan')}</p>
          ) : (
            <>
              <PlanCards pkgs={pkgs} onChoose={choose} />
              <details className="tr-compare">
                <summary>{t('trCompare')}</summary>
                <TravelCoverTable pkgs={pkgs} onChoose={choose} />
              </details>
              {loadNote(t, chk.age)}
            </>
          )}
        </section>
      )}

      {step === 'form' && pkg && pkg.travel && (
        <section className="panel wide tr-panel">
          <div className="panel-head">
            <div>
              <h2>{t('trFormTitle')}</h2>
              <p className="lead">{t('trFormLead')}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={form.fillSample}>{t('trSample')}</button>
          </div>
          <div className="tr-chosen">
            <b>{productName({ nameTh: pkg.nameTh, nameEn: pkg.nameEn, type: 'TRV' }, lang)}</b>
            <span className="muted">{tripText(pkg.travel.trip, lang)} · {tripRange(pkg.travel.trip, lang)}</span>
            <b className="num">{fmtBaht(pkg.premium, lang)}</b>
            <button type="button" className="link" onClick={() => setStep('plan')}>{t('trChange')}</button>
          </div>
          <form onSubmit={submit} noValidate>
            {form.fields()}
            <div className="actions">
              <button type="submit" className="btn primary">{t('trToPay')} →</button>
            </div>
          </form>
        </section>
      )}

      {step === 'checkout' && caseId && renderCheckout(caseId, restart)}
    </div>
  );
}

/** Self-service plans (customer website channel). */
const travelPackagesSelf = (trip: Trip, age: number) => travelPackages(trip, age, { channel: 'self' });

/** Note about the older-traveller loading, when it applies. */
export function loadNote(t: T, age: number) {
  const p = getTravelProducts().find((x) => !x.archived && x.loadPct && age > x.loadAge);
  return p ? <p className="hint">{t('trOlderLoad', { age: p.loadAge, pct: p.loadPct })}</p> : null;
}


/* ---------------- partner: sell or quote travel ---------------- */

/**
 * Partner screen for travel: same rules as motor. Sell on the spot (one plan, the customer agrees in
 * person) or send a quotation of up to three plans; the discount comes out of the partner's commission.
 */
export function TravelSell({ agent, onCase, renderMade }: { agent: Agent; onCase: (id: string) => void; renderMade: (id: string, again: () => void) => React.ReactNode }) {
  const { t, lang } = useT();
  const s = useStore();
  const [f, setF] = useState<TripForm>(defaultTripForm);
  const [mode, setMode] = useState<'buy' | 'quote'>('buy');
  const [picked, setPicked] = useState<string[]>([]);
  const [disc, setDisc] = useState(0);
  const [collect, setCollect] = useState<'link' | 'agent'>('link');
  const [consent, setConsent] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const set = (p: Partial<TripForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkTrip(f, t);
  const pkgs = useMemo(
    () => (chk.trip && Number.isFinite(chk.age) ? travelPackages(chk.trip, chk.age, { channel: 'partner', agentId: agent.id }) : []),
    [JSON.stringify(chk.trip), chk.age, agent.id, s.travelProducts],
  );
  const chosen = pkgs.filter((p) => picked.includes(p.id));
  const maxDisc = Math.round(Math.max(0, ...chosen.map((p) => rateOf(p) * 100)));
  const form = useTravellerForm(f.birth);
  useEffect(() => {
    if (disc > maxDisc) setDisc(maxDisc);
  }, [maxDisc, disc]);

  const toggle = (id: string) => {
    setErr('');
    if (mode === 'buy') return setPicked([id]);
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  };
  const submit = () => {
    if (Object.keys(chk.errors).length || !chk.trip) return setErr(Object.values(chk.errors)[0] ?? t('trErrDates'));
    if (!chosen.length) return setErr(t('agPickPkg'));
    const customer = form.validate(mode === 'buy');
    if (!customer) return setErr(t('agNeedCust'));
    if (mode === 'buy' && !consent) return setErr(t('agNeedConsent'));
    const options = chosen.map((p) => ({ pkg: p, addCmi: false }));
    const id = createProposal({ agentId: agent.id, customer: { ...customer, startDate: chk.trip.start }, options, discountPct: disc });
    if (mode === 'quote') return setMade(id);
    const caseId = acceptProposal(id, 0, 'agent', collect);
    if (caseId) onCase(caseId);
  };

  if (made) return <>{renderMade(made, () => { setMade(null); setPicked([]); })}</>;

  return (
    <div className="ag-sell tr-sell">
      <section className="card">
        <h3>✈️ {t('trTrip')}</h3>
        <TripFields f={f} set={set} errors={chk.errors} idPrefix="ag-tr" />
      </section>
      <section className="card ag-pkgs">
        <div className="card-head">
          <div>
            <h3>{t('trPlanTitle')}</h3>
            <p className="hint">{mode === 'buy' ? t('agBuyHint') : t('trQuoteHint', { n: chosen.length })}</p>
          </div>
          <Segmented id="ag-tr-mode" label={t('agMode')} value={mode} onChange={(m) => { setMode(m); setPicked((p) => (m === 'buy' ? p.slice(0, 1) : p)); setErr(''); }} options={[
            { value: 'buy', label: t('agModeBuy') },
            { value: 'quote', label: t('agModeQuote') },
          ]} />
        </div>
        {!chk.trip || !pkgs.length ? (
          <p className="muted pad">{chk.trip ? t('trNoPlan') : t('trErrDates')}</p>
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
                      <td><input type={mode === 'buy' ? 'radio' : 'checkbox'} name="ag-tr-pkg" aria-label={p.id} checked={on} onChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} /></td>
                      <td><b>{productName({ nameTh: p.nameTh, nameEn: p.nameEn, type: 'TRV' }, lang)}</b>{p.travel?.schengen && <div className="hint">✓ {t('trSchengen')}</div>}</td>
                      <td className="muted">{t('trcMedical')} {fmtBaht(p.travel?.cover.medical ?? 0, lang)} · {t('trcTripCancel')} {coverValue(p.travel?.cover.tripCancel ?? 0, t, lang)}</td>
                      <td className="r num">{fmtBaht(p.premium, lang)}</td>
                      <td className="r num ag-int">{fmtBaht(Math.round(pr.commission), lang)} <span className="muted">({Math.round(rateOf(p) * 100)}%)</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {chk.trip && Number.isFinite(chk.age) && loadNote(t, chk.age)}
      </section>
      {chk.trip && pkgs.length > 0 && (
        <section className="card ag-summary">
          <div className="ag-sum-grid">
            <div>
              <h3>{t('trTraveller')}</h3>
              <div className="tr-ag-sample"><button type="button" className="btn small ghost" onClick={() => { form.fillSample(); form.setDeclared(true); }}>{t('trSample')}</button></div>
              {form.fields('ag-tf', mode === 'buy')}
            </div>
            <div>
              <h3>{t('agPrice')}</h3>
              <div className="field ag-disc">
                <label htmlFor="ag-tr-disc">{t('agDiscount')} <b className="num">{disc}%</b></label>
                <input id="ag-tr-disc" type="range" min={0} max={maxDisc} step={1} value={disc} disabled={!chosen.length} onChange={(e) => setDisc(Number(e.target.value))} />
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
                        <b>{productName({ nameTh: p.nameTh, nameEn: p.nameEn, type: 'TRV' }, lang)}</b>
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
                    <label className="check"><input type="radio" name="ag-tr-collect" checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
                    <label className="check"><input type="radio" name="ag-tr-collect" checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
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
