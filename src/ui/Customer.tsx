import { useEffect, useMemo, useRef, useState } from 'react';
import type { Case, CoverageType, Customer as CustomerT, Delivery, DocKey, Package, Stage, UsageCode, Vehicle } from '../types';
import {
  ALL_CODES,
  BRANDS,
  CATALOGUE_CODES,
  CURRENT_YEAR,
  CUSTOM_MODEL_ID,
  MIN_CUSTOM_YEAR,
  MODELS,
  PROVINCES,
  brandById,
  brandsFor,
  modelById,
  modelsOf,
  siRange,
  suggestedSumInsured,
  vehicleText,
  yearsOf,
} from '../data/vehicles';
import { COVERAGE_TYPES, MAX_UPLOAD_BYTES, QUOTE_TYPES, REQUIRED_DOCS, SELF_SERVICE_TYPES, cmiPremium, packagesFor } from '../data/packages';
import { COVERAGE_LABEL, DOC_LABEL, STAGE_LABEL, USAGE_HINT, USAGE_LABEL, fmtBaht, fmtDate, fmtDateTime, fmtSize, usageText, useT, type TKey } from '../i18n';
import { canUpload, customerConfirm, customerDecline, docsMissing, payAndIssue, submitCase, totalPremium, uploadDoc, useStore } from '../store';
import { getFile } from '../files';
import { Field, StatusPill, TypeTag } from './common';
import { BrandIcon, FakeQr, UsageIcon } from './icons';

const BODY_KEY = { sedan: 'bodySedan', suv: 'bodySuv', pickup: 'bodyPickup', ev: 'bodyEv', van: 'bodyVan' } as const;

const tomorrow = () => {
  const d = new Date(Date.now() + 86400000 + 7 * 3600000);
  return d.toISOString().slice(0, 10);
};

const SAMPLE_CUSTOMER = (): CustomerT => ({
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  idCard: '1103700123457',
  phone: '0812345678',
  email: 'somchai.j@example.com',
  address: '99/9 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
  plate: '1กข 1234',
  province: 'กรุงเทพมหานคร',
  chassis: 'MR053REH105123456',
  startDate: tomorrow(),
  driver1: '',
  driver2: '',
});

const isSelfType = (t: CoverageType) => SELF_SERVICE_TYPES.includes(t);
const normPlate = (s: string) => s.replace(/[\s-]/g, '').toLowerCase();

type Step = 'car' | 'pkg' | 'quote' | 'form' | 'done' | 'checkout';

