import { useEffect, useMemo, useState } from 'react';
import type { Agent, BuildingType, Case, Construction, Customer as CustomerT, DocKey, FireOccupancy, FireOffer, FirePeril, Package, RenewalItem } from '../types';
import { BUILDINGS, CONSTRUCTIONS, PERILS, PROVINCES_ALL, buildingName, fireEnd, firePackages, getFireProducts, getFireSettings, suggestBuildingSi, type FireApplicant } from '../data/fire';
import { tripRange } from '../data/travel';
import { fmtBaht, fmtDate, fmtDateTime, useT, type TKey } from '../i18n';
import { acceptProposal, createProposal, docMeta, sendRenewalPreview, setReminders, storeFiles, submitCase, totalPremium, trackStep, useStore } from '../store';
import { optionPrice, rateOf } from '../data/agents';
import { dayKey } from '../lib/time';
import { DateInput, Field, NumberInput, Segmented, toDmy } from './common';
import { productName } from './Products';
import { HERO_IMG, HeroBanner } from './HeroBanner';
import { OCR_SAMPLE, OcrBox, fakeDocSync, fakeHousePhoto } from './extras';

type T = ReturnType<typeof useT>['t'];

export const PERIL_KEY: Record<FirePeril, TKey> = { flood: 'fiFlood', storm: 'fiStorm', quake: 'fiQuake', hail: 'fiHail' };
export const CONSTRUCTION_KEY: Record<Construction, TKey> = { concrete: 'fiConcrete', mixed: 'fiMixed', wood: 'fiWood' };
const REF_KEY: Record<FireOffer['referral'][number], TKey> = { si: 'fiWhySi', wood: 'fiWhyWood', loss: 'fiWhyLoss', flood: 'fiWhyFlood' };

const fiName = (p: { nameTh?: string; nameEn?: string }, lang: 'th' | 'en') => productName({ ...p, type: 'FIRE' }, lang);
const periodText = (start: string, end: string, lang: 'th' | 'en') => tripRange({ start, end } as never, lang);
const perilList = (perils: FirePeril[], t: T) => [t('fiBase'), ...perils.map((p) => t(PERIL_KEY[p]))].join(' · ');

/* ---------------- shared pieces ---------------- */

/** Why the back office has to look at an application before it is issued. */
export function fireReasons(c: { pkg?: Package }, t: T): string[] {
  const f = c.pkg?.fire;
  if (!f) return [];
  const s = getFireSettings();
  return f.referral.map((r) => t(REF_KEY[r], { si: fmtBaht(s.referralSi, 'th'), province: f.province }));
}

/** Property, sums insured and perils of a fire case (back office, partner, customer). */
export function FireKv({ c }: { c: Case }) {
  const { t, lang } = useT();
  const f = c.pkg?.fire;
  if (!f) return null;
  const total = totalPremium(c);
  const why = fireReasons(c, t);
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
        <dd>{fiName(c.pkg!, lang)}{c.pkg?.ver ? <span className="muted"> · v{c.pkg.ver}</span> : null} <span className="muted">· {t(f.mode === 'plan' ? 'fiModePlan' : 'fiModeRate')}</span></dd>
        <dt>{t('fiProperty')}</dt>
        <dd>{buildingName(f.building, lang)} · {t(CONSTRUCTION_KEY[f.construction])} · {f.area} {t('fiSqm')} · {t('fiBuilt', { y: f.yearBuilt })} · {t(f.owner === 'owner' ? 'fiOwner' : 'fiTenant')}</dd>
        <dt>{t('fiLocation')}</dt>
        <dd>{f.address} · {f.province}{getFireSettings().floodProvinces.includes(f.province) ? <span className="muted"> · {t('fiFloodZone')}</span> : null}</dd>
        <dt>{t('fiBuildingSi')}</dt>
        <dd className="num">{fmtBaht(f.buildingSi, lang)}</dd>
        <dt>{t('fiContentsSi')}</dt>
        <dd className="num">{fmtBaht(f.contentsSi, lang)}</dd>
        <dt>{t('fiPerils')}</dt>
        <dd>{perilList(f.perils, t)}</dd>
        <dt>{t('trPeriod')}</dt>
        <dd>{periodText(f.start, f.end, lang)}</dd>
        <dt>{t('fiLoss')}</dt>
        <dd>{t(f.priorLoss ? 'fiLossYes' : 'fiLossNo')}</dd>
        {f.beneficiary && (<><dt>{t('fiBank')}</dt><dd>{f.beneficiary}</dd></>)}
        <dt>{t('premium')}</dt>
        <dd className="num">{total !== undefined ? fmtBaht(total, lang) : '—'}</dd>
        {c.policyNo && (<><dt>Policy</dt><dd className="num">{c.policyNo}</dd></>)}
        {c.payment && (<><dt>{t('paidBy')}</dt><dd>{t(c.payment.method === 'qr' ? 'payQr' : 'payCard')}</dd></>)}
      </dl>
    </>
  );
}

