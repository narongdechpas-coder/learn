import { useEffect, useMemo, useRef, useState } from 'react';
import type { Case, CoverageType, Customer as CustomerT, DocKey, Package } from '../types';
import { BRANDS, CURRENT_YEAR, MODELS, PROVINCES, brandById, modelById, modelsOf, suggestedSumInsured, vehicleLabel, yearsOf } from '../data/vehicles';
import { COVERAGE_TYPES, MAX_UPLOAD_BYTES, QUOTE_TYPES, REQUIRED_DOCS, cmiPremium, packagesFor } from '../data/packages';
import { COVERAGE_LABEL, DOC_LABEL, STAGE_LABEL, fmtBaht, fmtDateTime, fmtSize, useT, type TKey } from '../i18n';
import { canUpload, customerConfirm, customerDecline, docsMissing, submitCase, totalPremium, uploadDoc, useStore } from '../store';
import { getFile } from '../files';
import { Field, StatusPill, TypeTag } from './common';
import type { Stage } from '../types';

const BODY_KEY = { sedan: 'bodySedan', suv: 'bodySuv', pickup: 'bodyPickup', ev: 'bodyEv' } as const;

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

type Step = 'car' | 'pkg' | 'quote' | 'form' | 'done';

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

function Steps({ step }: { step: Step }) {
  const { t } = useT();
  const order: [Step[], TKey][] = [[['car'], 'stepCar'], [['pkg', 'quote'], 'stepPackage'], [['form'], 'stepForm'], [['done'], 'stepDone']];
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

  const picked = modelId ? modelById(modelId) : undefined;
  const ready = !!(brandId && picked && year);
  // Later steps are only reachable once the car is fully chosen.
  const model = picked ?? MODELS[0];
  const si = ready ? suggestedSumInsured(model, year) : 0;
  const pkgs = useMemo(() => (ready ? packagesFor(model, year, si) : []), [ready, model, year, si]);
  const types = COVERAGE_TYPES.filter((x) => pkgs.some((p) => p.type === x));
  const shown = pkgs.filter((p) => filter === 'all' || p.type === filter);
  const source = pkg ? 'package' : 'quote';
  const coverage: CoverageType = pkg ? pkg.type : quoteType;
  const cmi = cmiPremium(model.body);

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
    setQuoteSI(si);
    setQuoteType('T1');
    setStep('quote');
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
      vehicle: { brandId, modelId, year, sumInsured: source === 'quote' ? quoteSI || si : si },
      coverage,
      pkg: pkg ?? undefined,
      addCmi: coverage !== 'CMI' && addCmi,
      desiredSI: source === 'quote' ? quoteSI || si : undefined,
      customer: { ...customer, idCard: customer.idCard.replace(/[\s-]/g, ''), phone: customer.phone.replace(/[\s-]/g, '') },
    });
    setDoneId(id);
    setStep('done');
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

  return (
    <div className="buy">
      <Steps step={step} />

      {step === 'car' && (
        <section className="panel">
          <h2>{t('carTitle')}</h2>
          <p className="lead">{t('carLead')}</p>
          <div className="brand-grid" role="radiogroup" aria-label={t('brand')}>
            {BRANDS.map((b) => (
              <button key={b.id} type="button" role="radio" aria-checked={brandId === b.id} className={`brand-btn${brandId === b.id ? ' on' : ''}`} onClick={() => pickBrand(b.id)}>
                {b.name}
              </button>
            ))}
          </div>
          <div className="grid-2">
            <Field htmlFor="car-model" label={t('model')} hint={!brandId ? t('pickBrandFirst') : undefined}>
              <select id="car-model" key={brandId} className={brandId ? 'pop' : ''} value={modelId} disabled={!brandId} onChange={(e) => pickModel(e.target.value)}>
                <option value="">{t('pickModel')}</option>
                {brandId &&
                  modelsOf(brandId).map((x) => (
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
          {ready ? (
            <div className="si-box reveal" key={`${modelId}-${year}`}>
              <div>
                <div className="eyebrow">{t('suggestedSI', { year: CURRENT_YEAR })}</div>
                <div className="si-value num"><CountUp value={si} format={(n) => fmtBaht(n, lang)} /></div>
                <div className="hint">{t('siNote', { price: fmtBaht(model.newPrice, lang) })}</div>
              </div>
              <div className="car-meta">
                <span className="chip">{t(BODY_KEY[model.body])}</span>
                <span className="chip">{brandById(brandId).name} {model.name} · {year}</span>
              </div>
            </div>
          ) : (
            <div className="si-pending" aria-live="polite">
              <ul>
                {([['brand', !!brandId], ['model', !!picked], ['year', !!year]] as const).map(([k, ok]) => (
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
        </section>
      )}

      {step === 'pkg' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t('pkgTitle', { car: vehicleLabel(modelId, year) })}</h2>
              <p className="lead">
                {t('sumInsured')} <b className="num">{fmtBaht(si, lang)}</b>
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
              <div className="pkg-toolbar">
                <div className="chips-row" role="radiogroup" aria-label={t('coverage')}>
                  {(['all', ...types] as (CoverageType | 'all')[]).map((x) => (
                    <button key={x} type="button" role="radio" aria-checked={filter === x} className={`filter-chip${filter === x ? ' on' : ''}`} onClick={() => setFilter(x)}>
                      {x === 'all' ? t('all') : COVERAGE_LABEL[lang][x]}
                    </button>
                  ))}
                </div>
                <label className="check">
                  <input id="add-cmi" type="checkbox" checked={addCmi} onChange={(e) => setAddCmi(e.target.checked)} />
                  {t('addCmi', { price: fmtBaht(cmi, lang) })}
                </label>
              </div>
              <div className="pkg-grid">
                {shown.map((p) => (
                  <PackageCard key={p.id} p={p} onChoose={() => { setPkg(p); setStep('form'); }} />
                ))}
              </div>
              <div className="quote-cta">
                <span>{t('wantQuote')}</span>
                <button className="btn" type="button" onClick={goQuote}>{t('requestQuote')}</button>
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
            <button className="btn ghost" type="button" onClick={() => setStep('pkg')}>← {t('back')}</button>
          </div>
          <div className="si-box compact">
            <span className="chip">{vehicleLabel(modelId, year)}</span>
            <span className="chip">{t(BODY_KEY[model.body])}</span>
          </div>
          <div className="grid-2">
            <Field htmlFor="q-type" label={t('desiredType')}>
              <select id="q-type" value={quoteType} onChange={(e) => setQuoteType(e.target.value as CoverageType)}>
                {QUOTE_TYPES.map((x) => (
                  <option key={x} value={x}>{COVERAGE_LABEL[lang][x]}</option>
                ))}
              </select>
            </Field>
            <Field htmlFor="q-si" label={t('desiredSI')} hint={t('suggestedSI', { year: CURRENT_YEAR }) + ' ' + fmtBaht(si, lang)}>
              <input id="q-si" type="number" min={0} step={10000} value={quoteSI} onChange={(e) => setQuoteSI(Number(e.target.value))} />
            </Field>
          </div>
          <label className="check">
            <input id="q-cmi" type="checkbox" checked={addCmi} onChange={(e) => setAddCmi(e.target.checked)} />
            {t('addCmi', { price: fmtBaht(cmi, lang) })}
          </label>
          <div className="actions">
            <button className="btn primary" type="button" onClick={() => setStep('form')}>{t('next')} →</button>
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
                <TypeTag type={coverage} /> {vehicleLabel(modelId, year)}
                {pkg?.repair && <span className="muted"> · {t(pkg.repair === 'dealer' ? 'repairDealer' : 'repairGarage')}</span>}
                {coverage !== 'CMI' && addCmi && <span className="muted"> {t('plusCmi')}</span>}
              </div>
            </div>
            <div className="summary-price num">
              {pkg ? fmtBaht(Math.round((pkg.premium + (coverage !== 'CMI' && addCmi ? cmi : 0)) * 100) / 100, lang) : t('waitingQuote')}
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
          <div className="docs-later">
            <div className="eyebrow">{t('docsLaterTitle')} · {COVERAGE_LABEL[lang][coverage]}</div>
            <ul>
              {REQUIRED_DOCS[coverage].map((k) => (
                <li key={k}>{DOC_LABEL[lang][k]}</li>
              ))}
            </ul>
            <p className="hint">{t('docsLaterLead')} {t('uploadRule')}</p>
          </div>
          <div className="actions">
            <button className="btn primary" type="submit">{t(pkg ? 'submitPackage' : 'submitQuote')}</button>
          </div>
        </form>
      )}

      {step === 'done' && doneId && (
        <section className="panel done">
          <div className="done-mark" aria-hidden="true">✓</div>
          <h2>{t('doneTitle')}</h2>
          <p>{t(source === 'package' ? 'doneLeadPackage' : 'doneLeadQuote')}</p>
          <div className="ref-big num">{doneId}</div>
          <p className="hint">{t('doneEmail', { email: customer.email })}</p>
          <div className="actions center">
            <button className="btn primary" type="button" onClick={() => onTrack(doneId)}>{t('goTrack')}</button>
            <button className="btn" type="button" onClick={() => { setStep('car'); setCustomer(SAMPLE_CUSTOMER()); setPkg(null); setBrandId(''); setModelId(''); setYear(0); }}>{t('newRequest')}</button>
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

/* ---------------- tracking ---------------- */

const TIMELINE: Stage[] = ['submitted', 'accepted', 'quoted', 'confirmed', 'docsComplete', 'issued'];

function Track({ selected, setSelected, onOpenCase }: { selected: string | null; setSelected: (id: string | null) => void; onOpenCase?: (id: string) => void }) {
  const { t } = useT();
  const s = useStore();
  const [q, setQ] = useState('');
  const [miss, setMiss] = useState<string | null>(null);
  const mine = s.mine.map((id) => s.cases.find((c) => c.id === id)).filter(Boolean) as Case[];
  const current = selected ? s.cases.find((c) => c.id === selected) : undefined;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = q.trim().toUpperCase();
    if (!ref) return;
    const hit = s.cases.find((c) => c.id === ref);
    if (hit) {
      setSelected(hit.id);
      setMiss(null);
    } else setMiss(ref);
  };

  return (
    <div className="track">
      <section className="panel">
        <h2>{t('trackTitle')}</h2>
        <p className="lead">{t('trackLead')}</p>
        <form className="search-row" onSubmit={search}>
          <label htmlFor="track-ref" className="sr-only">{t('colRef')}</label>
          <input id="track-ref" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('refPlaceholder')} />
          <button className="btn" type="submit">{t('search')}</button>
        </form>
        {miss && <p className="error">{t('notFound', { ref: miss })}</p>}
        {mine.length === 0 ? (
          <p className="muted">{t('noMine')}</p>
        ) : (
          <ul className="mine-list">
            {mine.map((c) => (
              <li key={c.id}>
                <button type="button" className={`mine-item${c.id === selected ? ' on' : ''}`} onClick={() => setSelected(c.id)}>
                  <span className="num ref">{c.id}</span>
                  <span className="mine-car">{vehicleLabel(c.vehicle.modelId, c.vehicle.year)}</span>
                  <StatusPill status={c.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {current && <TrackDetail c={current} onOpenCase={onOpenCase} />}
    </div>
  );
}

function TrackDetail({ c, onOpenCase }: { c: Case; onOpenCase?: (id: string) => void }) {
  const { t, lang } = useT();
  const total = totalPremium(c);
  return (
    <section className="panel track-detail">
      <div className="panel-head">
        <div>
          <div className="eyebrow num">{c.id}</div>
          <h2>{vehicleLabel(c.vehicle.modelId, c.vehicle.year)}</h2>
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
        <div className="callout good"><b>✓ {t('policyIssued', { no: c.policyNo })}</b></div>
      )}

      <Uploads c={c} />

      <h3>{t('timeline')}</h3>
      <ol className="timeline">
        {TIMELINE.filter((st) => c.source === 'quote' || (st !== 'quoted' && st !== 'confirmed')).map((st) => (
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

function Uploads({ c }: { c: Case }) {
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
    <div className="uploads">
      <div className="uploads-head">
        <h3>{t('uploadTitle')}</h3>
        <span className="hint">{t('uploadRule')}</span>
      </div>
      {!allowed && missing.length > 0 && c.source === 'quote' && ['NEW', 'ACCEPTED', 'QUOTED'].includes(c.status) && <p className="muted">{t('uploadWaitQuote')}</p>}
      {missing.length === 0 && <p className="ok-note">✓ {t('uploadDone')}</p>}
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


/** Counts up to `value` once on mount (instant when the viewer prefers reduced motion). */
function CountUp({ value, format, ms = 700 }: { value: number; format: (n: number) => string; ms?: number }) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduce) return setN(value);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(p < 1 ? Math.round((value * eased) / 1000) * 1000 : value);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms, reduce]);
  return <span aria-label={format(value)}>{format(n)}</span>;
}