export function CustomerApp({ onOpenCase, trackId, setTrackId }: { onOpenCase?: (id: string) => void; trackId: string | null; setTrackId: (id: string | null) => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<'buy' | 'track'>('buy');
  useEffect(() => {
    if (trackId) setTab('track');
  }, [trackId]);
  return (
    <div className="customer">
      <div className="subtabs" role="tablist">
        <button role="tab" aria-selected={tab === 'buy'} className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>{t('buyTab')}</button>
        <button role="tab" aria-selected={tab === 'track'} className={tab === 'track' ? 'on' : ''} onClick={() => setTab('track')}>{t('trackTab')}</button>
      </div>
      {tab === 'buy' ? (
        <Buy onTrack={(id) => { setTrackId(id); setTab('track'); }} />
      ) : (
        <Track selected={trackId} setSelected={setTrackId} onOpenCase={onOpenCase} />
      )}
    </div>
  );
}

function Steps({ step, self }: { step: Step; self: boolean }) {
  const { t } = useT();
  const order: [Step[], TKey][] = [
    [['car'], 'stepCar'],
    [['pkg', 'quote'], 'stepPackage'],
    [['form'], 'stepForm'],
    [['done', 'checkout'], self ? 'stepPay' : 'stepDone'],
  ];
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

function Buy({ onTrack }: { onTrack: (id: string) => void }) {
  const { t, lang } = useT();
  const [step, setStep] = useState<Step>('car');
  const [code, setCode] = useState<UsageCode | ''>('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState(0);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [addCmi, setAddCmi] = useState(true);
  const [filter, setFilter] = useState<CoverageType | 'all'>('all');
  const [quoteType, setQuoteType] = useState<CoverageType>('T1');
  const [quoteSI, setQuoteSI] = useState(0);
  const [customer, setCustomer] = useState<CustomerT>(SAMPLE_CUSTOMER);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerT, string>>>({});
  const [doneId, setDoneId] = useState<string | null>(null);
  // Car not in the list (or a non-catalogue code): typed in by the customer, quote request only.
  const [custom, setCustom] = useState(false);
  const [cBrand, setCBrand] = useState('');
  const [cModel, setCModel] = useState('');
  const [cYear, setCYear] = useState(0);
  const [cCode, setCCode] = useState<UsageCode>('110');
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [siPick, setSiPick] = useState<{ key: string; v: number } | null>(null);

  const picked = modelId ? modelById(modelId) : undefined;
  const ready = !!(code && brandId && picked && year);
  // Later steps are only reachable once the car is fully chosen.
  const model = picked ?? MODELS[0];
  const usage: UsageCode = custom ? cCode : code || '110';
  const suggested = ready ? suggestedSumInsured(model, year) : 0;
  const carKey = `${modelId}-${year}`;
  const range = siRange(suggested);
  const si = ready && siPick?.key === carKey ? Math.min(range.max, Math.max(range.min, siPick.v)) : suggested;
  const setSi = (v: number) => setSiPick({ key: carKey, v: Math.min(range.max, Math.max(range.min, Math.round(v / 1000) * 1000)) });
  const siPct = suggested ? ((si - suggested) / suggested) * 100 : 0;
  const pkgs = useMemo(() => (ready ? packagesFor(model, usage, year, si) : []), [ready, model, usage, year, si]);
  const types = COVERAGE_TYPES.filter((x) => pkgs.some((p) => p.type === x));
  const shown = pkgs.filter((p) => filter === 'all' || p.type === filter);
  const coverage: CoverageType = pkg ? pkg.type : quoteType;
  const self = !!pkg && isSelfType(pkg.type);
  const source = pkg ? (self ? 'self' : 'package') : 'quote';
  const vehicle: Vehicle = custom
    ? { brandId: 'other', modelId: CUSTOM_MODEL_ID, year: cYear, sumInsured: quoteSI, usage, custom: { brand: cBrand.trim(), model: cModel.trim() } }
    : { brandId, modelId, year, sumInsured: si, usage, ...(si !== suggested ? { suggestedSI: suggested } : {}) };
  const carName = custom || ready ? vehicleText(vehicle) : '';
  const cmi = cmiPremium(usage);
  const brands = code ? brandsFor(code) : [];

  const pickCode = (c: UsageCode) => {
    setCode(c);
    if (brandId && !brandsFor(c).some((b) => b.id === brandId)) {
      setBrandId('');
      setModelId('');
      setYear(0);
    } else if (picked && !picked.codes.includes(c)) {
      setModelId('');
      setYear(0);
    }
  };
  const pickBrand = (id: string) => {
    if (id === brandId) return;
    setBrandId(id);
    setModelId('');
    setYear(0);
  };
  const pickModel = (id: string) => {
    setModelId(id);
    const md = id ? modelById(id) : undefined;
    if (!md || year < md.yearFrom || year > md.yearTo) setYear(0);
  };

  const goPackages = () => {
    setPkg(null);
    setFilter('all');
    setStep('pkg');
  };
  const goQuote = () => {
    setPkg(null);
    setCustom(false);
    setQuoteSI(si);
    setQuoteType('T1');
    setQuoteErr(null);
    setStep('quote');
  };
  const goCustomQuote = (withCode?: UsageCode) => {
    setPkg(null);
    setCustom(true);
    setCBrand(brandId ? brandById(brandId).name : '');
    setCModel('');
    setCYear(0);
    setCCode(withCode ?? (code || '110'));
    setQuoteSI(0);
    setQuoteType('T1');
    setQuoteErr(null);
    setStep('quote');
  };
  const quoteNext = () => {
    const needsSI = quoteType !== 'T3';
    if (custom && (!cBrand.trim() || !cModel.trim() || !cYear)) return setQuoteErr(t('errCustomCar'));
    if (needsSI && !(quoteSI > 0)) return setQuoteErr(t('errSI'));
    setQuoteErr(null);
    setStep('form');
  };
  const restart = () => {
    setStep('car');
    setCustomer(SAMPLE_CUSTOMER());
    setPkg(null);
    setCode('');
    setBrandId('');
    setModelId('');
    setYear(0);
    setCustom(false);
    setDoneId(null);
  };

  const validate = () => {
    const e: Partial<Record<keyof CustomerT, string>> = {};
    const req: (keyof CustomerT)[] = ['firstName', 'lastName', 'idCard', 'phone', 'email', 'address', 'plate', 'province', 'chassis', 'startDate'];
    for (const k of req) if (!customer[k].trim()) e[k] = t('errRequired');
    if (!e.idCard && !/^\d{13}$/.test(customer.idCard.replace(/[\s-]/g, ''))) e.idCard = t('errIdCard');
    if (!e.phone && !/^0\d{9}$/.test(customer.phone.replace(/[\s-]/g, ''))) e.phone = t('errPhone');
    if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) e.email = t('errEmail');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const id = submitCase({
      source,
      vehicle: { ...vehicle, sumInsured: source === 'quote' ? quoteSI || si : si },
      coverage,
      pkg: pkg ?? undefined,
      addCmi: coverage !== 'CMI' && addCmi && cmi !== undefined,
      desiredSI: source === 'quote' ? quoteSI || si : undefined,
      customer: { ...customer, idCard: customer.idCard.replace(/[\s-]/g, ''), phone: customer.phone.replace(/[\s-]/g, '') },
    });
    setDoneId(id);
    setStep(self ? 'checkout' : 'done');
  };

  const set = (k: keyof CustomerT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCustomer((c) => ({ ...c, [k]: e.target.value }));

  const input = (k: keyof CustomerT, label: TKey, opts: { type?: string; optional?: boolean; wide?: boolean; inputMode?: 'numeric' | 'tel' | 'email' } = {}) => (
    <div className={opts.wide ? 'span-2' : ''} key={k}>
      <Field htmlFor={`f-${k}`} label={<>{t(label)}{opts.optional && <span className="opt"> ({t('optional')})</span>}</>} error={errors[k]}>
        <input id={`f-${k}`} type={opts.type ?? 'text'} inputMode={opts.inputMode} value={customer[k]} onChange={set(k)} aria-invalid={!!errors[k]} />
      </Field>
    </div>
  );
  const cmiToggle = (id: string) =>
    cmi !== undefined && (
      <label className="check">
        <input id={id} type="checkbox" checked={addCmi} onChange={(e) => setAddCmi(e.target.checked)} />
        {t('addCmi', { price: fmtBaht(cmi, lang) })}
      </label>
    );

  return (
    <div className="buy">
      <Steps step={step} self={self} />

      {step === 'car' && (
        <section className="panel">
          <h2>{t('carTitle')}</h2>
          <p className="lead">{t('carLead')}</p>

          <div className="car-section">
            <div className="section-label"><span className="section-n">1</span>{t('usageCode')}</div>
            <p className="hint">{t('usageLead')}</p>
            <div className="usage-grid" role="radiogroup" aria-label={t('usageCode')}>
              {CATALOGUE_CODES.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={code === c} className={`usage-card${code === c ? ' on' : ''}`} onClick={() => pickCode(c)}>
                  <UsageIcon code={c} />
                  <span className="usage-code num">{c}</span>
                  <span className="usage-name">{USAGE_LABEL[lang][c]}</span>
                  <span className="usage-hint">{USAGE_HINT[lang][c]}</span>
                </button>
              ))}
              <button type="button" className="usage-card other" onClick={() => goCustomQuote('120')}>
                <UsageIcon code="other" />
                <span className="usage-code">{t('otherCode')}</span>
                <span className="usage-name">{t('otherCodeHint')}</span>
              </button>
            </div>
          </div>

          <div className={`car-section${code ? '' : ' locked'}`}>
            <div className="section-label"><span className="section-n">2</span>{t('brand')}</div>
            {code ? (
              <div className="brand-grid reveal" key={code} role="radiogroup" aria-label={t('brand')}>
                {brands.map((b) => (
                  <button key={b.id} type="button" role="radio" aria-checked={brandId === b.id} className={`brand-btn${brandId === b.id ? ' on' : ''}`} onClick={() => pickBrand(b.id)}>
                    <BrandIcon id={b.id} />
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint">{t('pickCodeFirst')}</p>
            )}
          </div>

          <div className="car-section">
            <div className="section-label"><span className="section-n">3</span>{t('model')} / {t('year')}</div>
            <div className="grid-2">
              <Field htmlFor="car-model" label={t('model')} hint={!brandId ? t(code ? 'pickBrandFirst' : 'pickCodeFirst') : undefined}>
                <select id="car-model" key={`${brandId}-${code}`} className={brandId ? 'pop' : ''} value={modelId} disabled={!brandId || !code} onChange={(e) => pickModel(e.target.value)}>
                  <option value="">{t('pickModel')}</option>
                  {brandId && code &&
                    modelsOf(brandId, code).map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                </select>
              </Field>
              <Field htmlFor="car-year" label={t('year')} hint={picked ? t('soldYears', { from: picked.yearFrom, to: picked.yearTo }) : t('pickModelFirst')}>
                <select id="car-year" key={modelId} className={picked ? 'pop' : ''} value={year || ''} disabled={!picked} onChange={(e) => setYear(Number(e.target.value))}>
                  <option value="">{t('pickYear')}</option>
                  {picked &&
                    yearsOf(picked).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                </select>
              </Field>
            </div>
          </div>

          {ready ? (
            <div className="si-box reveal" key={`${modelId}-${year}-${code}`}>
              <div className="si-main">
                <div className="eyebrow">{t(si === suggested ? 'suggestedSI' : 'chosenSI', { year: CURRENT_YEAR })}</div>
                <div className="si-value num">
                  <CountUp value={si} format={(n) => fmtBaht(n, lang)} />
                  {si !== suggested && <span className={`si-diff ${siPct > 0 ? 'up' : 'down'}`}>{siPct > 0 ? '+' : ''}{siPct.toFixed(1)}%</span>}
                </div>
                <div className="hint">{t('siNote', { price: fmtBaht(model.newPrice, lang) })}</div>
                <div className="si-adjust">
                  <div className="si-adjust-head">
                    <label htmlFor="si-slider">{t('siAdjust')}</label>
                    {si !== suggested && (
                      <button type="button" className="link" onClick={() => setSiPick(null)}>{t('siReset', { v: fmtBaht(suggested, lang) })}</button>
                    )}
                  </div>
                  <div className="si-adjust-row">
                    <button type="button" className="step-btn" aria-label={t('siLess')} disabled={si <= range.min} onClick={() => setSi(si - 5000)}>−</button>
                    <input id="si-slider" type="range" min={range.min} max={range.max} step={1000} value={si} onChange={(e) => setSi(Number(e.target.value))} aria-valuetext={fmtBaht(si, lang)} />
                    <button type="button" className="step-btn" aria-label={t('siMore')} disabled={si >= range.max} onClick={() => setSi(si + 5000)}>+</button>
                  </div>
                  <div className="si-scale num">
                    <span>{fmtBaht(range.min, lang)} (−5%)</span>
                    <span>{fmtBaht(range.max, lang)} (+5%)</span>
                  </div>
                </div>
              </div>
              <div className="car-meta">
                <span className="chip"><BrandIcon id={brandId} size={18} /> {brandById(brandId).name} {model.name} · {year}</span>
                <span className="chip">{usageText(usage, lang)}</span>
              </div>
            </div>
          ) : (
            <div className="si-pending" aria-live="polite">
              <ul>
                {([['usageCode', !!code], ['brand', !!brandId], ['model', !!picked], ['year', !!year]] as const).map(([k, ok]) => (
                  <li key={k} className={ok ? 'ok' : ''}>
                    <span className="tick" aria-hidden="true">{ok ? '✓' : ''}</span>
                    {t(k)}
                  </li>
                ))}
              </ul>
              <p>{t('siPending')}</p>
            </div>
          )}
          <div className="actions">
            <button className="btn primary" type="button" disabled={!ready} onClick={goPackages}>{t('seePackages')} →</button>
          </div>
          <div className="quote-cta subtle">
            <span>{t('carNotListed')}</span>
            <button className="btn" type="button" onClick={() => goCustomQuote()}>{t('requestQuote')}</button>
          </div>
        </section>
      )}

      {step === 'pkg' && (
        <section className="panel wide">
          <div className="panel-head">
            <div>
              <h2>{t('pkgTitle', { car: carName })}</h2>
              <p className="lead">
                {usageText(usage, lang)} · {t('sumInsured')} <b className="num">{fmtBaht(si, lang)}</b>
                {pkgs.length > 0 && <> · {t('pkgCount', { n: pkgs.length })}</>}
              </p>
            </div>
            <button className="btn ghost" type="button" onClick={() => setStep('car')}>← {t('back')}</button>
          </div>

          {pkgs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-mark" aria-hidden="true">?</div>
              <h3>{t('noPkgTitle')}</h3>
              <p>{t('noPkgLead')}</p>
              <button className="btn primary" type="button" onClick={goQuote}>{t('requestQuote')}</button>
            </div>
          ) : (
            <>
              <div className="quote-cta top">
                <span>{t('wantQuote')}</span>
                <button className="btn" type="button" onClick={goQuote}>{t('requestQuote')}</button>
              </div>
              <div className="pkg-toolbar">
                <div className="chips-row" role="radiogroup" aria-label={t('coverage')}>
                  {(['all', ...types] as (CoverageType | 'all')[]).map((x) => (
                    <button key={x} type="button" role="radio" aria-checked={filter === x} className={`filter-chip${filter === x ? ' on' : ''}`} onClick={() => setFilter(x)}>
                      {x === 'all' ? t('all') : COVERAGE_LABEL[lang][x]}
                    </button>
                  ))}
                </div>
                {cmiToggle('add-cmi')}
              </div>
              <div className="pkg-grid">
                {shown.map((p) => (
                  <PackageCard key={p.id} p={p} onChoose={() => { setPkg(p); setStep('form'); }} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {step === 'quote' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t('quoteTitle')}</h2>
              <p className="lead">{t('quoteLead')}</p>
            </div>
            <button className="btn ghost" type="button" onClick={() => setStep(custom ? 'car' : 'pkg')}>← {t('back')}</button>
          </div>
          {custom ? (
            <div className="custom-car">
              <div className="eyebrow">{t('customCarTitle')}</div>
              <div className="grid-2">
                <Field htmlFor="c-code" label={t('usageCode')}>
                  <select id="c-code" value={cCode} onChange={(e) => setCCode(e.target.value as UsageCode)}>
                    {ALL_CODES.map((c) => (
                      <option key={c} value={c}>{usageText(c, lang)}</option>
                    ))}
                  </select>
                </Field>
                <Field htmlFor="c-brand" label={t('brand')}>
                  <input id="c-brand" list="c-brand-list" value={cBrand} onChange={(e) => setCBrand(e.target.value)} placeholder="Toyota, Volvo, Tesla…" />
                  <datalist id="c-brand-list">
                    {BRANDS.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                </Field>
                <Field htmlFor="c-model" label={t('model')}>
                  <input id="c-model" value={cModel} onChange={(e) => setCModel(e.target.value)} placeholder={t('customModelPh')} />
                </Field>
                <Field htmlFor="c-year" label={t('year')}>
                  <select id="c-year" value={cYear || ''} onChange={(e) => setCYear(Number(e.target.value))}>
                    <option value="">{t('pickYear')}</option>
                    {Array.from({ length: CURRENT_YEAR - MIN_CUSTOM_YEAR + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ) : (
            <div className="si-box compact">
              <span className="chip"><BrandIcon id={brandId} size={18} /> {carName}</span>
              <span className="chip">{usageText(usage, lang)}</span>
              <span className="chip">{t(BODY_KEY[model.body])}</span>
            </div>
          )}
          <div className="grid-2">
            <Field htmlFor="q-type" label={t('desiredType')}>
              <select id="q-type" value={quoteType} onChange={(e) => setQuoteType(e.target.value as CoverageType)}>
                {QUOTE_TYPES.map((x) => (
                  <option key={x} value={x}>{COVERAGE_LABEL[lang][x]}</option>
                ))}
              </select>
            </Field>
            <Field htmlFor="q-si" label={t('desiredSI')} hint={custom ? t('customSIHint') : t('suggestedSI', { year: CURRENT_YEAR }) + ' ' + fmtBaht(si, lang)}>
              <input id="q-si" type="number" min={0} step={10000} value={quoteSI || ''} onChange={(e) => setQuoteSI(Number(e.target.value))} />
            </Field>
          </div>
          {cmiToggle('q-cmi')}
          {quoteErr && <p className="error" role="alert">{quoteErr}</p>}
          <div className="actions">
            <button className="btn primary" type="button" onClick={quoteNext}>{t('next')} →</button>
          </div>
        </section>
      )}

      {step === 'form' && (
        <form className="panel" onSubmit={submit} noValidate>
          <div className="panel-head">
            <div>
              <h2>{t('formTitle')}</h2>
              <p className="lead">{t('formLead')}</p>
            </div>
            <button className="btn ghost" type="button" onClick={() => setStep(pkg ? 'pkg' : 'quote')}>← {t('back')}</button>
          </div>
          <div className="summary-bar">
            <div>
              <div className="eyebrow">{t('selected')}</div>
              <div className="summary-main">
                <TypeTag type={coverage} /> {carName}
                {pkg?.repair && <span className="muted"> · {t(pkg.repair === 'dealer' ? 'repairDealer' : 'repairGarage')}</span>}
                {coverage !== 'CMI' && addCmi && cmi !== undefined && <span className="muted"> {t('plusCmi')}</span>}
                {self && <span className="self-badge">{t('selfBadge')}</span>}
              </div>
            </div>
            <div className="summary-price num">
              {pkg ? fmtBaht(Math.round((pkg.premium + (coverage !== 'CMI' && addCmi ? cmi ?? 0 : 0)) * 100) / 100, lang) : t('waitingQuote')}
            </div>
          </div>
          <div className="form-grid">
            {input('firstName', 'firstName')}
            {input('lastName', 'lastName')}
            {input('idCard', 'idCard', { inputMode: 'numeric' })}
            {input('phone', 'phone', { inputMode: 'tel', type: 'tel' })}
            {input('email', 'email', { type: 'email', inputMode: 'email', wide: true })}
            <div className="span-2">
              <Field htmlFor="f-address" label={t('address')} error={errors.address}>
                <textarea id="f-address" rows={2} value={customer.address} onChange={set('address')} />
              </Field>
            </div>
            {input('plate', 'plate')}
            <div>
              <Field htmlFor="f-province" label={t('province')} error={errors.province}>
                <select id="f-province" value={customer.province} onChange={set('province')}>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            {input('chassis', 'chassis')}
            {input('startDate', 'startDate', { type: 'date' })}
            {input('driver1', 'driver1', { optional: true })}
            {input('driver2', 'driver2', { optional: true })}
          </div>
          {!self && (
            <div className="docs-later">
              <div className="eyebrow">{t('docsLaterTitle')} · {COVERAGE_LABEL[lang][coverage]}</div>
              <ul>
                {REQUIRED_DOCS[coverage].map((k) => (
                  <li key={k}>{DOC_LABEL[lang][k]}</li>
                ))}
              </ul>
              <p className="hint">{t('docsLaterLead')} {t('uploadRule')}</p>
            </div>
          )}
          <div className="actions">
            <button className="btn primary" type="submit">{t(self ? 'submitSelf' : pkg ? 'submitPackage' : 'submitQuote')}{self ? ' →' : ''}</button>
          </div>
        </form>
      )}

      {step === 'checkout' && doneId && <CheckoutById id={doneId} onRestart={restart} />}

      {step === 'done' && doneId && (
        <section className="panel done">
          <div className="done-mark" aria-hidden="true">✓</div>
          <h2>{t('doneTitle')}</h2>
          <p>{t(source === 'package' ? 'doneLeadPackage' : 'doneLeadQuote')}</p>
          <div className="ref-big num">{doneId}</div>
          <p className="hint">{t('doneEmail', { email: customer.email })}</p>
          <div className="actions center">
            <button className="btn primary" type="button" onClick={() => onTrack(doneId)}>{t('goTrack')}</button>
            <button className="btn" type="button" onClick={restart}>{t('newRequest')}</button>
          </div>
        </section>
      )}
    </div>
  );
}

function PackageCard({ p, onChoose }: { p: Package; onChoose: () => void }) {
  const { t, lang } = useT();
  const money = (n: number) => (n ? fmtBaht(n, lang) : t('notCovered'));
  const rows: [string, string][] =
    p.type === 'CMI'
      ? [[t('paMed'), t('cmiCover', { med: fmtBaht(p.medical, lang), pa: fmtBaht(p.pa, lang) })]]
      : [
          [t('ownDamage'), money(p.ownDamage)],
          [t('fireTheft'), money(p.fireTheft)],
          [t('flood'), p.flood ? t('covered') : t('notCovered')],
          [t('tpbi'), `${fmtBaht(p.tpbiPerson, lang)}${t('perPerson')}`],
          [t('tppd'), fmtBaht(p.tppd, lang)],
          [t('paMed'), `${fmtBaht(p.pa, lang)} / ${fmtBaht(p.medical, lang)}`],
          [t('bail'), fmtBaht(p.bail, lang)],
        ];
  return (
    <article className={`pkg-card type-${p.type}`}>
      <header>
        <TypeTag type={p.type} />
        <div className="pkg-tags">
          {p.repair && <span className="chip">{t(p.repair === 'dealer' ? 'repairDealer' : 'repairGarage')}</span>}
          {p.type !== 'CMI' && (
            <span className="chip">
              {t('deductible')} {p.deductible ? fmtBaht(p.deductible, lang) : t('none')}
            </span>
          )}
        </div>
      </header>
      <div className="pkg-price">
        <span className="num">{fmtBaht(p.premium, lang)}</span>
        <span className="muted">{t('perYear')}</span>
      </div>
      <div className="hint">{t('inclTax')}</div>
      {isSelfType(p.type) && <div className="self-badge">⚡ {t('selfBadge')}</div>}
      <dl className="cover-list">
        {rows.map(([k, v]) => (
          <div key={k} className={v === t('notCovered') ? 'off' : ''}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
      <button className="btn primary block" type="button" onClick={onChoose}>{t('choose')}</button>
    </article>
  );
}

/* ---------------- self-service checkout ---------------- */

function CheckoutById({ id, onRestart }: { id: string; onRestart?: () => void }) {
  const s = useStore();
  const c = s.cases.find((x) => x.id === id);
  if (!c) return null;
  return <Checkout c={c} onRestart={onRestart} />;
}

function Checkout({ c, onRestart, embedded = false }: { c: Case; onRestart?: () => void; embedded?: boolean }) {
  const { t, lang } = useT();
  const [method, setMethod] = useState<Delivery['method']>('pdf');
  const [address, setAddress] = useState(c.customer.address);
  const [email, setEmail] = useState(c.customer.email);
  const [pay, setPay] = useState<'qr' | 'card'>('qr');
  const [card, setCard] = useState({ no: '4242 4242 4242 4242', exp: '12/29', cvv: '123' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const total = totalPremium(c) ?? 0;
  const missing = docsMissing(c);
  useEffect(() => {
    if (!missing.length) setErr(null);
  }, [missing.length]);

  if (c.status === 'ISSUED') return <SelfDone c={c} onRestart={onRestart} />;

  const doPay = () => {
    if (missing.length) return setErr(t('payNeedDocs'));
    if (method === 'paper' ? !address.trim() : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr(t('errShip'));
    if (pay === 'card' && (card.no.replace(/\s/g, '').length < 15 || !/^\d{2}\/\d{2}$/.test(card.exp) || card.cvv.length < 3)) return setErr(t('errCard'));
    setErr(null);
    setBusy(true);
    setTimeout(() => {
      payAndIssue(c.id, method === 'paper' ? { method, address: address.trim() } : { method, email: email.trim() }, {
        method: pay,
        last4: pay === 'card' ? card.no.replace(/\s/g, '').slice(-4) : undefined,
      });
      setBusy(false);
    }, 1400);
  };

  return (
    <section className={`panel wide checkout${embedded ? ' embedded' : ''}`}>
      <div className="panel-head">
        <div>
          <div className="eyebrow num">{c.id}</div>
          <h2>{t('checkoutTitle')}</h2>
          <p className="lead">{t('checkoutLead')}</p>
        </div>
      </div>
      <div className="checkout-grid">
        <div className="checkout-main">
          <div className="co-step">
            <div className="section-label"><span className="section-n">1</span>{t('uploadTitle')}</div>
            <Uploads c={c} bare />
          </div>

          <div className="co-step">
            <div className="section-label"><span className="section-n">2</span>{t('deliveryTitle')}</div>
            <div className="option-grid" role="radiogroup" aria-label={t('deliveryTitle')}>
              {(['pdf', 'paper'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={method === m} className={`option-card${method === m ? ' on' : ''}`} onClick={() => setMethod(m)}>
                  <span className="radio-dot" aria-hidden="true" />
                  <span>
                    <b>{t(m === 'pdf' ? 'deliveryPdf' : 'deliveryPaper')}</b>
                    <small>{t(m === 'pdf' ? 'deliveryPdfHint' : 'deliveryPaperHint')}</small>
                  </span>
                </button>
              ))}
            </div>
            {method === 'paper' ? (
              <Field htmlFor={`ship-${c.id}`} label={t('shipTo')}>
                <textarea id={`ship-${c.id}`} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            ) : (
              <Field htmlFor={`mail-${c.id}`} label={t('sendTo')}>
                <input id={`mail-${c.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            )}
          </div>

          <div className="co-step">
            <div className="section-label"><span className="section-n">3</span>{t('payTitle')}</div>
            <div className="option-grid" role="radiogroup" aria-label={t('payTitle')}>
              {(['qr', 'card'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={pay === m} className={`option-card${pay === m ? ' on' : ''}`} onClick={() => setPay(m)}>
                  <span className="radio-dot" aria-hidden="true" />
                  <b>{t(m === 'qr' ? 'payQr' : 'payCard')}</b>
                </button>
              ))}
            </div>
            {pay === 'qr' ? (
              <div className="qr-box">
                <FakeQr seed={c.id} />
                <div>
                  <div className="qr-amount num">{fmtBaht(total, lang)}</div>
                  <p className="hint">{t('qrHint')}</p>
                </div>
              </div>
            ) : (
              <div className="card-grid">
                <Field htmlFor={`cn-${c.id}`} label={t('cardNo')}>
                  <input id={`cn-${c.id}`} inputMode="numeric" value={card.no} onChange={(e) => setCard({ ...card, no: e.target.value })} />
                </Field>
                <Field htmlFor={`ce-${c.id}`} label={t('cardExp')}>
                  <input id={`ce-${c.id}`} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
                </Field>
                <Field htmlFor={`cv-${c.id}`} label={t('cardCvv')}>
                  <input id={`cv-${c.id}`} inputMode="numeric" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        </div>

        <aside className="order-summary">
          <div className="eyebrow">{t('orderSummary')}</div>
          <div className="os-car">{vehicleText(c.vehicle)}</div>
          <div className="muted os-sub">{usageText(c.vehicle.usage, lang)}</div>
          <dl>
            {c.pkg && (
              <div>
                <dt><TypeTag type={c.coverage} /></dt>
                <dd className="num">{fmtBaht(c.pkg.premium, lang)}</dd>
              </div>
            )}
            {c.addCmi && (
              <div>
                <dt>{t('plusCmi')}</dt>
                <dd className="num">{fmtBaht(cmiPremium(c.vehicle.usage) ?? 0, lang)}</dd>
              </div>
            )}
            <div className="os-total">
              <dt>{t('amountDue')}</dt>
              <dd className="num">{fmtBaht(total, lang)}</dd>
            </div>
          </dl>
          {missing.length > 0 && <p className="hint">{t('payNeedDocs')}</p>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className={`btn primary block pay-btn${busy ? ' busy' : ''}`} type="button" disabled={busy} onClick={doPay}>
            {busy ? <><span className="spinner" aria-hidden="true" /> {t('paying')}</> : t('payBtn', { amount: fmtBaht(total, lang) })}
          </button>
        </aside>
      </div>
    </section>
  );
}

function SelfDone({ c, onRestart }: { c: Case; onRestart?: () => void }) {
  const { t, lang } = useT();
  const [show, setShow] = useState(c.delivery?.method === 'pdf');
  return (
    <section className="panel wide done self-done">
      <div className="done-mark pop-in" aria-hidden="true">✓</div>
      <h2>{t('paidTitle')}</h2>
      <div className="ref-big num">{c.policyNo}</div>
      <p>
        {c.delivery?.method === 'paper'
          ? t('paidPaper', { no: c.delivery.trackingNo ?? '' })
          : t('paidPdf', { email: c.delivery?.email ?? c.customer.email })}
      </p>
      <p className="hint">{t('paidBy')}: {t(c.payment?.method === 'card' ? 'payCard' : 'payQr')} · {fmtBaht(c.premium ?? 0, lang)}</p>
      <div className="actions center">
        <button className="btn" type="button" onClick={() => setShow((v) => !v)}>{t(show ? 'hidePolicy' : 'viewPolicy')}</button>
        {onRestart && <button className="btn primary" type="button" onClick={onRestart}>{t('newRequest')}</button>}
      </div>
      {show && <PolicyDoc c={c} />}
    </section>
  );
}

function PolicyDoc({ c }: { c: Case }) {
  const { t, lang } = useT();
  const start = new Date(`${c.customer.startDate}T00:00:00+07:00`).getTime();
  const end = start + 365 * 86400000;
  const rows: [string, string][] = [
    [t('insured'), `${c.customer.firstName} ${c.customer.lastName}`],
    [t('car'), vehicleText(c.vehicle)],
    [t('usageCode'), usageText(c.vehicle.usage, lang)],
    [t('plate'), `${c.customer.plate} ${c.customer.province}`],
    [t('chassis'), c.customer.chassis],
    [t('coverage'), `${COVERAGE_LABEL[lang][c.coverage]}${c.addCmi ? ` ${t('plusCmi')}` : ''}`],
    [t('coverPeriod'), `${fmtDate(start, lang, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmtDate(end, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`],
    [t('premium'), fmtBaht(c.premium ?? 0, lang)],
  ];
  if (c.pkg && c.pkg.ownDamage) rows.splice(6, 0, [t('ownDamage'), fmtBaht(c.pkg.ownDamage, lang)]);
  return (
    <div className="policy-doc reveal">
      <div className="pd-head">
        <div>
          <b>ABC ประกันภัย · ABC Insurance</b>
          <div className="muted">{t('policyDoc')}</div>
        </div>
        <div className="pd-no num">{c.policyNo}</div>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="pd-foot muted">e-Policy · {fmtDateTime(c.stamps.issued ?? Date.now(), lang)} · DEMO</div>
    </div>
  );
}

/* ---------------- tracking ---------------- */

const TIMELINE: Stage[] = ['submitted', 'accepted', 'quoted', 'confirmed', 'docsComplete', 'paid', 'issued'];

function Track({ selected, setSelected, onOpenCase }: { selected: string | null; setSelected: (id: string | null) => void; onOpenCase?: (id: string) => void }) {
  const { t } = useT();
  const s = useStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<string[] | null>(null);
  const [miss, setMiss] = useState<string | null>(null);
  const mine = s.mine.map((id) => s.cases.find((c) => c.id === id)).filter(Boolean) as Case[];
  const found = results ? (results.map((id) => s.cases.find((c) => c.id === id)).filter(Boolean) as Case[]) : null;
  const current = selected ? s.cases.find((c) => c.id === selected) : undefined;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = q.trim();
    if (!raw) return;
    const ref = raw.toUpperCase();
    const plate = normPlate(raw);
    const hits = s.cases
      .filter((c) => c.id === ref || normPlate(c.customer.plate) === plate)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (!hits.length) {
      setMiss(raw);
      setResults(null);
      return;
    }
    setMiss(null);
    setResults(hits.map((c) => c.id));
    setSelected(hits[0].id);
  };

  const list = (cases: Case[]) => (
    <ul className="mine-list">
      {cases.map((c) => (
        <li key={c.id}>
          <button type="button" className={`mine-item${c.id === selected ? ' on' : ''}`} onClick={() => setSelected(c.id)}>
            <span className="num ref">{c.id}</span>
            <span className="mine-car">
              {vehicleText(c.vehicle)}
              <small className="muted"> · {c.customer.plate}</small>
            </span>
            <StatusPill status={c.status} />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="track">
      <section className="panel">
        <h2>{t('trackTitle')}</h2>
        <p className="lead">{t('trackLead')}</p>
        <form className="search-row" onSubmit={search}>
          <label htmlFor="track-ref" className="sr-only">{t('trackTitle')}</label>
          <input id="track-ref" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('refPlaceholder')} />
          <button className="btn" type="submit">{t('search')}</button>
        </form>
        {miss && <p className="error">{t('notFound', { ref: miss })}</p>}
        {found ? (
          <>
            <div className="list-head">
              <span className="eyebrow">{t('results', { n: found.length })}</span>
              <button type="button" className="link" onClick={() => { setResults(null); setQ(''); }}>{t('clearSearch')}</button>
            </div>
            {list(found)}
          </>
        ) : mine.length === 0 ? (
          <p className="muted">{t('noMine')}</p>
        ) : (
          <>
            <div className="list-head"><span className="eyebrow">{t('myRequests')}</span></div>
            {list(mine)}
          </>
        )}
      </section>
      {current && <TrackDetail c={current} onOpenCase={onOpenCase} />}
    </div>
  );
}

function TrackDetail({ c, onOpenCase }: { c: Case; onOpenCase?: (id: string) => void }) {
  const { t, lang } = useT();
  const [showPolicy, setShowPolicy] = useState(false);
  const total = totalPremium(c);
  if (c.status === 'AWAITING_PAYMENT') return <Checkout c={c} embedded />;
  return (
    <section className="panel track-detail">
      <div className="panel-head">
        <div>
          <div className="eyebrow num">{c.id}</div>
          <h2>{vehicleText(c.vehicle)}</h2>
          <div className="muted">{usageText(c.vehicle.usage, lang)} · {c.customer.plate}</div>
        </div>
        <StatusPill status={c.status} />
      </div>
      <dl className="kv-row">
        <div><dt>{t('coverage')}</dt><dd><TypeTag type={c.coverage} />{c.addCmi && <span className="muted"> {t('plusCmi')}</span>}</dd></div>
        <div><dt>{t('sumInsured')}</dt><dd className="num">{['T1', 'T2P', 'T3P', 'T2'].includes(c.coverage) ? fmtBaht(c.desiredSI ?? c.vehicle.sumInsured, lang) : '—'}</dd></div>
        <div><dt>{t('premium')}</dt><dd className="num">{total !== undefined ? fmtBaht(total, lang) : t('waitingQuote')}</dd></div>
      </dl>

      {c.status === 'QUOTED' && (
        <div className="callout">
          <div>
            <b>{t('quoteReady')}</b>
            <p>{t('quoteOffer', { premium: fmtBaht(total ?? 0, lang), type: COVERAGE_LABEL[lang][c.coverage] })}{c.addCmi ? ` ${t('plusCmi')}` : ''}</p>
          </div>
          <div className="actions">
            <button className="btn primary" type="button" onClick={() => customerConfirm(c.id)}>{t('accept')}</button>
            <button className="btn" type="button" onClick={() => customerDecline(c.id)}>{t('decline')}</button>
          </div>
        </div>
      )}
      {c.status === 'ISSUED' && c.policyNo && (
        <div className="callout good">
          <div>
            <b>✓ {t('policyIssued', { no: c.policyNo })}</b>
            {c.delivery && (
              <p>{c.delivery.method === 'paper' ? t('paidPaper', { no: c.delivery.trackingNo ?? '' }) : t('paidPdf', { email: c.delivery.email ?? '' })}</p>
            )}
          </div>
          <button className="btn small" type="button" onClick={() => setShowPolicy((v) => !v)}>{t(showPolicy ? 'hidePolicy' : 'viewPolicy')}</button>
        </div>
      )}
      {showPolicy && c.status === 'ISSUED' && <PolicyDoc c={c} />}

      <Uploads c={c} />

      <h3>{t('timeline')}</h3>
      <ol className="timeline">
        {TIMELINE.filter((st) => (c.source === 'quote' || (st !== 'quoted' && st !== 'confirmed')) && (c.source === 'self' ? st !== 'accepted' : st !== 'paid')).map((st) => (
          <li key={st} className={c.stamps[st] ? 'done' : ''}>
            <span className="dot" aria-hidden="true" />
            <span>{STAGE_LABEL[lang][st]}</span>
            <span className="muted num">{c.stamps[st] ? fmtDateTime(c.stamps[st]!, lang) : ''}</span>
          </li>
        ))}
        {c.stamps.cancelled && (
          <li className="done cancelled">
            <span className="dot" aria-hidden="true" />
            <span>{STAGE_LABEL[lang].cancelled}</span>
            <span className="muted num">{fmtDateTime(c.stamps.cancelled, lang)}</span>
          </li>
        )}
      </ol>
      {onOpenCase && (
        <button className="btn ghost small" type="button" onClick={() => onOpenCase(c.id)}>{t('openCase')} ({t('navBack')}) →</button>
      )}
    </section>
  );
}

export function useFileUrl(key: string, version: number | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (version === undefined) return;
    getFile(key).then((b) => {
      if (!alive || !b) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [key, version]);
  return url;
}

function Uploads({ c, bare = false }: { c: Case; bare?: boolean }) {
  const { t, lang } = useT();
  const [errs, setErrs] = useState<string[]>([]);
  const required = REQUIRED_DOCS[c.coverage];
  const allowed = canUpload(c);
  const missing = docsMissing(c);
  if (c.status === 'CANCELLED' || c.status === 'ISSUED') return null;

  const onFile = async (key: DocKey, file: File | undefined) => {
    if (!file) return;
    const isJpg = /\.(jpe?g)$/i.test(file.name) && (file.type === '' || file.type === 'image/jpeg');
    if (!isJpg) return setErrs([t('errType', { file: file.name })]);
    if (file.size > MAX_UPLOAD_BYTES) return setErrs([t('errSize', { file: file.name, size: fmtSize(file.size) })]);
    setErrs([]);
    await uploadDoc(c.id, key, file);
  };

  return (
    <div className={`uploads${bare ? ' bare' : ''}`}>
      <div className="uploads-head">
        {!bare && <h3>{t('uploadTitle')}</h3>}
        <span className="hint">{t('uploadRule')}</span>
      </div>
      {!allowed && missing.length > 0 && c.source === 'quote' && ['NEW', 'ACCEPTED', 'QUOTED'].includes(c.status) && <p className="muted">{t('uploadWaitQuote')}</p>}
      {missing.length === 0 && <p className="ok-note">✓ {c.source === 'self' ? STAGE_LABEL[lang].docsComplete : t('uploadDone')}</p>}
      {errs.map((e) => (
        <p key={e} className="error" role="alert">{e}</p>
      ))}
      <div className="doc-grid">
        {required.map((k) => (
          <DocTile key={k} caseId={c.id} k={k} meta={c.docs[k]} label={DOC_LABEL[lang][k]} disabled={!allowed} onFile={(f) => onFile(k, f)} />
        ))}
      </div>
    </div>
  );
}

function DocTile({ caseId, k, meta, label, disabled, onFile }: { caseId: string; k: DocKey; meta?: Case['docs'][DocKey]; label: string; disabled: boolean; onFile: (f: File | undefined) => void }) {
  const { t } = useT();
  const url = useFileUrl(`${caseId}:${k}`, meta?.at);
  const id = `up-${caseId}-${k}`;
  return (
    <div className={`doc-tile${meta ? ' has' : ''}`}>
      <div className="doc-thumb">
        {url ? <img src={url} alt={label} /> : <span aria-hidden="true">{meta ? '✓' : '＋'}</span>}
      </div>
      <div className="doc-label">{label}</div>
      {meta && <div className="hint">{meta.name} · {fmtSize(meta.size)}</div>}
      <label htmlFor={id} className={`btn small${disabled ? ' disabled' : ''}`} aria-disabled={disabled}>
        {meta ? t('replace') : t('chooseFile')}
      </label>
      <input id={id} type="file" accept=".jpg,.jpeg,image/jpeg" className="sr-only" disabled={disabled} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

/** Counts up from 0 on mount, then glides between later values (instant when the viewer prefers reduced motion). */
function CountUp({ value, format, ms = 700 }: { value: number; format: (n: number) => string; ms?: number }) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? value : 0);
  const raf = useRef(0);
  const shown = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return setN(value);
    const from = shown.current;
    const dur = from === 0 ? ms : 250;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = p < 1 ? Math.round((from + (value - from) * eased) / 1000) * 1000 : value;
      shown.current = v;
      setN(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms, reduce]);
  return <span aria-label={format(value)}>{format(n)}</span>;
}