/** Policy schedule of a fire policy. */
export function FireCertificate({ c }: { c: Case }) {
  const { t, lang } = useT();
  const f = c.pkg?.fire;
  if (!f) return null;
  return (
    <div className="policy-doc tr-cert fire-cert reveal">
      <div className="pd-head">
        <div>
          <b>Jacky ประกันภัย · Jacky Insurance</b>
          <div className="muted">{t('fiCertTitle')}</div>
        </div>
        <div className="pd-no num">{c.policyNo}</div>
      </div>
      <dl>
        <div><dt>{t('insured')}</dt><dd>{c.customer.firstName} {c.customer.lastName}</dd></div>
        <div><dt>{t('fiLocation')}</dt><dd>{f.address} {f.province}</dd></div>
        <div><dt>{t('fiProperty')}</dt><dd>{buildingName(f.building, lang)} · {t(CONSTRUCTION_KEY[f.construction])} · {f.area} {t('fiSqm')}</dd></div>
        <div><dt>{t('trPlan')}</dt><dd>{fiName(c.pkg!, lang)}</dd></div>
        <div><dt>{t('trPeriod')}</dt><dd>{periodText(f.start, f.end, lang)}</dd></div>
        <div><dt>{t('fiBuildingSi')}</dt><dd className="num">{fmtBaht(f.buildingSi, lang)}</dd></div>
        <div><dt>{t('fiContentsSi')}</dt><dd className="num">{fmtBaht(f.contentsSi, lang)}</dd></div>
        <div><dt>{t('fiPerils')}</dt><dd>{perilList(f.perils, t)}</dd></div>
        {f.beneficiary && <div><dt>{t('fiBank')}</dt><dd>{f.beneficiary}</dd></div>}
        <div><dt>{t('premium')}</dt><dd className="num">{fmtBaht(c.premium ?? totalPremium(c) ?? 0, lang)}</dd></div>
      </dl>
      <div className="pd-foot muted">e-Policy · {fmtDateTime(c.stamps.issued ?? Date.now(), lang)} · DEMO</div>
    </div>
  );
}

/** Issued fire policy: expiry, renewal reminder and a preview of the reminder email. */
export function FireRenewBox({ c }: { c: Case }) {
  const { t, lang } = useT();
  const [sent, setSent] = useState(false);
  const f = c.pkg?.fire;
  if (!f) return null;
  const endText = fmtDate(new Date(`${f.end}T12:00:00+07:00`).getTime(), lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const rem = c.reminders ?? { renewal: true, tax: false };
  const nextPrice = c.premium ?? c.pkg?.premium ?? 0;
  return (
    <div className="renew-box pa-renew">
      <b>{t('renewTitle')}</b>
      <p className="hint">{t('fiRenewLead', { date: endText, price: fmtBaht(nextPrice, lang) })}</p>
      <label className="check"><input id={`rr-${c.id}`} type="checkbox" checked={rem.renewal} onChange={(e) => setReminders(c.id, { ...rem, renewal: e.target.checked })} />{t('remindRenew')}</label>
      {sent ? (
        <p className="ok-note" role="status">✓ {t('renewSent')}</p>
      ) : (
        <button type="button" className="link" onClick={() => { sendRenewalPreview(c.id, nextPrice, endText); setSent(true); }}>{t('renewPreview')} →</button>
      )}
    </div>
  );
}

/* ---------------- the property and the cover asked for ---------------- */

export interface FireForm {
  occupancy: FireOccupancy;
  building: BuildingType;
  construction: Construction;
  area: number | undefined;
  yearBuilt: number | undefined;
  owner: 'owner' | 'tenant';
  address: string;
  province: string;
  buildingSi: number | undefined;
  /** The customer typed a building sum; stop following the suggestion. */
  siTouched: boolean;
  contentsSi: number | undefined;
  perils: FirePeril[];
  priorLoss: boolean | null;
  beneficiary: string;
  start: string;
}

export const defaultFireForm = (): FireForm => ({
  occupancy: 'home',
  building: 'house',
  construction: 'concrete',
  area: 150,
  yearBuilt: 2015,
  owner: 'owner',
  address: '',
  province: 'กรุงเทพมหานคร',
  buildingSi: suggestBuildingSi('house', 150),
  siTouched: false,
  contentsSi: 300_000,
  perils: [],
  priorLoss: null,
  beneficiary: '',
  start: dayKey(Date.now()),
});

/** Sample properties, one per rule, to show each way an application goes. */
const SCENARIOS: { key: TKey; patch: () => Partial<FireForm> }[] = [
  { key: 'fiSmpInstant', patch: () => ({ occupancy: 'home', building: 'house', construction: 'concrete', area: 160, yearBuilt: 2018, owner: 'owner', address: '99/9 หมู่บ้านสุขใจ ถนนพหลโยธิน', province: 'กรุงเทพมหานคร', buildingSi: suggestBuildingSi('house', 160), siTouched: false, contentsSi: 300_000, perils: ['storm'], priorLoss: false, beneficiary: '' }) },
  { key: 'fiSmpSi', patch: () => ({ occupancy: 'home', building: 'house', construction: 'concrete', area: 420, yearBuilt: 2021, owner: 'owner', address: '8 ซอยสุขุมวิท 49', province: 'กรุงเทพมหานคร', buildingSi: suggestBuildingSi('house', 420), siTouched: false, contentsSi: 1_000_000, perils: ['storm', 'quake'], priorLoss: false, beneficiary: 'ธนาคารกสิกรไทย' }) },
  { key: 'fiSmpWood', patch: () => ({ occupancy: 'home', building: 'house', construction: 'wood', area: 120, yearBuilt: 1998, owner: 'owner', address: '45 หมู่ 3 ตำบลสันทราย', province: 'เชียงใหม่', buildingSi: suggestBuildingSi('house', 120), siTouched: false, contentsSi: 200_000, perils: [], priorLoss: false, beneficiary: '' }) },
  { key: 'fiSmpLoss', patch: () => ({ occupancy: 'home', building: 'townhouse', construction: 'concrete', area: 110, yearBuilt: 2012, owner: 'owner', address: '12/34 หมู่บ้านพฤกษา', province: 'สมุทรปราการ', buildingSi: suggestBuildingSi('townhouse', 110), siTouched: false, contentsSi: 200_000, perils: [], priorLoss: true, beneficiary: '' }) },
  { key: 'fiSmpFlood', patch: () => ({ occupancy: 'home', building: 'house', construction: 'concrete', area: 180, yearBuilt: 2010, owner: 'owner', address: '77 หมู่ 5 ตำบลบางปะอิน', province: getFireSettings().floodProvinces[0] ?? 'พระนครศรีอยุธยา', buildingSi: suggestBuildingSi('house', 180), siTouched: false, contentsSi: 300_000, perils: ['flood'], priorLoss: false, beneficiary: '' }) },
  { key: 'fiSmpShop', patch: () => ({ occupancy: 'shop', building: 'shophouse', construction: 'concrete', area: 200, yearBuilt: 2008, owner: 'tenant', address: '200 ถนนมิตรภาพ', province: 'ขอนแก่น', buildingSi: suggestBuildingSi('shophouse', 200), siTouched: false, contentsSi: 800_000, perils: ['storm'], priorLoss: false, beneficiary: '' }) },
];

/** Validate the form; the applicant is what the products are priced on. */
export function checkFire(f: FireForm, t: T, renewal = false) {
  const errors: Partial<Record<'area' | 'year' | 'address' | 'province' | 'si' | 'loss' | 'start', string>> = {};
  const plan = getFireSettings().mode === 'plan';
  if (!f.start || f.start < dayKey(Date.now())) errors.start = t('paErrStart');
  if (!(f.area && f.area > 0)) errors.area = t('errRequired');
  if (!(f.yearBuilt && f.yearBuilt >= 1900 && f.yearBuilt <= new Date().getFullYear())) errors.year = t('fiErrYear');
  if (!f.address.trim()) errors.address = t('errRequired');
  if (!PROVINCES_ALL.includes(f.province)) errors.province = t('errRequired');
  if (!plan && !((f.buildingSi ?? 0) + (f.contentsSi ?? 0) > 0)) errors.si = t('fiErrSi');
  if (!renewal && f.priorLoss === null) errors.loss = t('fiErrLoss');
  const applicant: FireApplicant = {
    occupancy: f.occupancy,
    building: f.building,
    construction: f.construction,
    area: f.area ?? 0,
    yearBuilt: f.yearBuilt ?? 0,
    owner: f.owner,
    address: f.address.trim(),
    province: f.province,
    buildingSi: f.buildingSi ?? 0,
    contentsSi: f.contentsSi ?? 0,
    perils: f.perils,
    priorLoss: !!f.priorLoss,
    beneficiary: f.beneficiary,
    start: f.start,
    renewal,
  };
  return { applicant, errors, plan };
}

export function FireFields({ f, set, errors, idPrefix = 'fi', renewal = false }: { f: FireForm; set: (p: Partial<FireForm>) => void; errors: ReturnType<typeof checkFire>['errors']; idPrefix?: string; renewal?: boolean }) {
  const { t, lang } = useT();
  const s = useStore();
  const plan = s.fireSettings.mode === 'plan';
  const suggested = f.area ? suggestBuildingSi(f.building, f.area) : 0;
  // The building sum follows the floor area until the customer types their own.
  useEffect(() => {
    if (!f.siTouched && !plan && suggested && suggested !== f.buildingSi) set({ buildingSi: suggested });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested, f.siTouched, plan]);
  const flood = s.fireSettings.floodProvinces.includes(f.province);
  return (
    <div className="tr-fields fire-fields">
      {!renewal && (
        <div className="fi-samples">
          <span className="hint">{t('fiSamples')}</span>
          {SCENARIOS.map((x) => (
            <button key={x.key} type="button" className="filter-chip" onClick={() => set(x.patch())}>{t(x.key)}</button>
          ))}
        </div>
      )}
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">1</span>{t('fiWhat')}</div>
        <div className="option-grid" role="radiogroup" aria-label={t('fiWhat')}>
          {(['home', 'shop'] as const).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={f.occupancy === o} className={`option-card${f.occupancy === o ? ' on' : ''}`} onClick={() => set({ occupancy: o, building: BUILDINGS[o][0] })}>
              <span className="radio-dot" aria-hidden="true" />
              <span>
                <b>{t(o === 'home' ? 'fiHome' : 'fiShop')}</b>
                <small>{t(o === 'home' ? 'fiHomeHint' : 'fiShopHint')}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="tr-date-grid">
          <Field htmlFor={`${idPrefix}-building`} label={t('fiBuilding')}>
            <select id={`${idPrefix}-building`} value={f.building} onChange={(e) => set({ building: e.target.value as BuildingType })}>
              {BUILDINGS[f.occupancy].map((b) => <option key={b} value={b}>{buildingName(b, lang)}</option>)}
            </select>
          </Field>
          <Field htmlFor={`${idPrefix}-construction`} label={t('fiConstruction')} hint={f.construction === 'wood' ? t('fiWoodHint') : undefined}>
            <select id={`${idPrefix}-construction`} value={f.construction} onChange={(e) => set({ construction: e.target.value as Construction })}>
              {CONSTRUCTIONS.map((c) => <option key={c} value={c}>{t(CONSTRUCTION_KEY[c])}</option>)}
            </select>
          </Field>
          <Field htmlFor={`${idPrefix}-area`} label={`${t('fiArea')} (${t('fiSqm')})`} error={errors.area}>
            <NumberInput id={`${idPrefix}-area`} value={f.area} onChange={(v) => set({ area: v })} />
          </Field>
          <Field htmlFor={`${idPrefix}-year`} label={t('fiYear')} error={errors.year}>
            <input id={`${idPrefix}-year`} inputMode="numeric" maxLength={4} value={f.yearBuilt ?? ''} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set({ yearBuilt: v ? Number(v) : undefined }); }} aria-invalid={!!errors.year} />
          </Field>
          <Field htmlFor={`${idPrefix}-owner`} label={t('fiOwnerQ')}>
            <select id={`${idPrefix}-owner`} value={f.owner} onChange={(e) => set({ owner: e.target.value as 'owner' | 'tenant' })}>
              <option value="owner">{t('fiOwner')}</option>
              <option value="tenant">{t('fiTenant')}</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">2</span>{t('fiLocation')}</div>
        <div className="tr-date-grid">
          <Field htmlFor={`${idPrefix}-address`} label={t('fiAddress')} error={errors.address}>
            <input id={`${idPrefix}-address`} value={f.address} placeholder={t('fiAddressPh')} onChange={(e) => set({ address: e.target.value })} aria-invalid={!!errors.address} />
          </Field>
          <Field htmlFor={`${idPrefix}-province`} label={t('province')} error={errors.province} hint={flood ? `⚠ ${t('fiFloodZone')}` : undefined}>
            <select id={`${idPrefix}-province`} value={f.province} onChange={(e) => set({ province: e.target.value })}>
              {PROVINCES_ALL.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">3</span>{t('fiSums')}</div>
        {plan ? (
          <p className="hint">{t('fiPlanSumsHint')}</p>
        ) : (
          <div className="tr-date-grid">
            <Field htmlFor={`${idPrefix}-bsi`} label={t('fiBuildingSi')} error={errors.si} hint={suggested ? t('fiSuggest', { v: fmtBaht(suggested, lang), cost: fmtBaht(s.fireSettings.costPerSqm[f.building], lang) }) : undefined}>
              <NumberInput id={`${idPrefix}-bsi`} value={f.buildingSi} onChange={(v) => set({ buildingSi: v, siTouched: true })} />
            </Field>
            <Field htmlFor={`${idPrefix}-csi`} label={t(f.occupancy === 'shop' ? 'fiStockSi' : 'fiContentsSi')}>
              <NumberInput id={`${idPrefix}-csi`} value={f.contentsSi} onChange={(v) => set({ contentsSi: v })} />
            </Field>
          </div>
        )}
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">4</span>{t('fiPerils')}</div>
        <p className="hint">✓ {t('fiBase')} {t('fiBaseIncl')}</p>
        <div className="fi-perils">
          {PERILS.map((p) => (
            <label key={p} className={`check fi-peril${f.perils.includes(p) ? ' on' : ''}`}>
              <input id={`${idPrefix}-peril-${p}`} type="checkbox" checked={f.perils.includes(p)} onChange={(e) => set({ perils: e.target.checked ? [...f.perils, p] : f.perils.filter((x) => x !== p) })} />
              <span>{t(PERIL_KEY[p])}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="tr-sec">
        <div className="section-label"><span className="section-n">5</span>{t('fiMore')}</div>
        <div className="tr-date-grid">
          <Field htmlFor={`${idPrefix}-start`} label={t('paStart')} error={errors.start} hint={f.start ? t('paCoverTo', { date: toDmy(fireEnd(f.start)) }) : undefined}>
            <DateInput id={`${idPrefix}-start`} value={f.start} min={dayKey(Date.now())} onChange={(v) => set({ start: v })} invalid={!!errors.start} />
          </Field>
          <Field htmlFor={`${idPrefix}-bank`} label={<>{t('fiBank')} <span className="opt">({t('optional')})</span></>} hint={t('fiBankHint')}>
            <input id={`${idPrefix}-bank`} value={f.beneficiary} onChange={(e) => set({ beneficiary: e.target.value })} />
          </Field>
        </div>
        {!renewal && (
          <div className={`pa-health fi-loss${errors.loss ? ' invalid' : ''}`}>
            <span>{t('fiLossQ')}</span>
            <span className="pa-yn" role="radiogroup" aria-label={t('fiLossQ')}>
              {([false, true] as const).map((v) => (
                <label key={String(v)} className={`chip-radio${f.priorLoss === v ? ' on' : ''}`}>
                  <input type="radio" name={`${idPrefix}-loss`} id={`${idPrefix}-loss-${v ? 'yes' : 'no'}`} checked={f.priorLoss === v} onChange={() => set({ priorLoss: v })} />
                  {t(v ? 'paYes' : 'paNo')}
                </label>
              ))}
            </span>
          </div>
        )}
        {errors.loss && <p className="error" role="alert">{errors.loss}</p>}
      </div>
    </div>
  );
}

/** Product cards: price, sums and perils. */
export function FirePlanCards({ pkgs, onChoose }: { pkgs: Package[]; onChoose: (p: Package) => void }) {
  const { t, lang } = useT();
  const products = getFireProducts();
  return (
    <div className="tr-plan-grid">
      {pkgs.map((p) => {
        const prod = products.find((x) => x.id === p.id);
        const hl = prod ? (lang === 'en' && prod.highlightsEn.length ? prod.highlightsEn : prod.highlightsTh) : [];
        const tag = prod ? (lang === 'en' && prod.tagEn ? prod.tagEn : prod.tagTh) : '';
        const f = p.fire!;
        return (
          <article key={p.id} className="tr-plan fire-plan">
            <header>
              <b>{fiName(p, lang)}</b>
              {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
            </header>
            {tag && <p className="hint">{tag}</p>}
            <div className="tr-plan-price num">{fmtBaht(p.premium, lang)}<small> {t('perYear')}</small></div>
            <ul className="tr-plan-list">
              <li><span>{t('fiBuildingSi')}</span><b className="num">{fmtBaht(f.buildingSi, lang)}</b></li>
              <li><span>{t(f.occupancy === 'shop' ? 'fiStockSi' : 'fiContentsSi')}</span><b className="num">{fmtBaht(f.contentsSi, lang)}</b></li>
              <li><span>{t('fiPerils')}</span><b>{perilList(f.perils, t)}</b></li>
            </ul>
            {hl.length > 0 && <ul className="ct-hl">{hl.map((h) => <li key={h}>{h}</li>)}</ul>}
            <button type="button" className="btn primary block" onClick={() => onChoose(p)}>{t('trChoose')}</button>
          </article>
        );
      })}
    </div>
  );
}

/** Review or instant-issue notice for the chosen cover. */
function FireNotice({ pkgs }: { pkgs: Package[] }) {
  const { t } = useT();
  if (!pkgs.length) return <p className="callout tone-bad">{t('trNoPlan')}</p>;
  const why = fireReasons({ pkg: pkgs[0] }, t);
  if (why.length) return (
    <div className="callout tone-warn pa-review-note">
      <b>🔎 {t('fiReviewNote')}</b>
      <ul>{why.map((w) => <li key={w}>{w}</li>)}</ul>
    </div>
  );
  return <p className="callout tone-good pa-instant-note">⚡ {t('paInstantNote')}</p>;
}

/* ---------------- policyholder details and documents ---------------- */

const samplePerson = (): CustomerT => ({
  firstName: 'มานพ',
  lastName: 'บ้านสวย',
  idCard: '1103700056789',
  phone: '0861234567',
  email: 'manop@example.com',
  address: '99/9 หมู่บ้านสุขใจ ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
  plate: '',
  province: '',
  chassis: '',
  startDate: '',
  driver1: '',
  driver2: '',
});
const blankPerson = (): CustomerT => ({ ...samplePerson(), firstName: '', lastName: '', idCard: '', phone: '', email: '', address: '' });

export function useFirePersonForm(initial?: Partial<CustomerT>, needDocs = true) {
  const { t } = useT();
  const [cust, setCust] = useState<CustomerT>(() => ({ ...blankPerson(), ...initial }));
  const [declared, setDeclared] = useState(false);
  // ID card copy (read by the simulated OCR) and a photo of the building's front.
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerT | 'declare' | 'docs', string>>>({});
  const validate = (needDeclare = true): CustomerT | null => {
    const e: typeof errors = {};
    if (needDocs && (!files.idcard || !files.house)) e.docs = t('fiErrDocs');
    for (const k of ['firstName', 'lastName', 'idCard', 'phone', 'email'] as const) if (!(cust[k] ?? '').trim()) e[k] = t('errRequired');
    if (!e.idCard && !/^\d{13}$/.test(cust.idCard.replace(/[\s-]/g, ''))) e.idCard = t('errIdCard');
    if (!e.phone && !/^0\d{9}$/.test(cust.phone.replace(/[\s-]/g, ''))) e.phone = t('errPhone');
    if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email)) e.email = t('errEmail');
    if (needDeclare && !declared) e.declare = t('trErrDeclare');
    setErrors(e);
    if (Object.keys(e).length) return null;
    return { ...cust, idCard: cust.idCard.replace(/[\s-]/g, ''), phone: cust.phone.replace(/[\s-]/g, '') };
  };
  const fields = (idPrefix = 'ff', withDeclare = true) => {
    const input = (k: keyof CustomerT, label: TKey, opts: { optional?: boolean; type?: string; inputMode?: 'numeric' | 'tel' | 'email' } = {}) => (
      <Field key={k} htmlFor={`${idPrefix}-${k}`} label={<>{t(label)}{opts.optional && <span className="opt"> ({t('optional')})</span>}</>} error={errors[k]}>
        <input id={`${idPrefix}-${k}`} type={opts.type ?? 'text'} inputMode={opts.inputMode} value={cust[k] ?? ''} onChange={(e) => setCust((c) => ({ ...c, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
      </Field>
    );
    return (
      <>
        {needDocs && (
          <>
            <OcrBox
              idPrefix={`${idPrefix}-ocr`}
              kinds={['id']}
              title={t('fiDocsTitle')}
              lead={t('fiDocsLead')}
              attached={files.idcard ? ['id'] : []}
              invalid={!!errors.docs && !files.idcard}
              onRead={(kind, file) => {
                setCust((c) => ({ ...c, ...OCR_SAMPLE[kind] }));
                setFiles((f) => ({ ...f, idcard: file }));
              }}
            />
            <label htmlFor={`${idPrefix}-house`} className={`btn fi-house${files.house ? ' done' : ''}${errors.docs && !files.house ? ' invalid' : ''}`}>
              {files.house ? `✓ ${t('fiHouseDone')}` : `🏠 ${t('fiHouse')}`}
              <input id={`${idPrefix}-house`} type="file" accept=".jpg,.jpeg,image/jpeg" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFiles((f) => ({ ...f, house: file })); e.target.value = ''; }} />
            </label>
          </>
        )}
        {errors.docs && <p className="error" role="alert">{errors.docs}</p>}
        <div className="tr-form-grid">
          {input('firstName', 'firstName')}
          {input('lastName', 'lastName')}
          {input('idCard', 'idCard', { inputMode: 'numeric' })}
          {input('phone', 'phone', { type: 'tel', inputMode: 'tel' })}
          {input('email', 'email', { type: 'email', inputMode: 'email' })}
          {input('address', 'addrIdCard', { optional: true })}
        </div>
        {withDeclare && (
          <label className={`check tr-declare${errors.declare ? ' invalid' : ''}`}>
            <input id={`${idPrefix}-declare`} type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            <span>{t('fiDeclare')}</span>
          </label>
        )}
        {withDeclare && errors.declare && <p className="error" role="alert">{errors.declare}</p>}
      </>
    );
  };
  const fillSample = () => {
    const sample = samplePerson();
    setCust(sample);
    if (needDocs) setFiles({ idcard: fakeDocSync('idcard', { customer: sample }), house: fakeHousePhoto() });
  };
  return { cust, validate, fields, files, fillSample, setDeclared };
}

/* ---------------- customer buying flow ---------------- */

type FireStep = 'about' | 'plan' | 'form' | 'checkout' | 'sent';

function FireSteps({ step }: { step: FireStep }) {
  const { t } = useT();
  const order: [FireStep[], TKey][] = [[['about'], 'fiStepAbout'], [['plan'], 'trStepPlan'], [['form'], 'fiStepForm'], [['checkout', 'sent'], 'trStepPay']];
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

export function FireBuy({ renderCheckout, onTrack }: { renderCheckout: (id: string, restart: () => void) => React.ReactNode; onTrack: (id: string) => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [step, setStep] = useState<FireStep>('about');
  const [f, setF] = useState<FireForm>(defaultFireForm);
  const [tried, setTried] = useState(false);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const set = (p: Partial<FireForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkFire(f, t);
  const errors = tried ? chk.errors : {};
  const ok = !Object.keys(chk.errors).length;
  const pkgs = useMemo(() => (ok ? firePackages(chk.applicant, { channel: 'self' }) : []), [JSON.stringify(chk.applicant), ok, s.fireProducts, s.fireSettings]);
  const form = useFirePersonForm();
  useEffect(() => trackStep('visit'), []);

  const goPlans = () => {
    setTried(true);
    if (!ok || !pkgs.length) return;
    setStep('plan');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg?.fire) return;
    const customer = form.validate();
    if (!customer) return;
    const referral = pkg.fire.referral.length > 0;
    // A referred application goes to the back office (like a Class 1 package); the rest pay and are issued at once.
    const id = submitCase({ source: referral ? 'package' : 'self', coverage: 'FIRE', pkg, addCmi: false, customer: { ...customer, startDate: pkg.fire.start }, docs: docMeta(form.files) });
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
    <div className="buy travel fire">
      {step === 'about' && <HeroBanner img={HERO_IMG.fire} title={t('fiTitle')} lead={t('fiLead')} className="hero-fire" />}
      <FireSteps step={step} />

      {step === 'about' && (
        <section className="panel wide tr-panel">
          <h2>{t('fiInfo')}</h2>
          <FireFields f={f} set={set} errors={errors} />
          {ok && <FireNotice pkgs={pkgs} />}
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
              <h2>{t('fiPlanTitle')}</h2>
              <p className="lead">{buildingName(f.building, lang)} · {t(CONSTRUCTION_KEY[f.construction])} · {f.province}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={() => setStep('about')}>{t('trChange')}</button>
          </div>
          <FireNotice pkgs={pkgs} />
          <FirePlanCards pkgs={pkgs} onChoose={(p) => { setPkg(p); setStep('form'); }} />
        </section>
      )}

      {step === 'form' && pkg?.fire && (
        <section className="panel wide tr-panel">
          <div className="panel-head">
            <div>
              <h2>{t('fiFormTitle')}</h2>
              <p className="lead">{t('fiFormLead')}</p>
            </div>
            <button type="button" className="btn ghost small" onClick={form.fillSample}>{t('trSample')}</button>
          </div>
          <div className="tr-chosen">
            <b>{fiName(pkg, lang)}</b>
            <span className="muted">{periodText(pkg.fire.start, pkg.fire.end, lang)}</span>
            <b className="num">{fmtBaht(pkg.premium, lang)}</b>
            <button type="button" className="link" onClick={() => setStep('plan')}>{t('trChange')}</button>
          </div>
          <form onSubmit={submit} noValidate>
            {form.fields()}
            <div className="actions">
              <button type="submit" className="btn primary">{t(pkg.fire.referral.length ? 'paSendReview' : 'trToPay')} →</button>
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

/* ---------------- partner: sell or quote fire ---------------- */

/** A fire renewal the partner starts from the renewal list: the property and cover are filled in. */
export interface FirePrefill {
  renewalOf: string;
  productId: string;
  form: Partial<FireForm>;
  customer: Partial<CustomerT>;
}

export const firePrefillFrom = (r: RenewalItem): FirePrefill | null => {
  if (!r.fire) return null;
  const [firstName, ...ln] = r.customerName.split(' ');
  const x = r.fire;
  return {
    renewalOf: r.id,
    productId: x.productId,
    form: { occupancy: x.occupancy, building: x.building, construction: x.construction, area: x.area, yearBuilt: x.yearBuilt, owner: x.owner, address: x.address, province: x.province, buildingSi: x.buildingSi, siTouched: true, contentsSi: x.contentsSi, perils: x.perils, priorLoss: false, beneficiary: x.beneficiary ?? '', start: dayKey(Math.max(Date.now(), r.expiry + 86_400_000)) },
    customer: { firstName, lastName: ln.join(' '), phone: r.phone, idCard: x.idCard, email: x.email },
  };
};

/** Partner screen for fire: sell on the spot or send a quotation of up to three products. */
export function FireSell({ agent, onCase, renderMade, initialPick, prefill }: { agent: Agent; onCase: (id: string) => void; renderMade: (id: string, again: () => void) => React.ReactNode; initialPick?: string; prefill?: FirePrefill | null }) {
  const { t, lang } = useT();
  const s = useStore();
  const renewal = !!prefill;
  const pickedPlan = initialPick ? s.fireProducts.find((p) => p.id === initialPick) : undefined;
  const [f, setF] = useState<FireForm>(() => ({ ...defaultFireForm(), ...(pickedPlan ? { occupancy: pickedPlan.occupancy, building: BUILDINGS[pickedPlan.occupancy][0] } : {}), ...prefill?.form }));
  const [mode, setMode] = useState<'buy' | 'quote'>('buy');
  const first = prefill?.productId ?? initialPick;
  const [picked, setPicked] = useState<string[]>(first ? [first] : []);
  const [disc, setDisc] = useState(0);
  const [collect, setCollect] = useState<'link' | 'agent'>('link');
  const [consent, setConsent] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const set = (p: Partial<FireForm>) => setF((x) => ({ ...x, ...p }));
  const chk = checkFire(f, t, renewal);
  const ok = !Object.keys(chk.errors).length;
  const pkgs = useMemo(() => (ok ? firePackages(chk.applicant, { channel: 'partner', agentId: agent.id }) : []), [JSON.stringify(chk.applicant), ok, agent.id, s.fireProducts, s.fireSettings]);
  const chosen = pkgs.filter((p) => picked.includes(p.id));
  const maxDisc = Math.round(Math.max(0, ...chosen.map((p) => rateOf(p) * 100)));
  const form = useFirePersonForm(prefill?.customer, !renewal);
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
    <div className="ag-sell tr-sell fire-sell">
      {pickedPlan && <p className="callout tone-info tr-picked">✓ {t('trPickedFromCatalog', { name: lang === 'en' ? pickedPlan.nameEn || pickedPlan.nameTh : pickedPlan.nameTh })}</p>}
      {renewal && <p className="callout tone-info">↻ {t('fiRenewing')}</p>}
      <section className="card">
        <h3>🏠 {t('fiInfo')}</h3>
        <FireFields f={f} set={set} errors={chk.errors} idPrefix="ag-fi" renewal={renewal} />
      </section>
      <section className="card ag-pkgs">
        <div className="card-head">
          <div>
            <h3>{t('fiPlanTitle')}</h3>
            <p className="hint">{mode === 'buy' ? t('trBuyHint') : t('trQuoteHint', { n: chosen.length })}</p>
          </div>
          <Segmented id="ag-fi-mode" label={t('agMode')} value={mode} onChange={(m) => { setMode(m); setPicked((p) => (m === 'buy' ? p.slice(0, 1) : p)); setErr(''); }} options={[
            { value: 'buy', label: t('agModeBuy') },
            { value: 'quote', label: t('agModeQuote') },
          ]} />
        </div>
        {ok && <FireNotice pkgs={pkgs} />}
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
                      <td><input type={mode === 'buy' ? 'radio' : 'checkbox'} name="ag-fi-pkg" aria-label={p.id} checked={on} onChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} /></td>
                      <td><b>{fiName(p, lang)}</b></td>
                      <td className="muted">{t('fiBuildingSi')} {fmtBaht(p.fire?.buildingSi ?? 0, lang)} · {t('fiContentsSi')} {fmtBaht(p.fire?.contentsSi ?? 0, lang)} · {perilList(p.fire?.perils ?? [], t)}</td>
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
              <h3>{t('fiHolder')}</h3>
              <div className="tr-ag-sample"><button type="button" className="btn small ghost" onClick={() => { form.fillSample(); form.setDeclared(true); }}>{t('trSample')}</button></div>
              {form.fields('ag-ff', mode === 'buy')}
            </div>
            <div>
              <h3>{t('agPrice')}</h3>
              <div className="field ag-disc">
                <label htmlFor="ag-fi-disc">{t('agDiscount')} <b className="num">{disc}%</b></label>
                <input id="ag-fi-disc" type="range" min={0} max={maxDisc} step={1} value={disc} disabled={!chosen.length} onChange={(e) => setDisc(Number(e.target.value))} />
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
                        <b>{fiName(p, lang)}</b>
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
                    <label className="check"><input type="radio" name="ag-fi-collect" checked={collect === 'link'} onChange={() => setCollect('link')} /> <span>{t('collectLink')}</span></label>
                    <label className="check"><input type="radio" name="ag-fi-collect" checked={collect === 'agent'} onChange={() => setCollect('agent')} /> <span>{t('collectAgent')}</span></label>
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
