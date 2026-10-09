import { useMemo, useRef, useState } from 'react';
import type { CoverageType, DocKey, Product, ProductExtra, RateRow, UsageCode } from '../types';
import { COVERAGE_TYPES } from '../data/packages';
import { EXTRAS, SI_TOP, blankProduct, isExpired, priceRange, standardCommission, standardCover } from '../data/products';
import { CATALOGUE_CODES, MODELS, STAFF, brandById, modelById } from '../data/vehicles';
import { COVERAGE_LABEL, DOC_LABEL, USAGE_LABEL, fmtBaht, fmtDateTime, useT, type TKey } from '../i18n';
import { rollbackProduct, saveProduct, saveProducts, useStore } from '../store';
import { productStats } from '../lib/productStats';
import { planImport, productsToSheets, type ImportItem } from '../lib/productSheets';
import { readXlsx, writeXlsx } from '../lib/xlsx';
import { putFile } from '../files';
import { TypeTag } from './common';

const DOC_KEYS: DocKey[] = ['front', 'back', 'left', 'right', 'regbook', 'idcard'];
export const EXTRA_KEY: Record<ProductExtra, TKey> = {
  flood: 'pxFlood',
  roadside: 'pxRoadside',
  towing: 'pxTowing',
  courtesyCar: 'pxCourtesy',
  evBattery: 'pxEvBattery',
  glass: 'pxGlass',
};
/** Editor sections, used to name what changed in the history. */
const FIELD_KEY: Record<string, TKey> = {
  created: 'pdChCreated',
  nameTh: 'pdSecMarketing',
  nameEn: 'pdSecMarketing',
  tagTh: 'pdSecMarketing',
  tagEn: 'pdSecMarketing',
  highlightsTh: 'pdSecMarketing',
  highlightsEn: 'pdSecMarketing',
  badge: 'pdSecMarketing',
  channels: 'pdSecSale',
  partners: 'pdSecSale',
  saleUntil: 'pdSaleUntil',
  repair: 'pdSecCover',
  deductible: 'pdSecCover',
  ownDamage: 'pdSecCover',
  fireTheft: 'pdSecCover',
  tpbiPerson: 'pdSecCover',
  tpbiAccident: 'pdSecCover',
  tppd: 'pdSecCover',
  pa: 'pdSecCover',
  medical: 'pdSecCover',
  bail: 'pdSecCover',
  extras: 'pdSecExtras',
  maxAge: 'pdSecRules',
  codes: 'pdSecRules',
  ev: 'pdSecRules',
  evLoading: 'pdSecRules',
  excludeModels: 'pdSecRules',
  rates: 'pdSecRates',
  docs: 'pdSecDocs',
  commission: 'pdSecCommission',
  partnerCommission: 'pdSecCommission',
  termsTh: 'pdSecTerms',
  termsEn: 'pdSecTerms',
  exclusionsTh: 'pdSecTerms',
  exclusionsEn: 'pdSecTerms',
  pdf: 'pdSecTerms',
  archived: 'pdArchived',
};

const staffName = (id: string, lang: 'th' | 'en') => {
  const st = STAFF.find((x) => x.id === id);
  return st ? st[lang] : id === 'system' ? 'System' : id;
};
export const productName = (p: { nameTh?: string; nameEn?: string; type: CoverageType }, lang: 'th' | 'en') =>
  (lang === 'th' ? p.nameTh : p.nameEn || p.nameTh) || COVERAGE_LABEL[lang][p.type];
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const newId = () => `P-${Date.now().toString(36).toUpperCase().slice(-6)}`;

/** Back office: the product catalogue. */
export function ProductsAdmin({ staffId }: { staffId: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const [type, setType] = useState<CoverageType | 'all'>('all');
  const [editing, setEditing] = useState<{ p: Product; isNew: boolean } | null>(null);
  const [newType, setNewType] = useState<CoverageType>('T1');
  const [plan, setPlan] = useState<ImportItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => productStats(s.cases, s.proposals), [s.cases, s.proposals]);
  const list = s.products.filter((p) => !p.archived && (type === 'all' || p.type === type));

  if (editing) {
    const p = s.products.find((x) => x.id === editing.p.id);
    return <ProductEditor key={editing.p.id} initial={editing.isNew ? editing.p : (p ?? editing.p)} isNew={editing.isNew && !p} staffId={staffId} onClose={() => setEditing(null)} />;
  }

  const exportFile = () => {
    const blob = writeXlsx(productsToSheets(s.products));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `abc-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    setMsg(null);
    try {
      setPlan(planImport(await readXlsx(f), s.products, staffId));
    } catch {
      setMsg(t('pdImportBad'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const toggle = (p: Product, ch: 'self' | 'partner') => saveProduct({ ...p, channels: { ...p.channels, [ch]: !p.channels[ch] } }, staffId, 'toggle');

  return (
    <section className="leads products-admin">
      <div className="list-head">
        <div>
          <h2>{t('tabProducts')}</h2>
          <p className="hint">{t('pdLead')}</p>
        </div>
        <div className="pd-tools">
          <button type="button" className="btn ghost small" onClick={exportFile}>⬇ {t('pdExport')}</button>
          <button type="button" className="btn ghost small" onClick={() => fileRef.current?.click()}>⬆ {t('pdImport')}</button>
          <input ref={fileRef} id="pd-import" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => void importFile(e.target.files?.[0])} />
          <span className="pd-new">
            <label htmlFor="pd-new-type" className="sr-only">{t('pdClass')}</label>
            <select id="pd-new-type" value={newType} onChange={(e) => setNewType(e.target.value as CoverageType)}>
              {COVERAGE_TYPES.map((x) => <option key={x} value={x}>{COVERAGE_LABEL[lang][x]}</option>)}
            </select>
            <button type="button" className="btn primary small" onClick={() => setEditing({ p: blankProduct(newType, newId(), staffId), isNew: true })}>+ {t('pdNew')}</button>
          </span>
        </div>
      </div>
      {msg && <p className="error" role="alert">{msg}</p>}
      <div className="chips-row" role="radiogroup" aria-label={t('pdClass')}>
        {(['all', ...COVERAGE_TYPES] as const).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={type === x} className={`filter-chip${type === x ? ' on' : ''}`} onClick={() => setType(x)}>
            {x === 'all' ? t('filterAll') : COVERAGE_LABEL[lang][x]}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="data pd-table">
          <thead>
            <tr>
              <th>{t('pdProduct')}</th>
              <th>{t('pdChSelf')}</th>
              <th>{t('pdChPartner')}</th>
              <th className="r">{t('pdPrice')}</th>
              <th>{t('pdSaleUntil')}</th>
              <th>{t('pdSecCommission')}</th>
              <th className="r">{t('pdSold')}</th>
              <th className="r">{t('pdConv')}</th>
              <th>{t('pdVersion')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const st = stats.get(p.id);
              const range = priceRange(p);
              const expired = isExpired(p);
              const nPartner = Object.keys(p.partnerCommission).length;
              return (
                <tr key={p.id} className={expired || (!p.channels.self && !p.channels.partner) ? 'inactive' : ''}>
                  <td>
                    <div className="pd-name">
                      <TypeTag type={p.type} />
                      <b>{productName(p, lang)}</b>
                      {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                    </div>
                    <div className="hint num">{p.id}</div>
                  </td>
                  {(['self', 'partner'] as const).map((ch) => (
                    <td key={ch}>
                      <label className="switch">
                        <input type="checkbox" id={`pd-${ch}-${p.id}`} checked={p.channels[ch]} onChange={() => toggle(p, ch)} />
                        <span className="switch-track" aria-hidden="true" />
                        <span className="sr-only">{t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')} {productName(p, lang)}</span>
                      </label>
                    </td>
                  ))}
                  <td className="r num">{range ? (range[0] === range[1] ? fmtBaht(range[0], lang) : `${fmtBaht(range[0], lang)} – ${fmtBaht(range[1], lang)}`) : '—'}</td>
                  <td>{p.saleUntil ? <span className={expired ? 'chip tone-bad' : 'num'}>{expired ? t('pdExpired') : ''} {p.saleUntil}</span> : <span className="muted">{t('pdNoEnd')}</span>}</td>
                  <td>
                    {p.commission === undefined ? <span className="muted">{t('pdComStd', { pct: standardCommission(p.type) })}</span> : <b>{t('pdComSpecial', { pct: p.commission })}</b>}
                    {nPartner > 0 && <div className="hint">{t('pdComPartners', { n: nPartner })}</div>}
                  </td>
                  <td className="r num">
                    {st?.policies ?? 0}
                    <div className="hint">{fmtBaht(Math.round(st?.gwp ?? 0), lang)}</div>
                  </td>
                  <td className="r num">{st && st.offered ? `${Math.round((st.won / st.offered) * 100)}%` : '—'}</td>
                  <td className="num">v{p.ver}<div className="hint">{fmtDateTime(p.updatedAt, lang)}</div></td>
                  <td>
                    <div className="pd-row-actions">
                    <button type="button" className="btn small" onClick={() => setEditing({ p, isNew: false })}>{t('pdEdit')}</button>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => setEditing({ p: { ...structuredClone(p), id: newId(), ver: 0, nameTh: `${p.nameTh} (${t('pdCopySuffix')})`, nameEn: p.nameEn ? `${p.nameEn} (copy)` : '', badge: undefined, channels: { self: false, partner: false } }, isNew: true })}
                    >
                      {t('pdCopy')}
                    </button>
                  </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {plan && <ImportReview plan={plan} staffId={staffId} onClose={() => setPlan(null)} onDone={(n) => { setPlan(null); setMsg(t('pdImported', { n })); }} />}
    </section>
  );
}

function ImportReview({ plan, staffId, onClose, onDone }: { plan: ImportItem[]; staffId: string; onClose: () => void; onDone: (n: number) => void }) {
  const { t, lang } = useT();
  const ready = plan.filter((i) => (i.kind === 'new' || i.kind === 'changed') && i.product);
  const errs = plan.filter((i) => i.kind === 'error');
  const label = (i: ImportItem) => (i.product ? productName(i.product, lang) : i.sheet);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pd-import" role="dialog" aria-modal="true" aria-label={t('pdImportTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('pdImportTitle')}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>{t('close')} ✕</button>
        </div>
        <p className="hint">{t('pdImportSummary', { changed: ready.length, same: plan.filter((i) => i.kind === 'same').length, err: errs.length })}</p>
        <ul className="pd-import-list">
          {plan.map((i) => (
            <li key={`${i.sheet}-${i.id}`} className={`pd-imp pd-imp-${i.kind}`}>
              <div className="pd-imp-head">
                <span className={`chip ${i.kind === 'error' ? 'tone-bad' : i.kind === 'same' ? 'tone-muted' : i.kind === 'new' ? 'tone-info' : 'tone-good'}`}>{t(`pdImp_${i.kind}` as TKey)}</span>
                <b>{label(i)}</b>
                <span className="muted num">{i.id || i.sheet}</span>
              </div>
              {i.stale && <p className="hint tone-warn">⚠ {t('pdImpStale', { file: i.stale.file, now: i.stale.now })}</p>}
              {i.fields.length > 0 && <p className="hint">{t('pdImpFields')}: {[...new Set(i.fields.map((f) => t(FIELD_KEY[f] ?? 'pdSecMarketing')))].join(', ')}</p>}
              {(i.rates.added > 0 || i.rates.removed > 0 || i.rates.changed.length > 0) && i.kind !== 'error' && (
                <div className="hint">
                  {t('pdImpRates', { add: i.rates.added, del: i.rates.removed, chg: i.rates.changed.length })}
                  {i.rates.changed.length > 0 && (
                    <ul className="pd-imp-cells">
                      {i.rates.changed.slice(0, 6).map((c) => (
                        <li key={`${c.band}-${c.code}`} className="num">
                          {c.band} · {c.code}: {c.from === undefined ? '—' : fmtBaht(c.from, lang)} → <b>{c.to === undefined ? '—' : fmtBaht(c.to, lang)}</b>
                        </li>
                      ))}
                      {i.rates.changed.length > 6 && <li className="muted">+{i.rates.changed.length - 6}</li>}
                    </ul>
                  )}
                </div>
              )}
              {i.errors.length > 0 && (
                <ul className="pd-imp-errors">
                  {i.errors.map((e, k) => (
                    <li key={k}>{t(`pdErr_${e.code}` as TKey)}{e.row ? ` · ${t('pdErrAt', { cell: `${e.col ?? 'B'}${e.row}` })}` : ''}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {errs.length > 0 && <p className="hint">{t('pdImportSkip')}</p>}
        <div className="pd-import-foot">
          <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="btn primary" disabled={!ready.length} onClick={() => onDone(saveProducts(ready.map((i) => ({ p: i.product!, note: 'import' })), staffId))}>
            {t('pdImportConfirm', { n: ready.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

function rateIssues(rates: RateRow[]): number[] {
  const bad: number[] = [];
  const sorted = rates.map((r, i) => ({ r, i })).sort((a, b) => a.r.siFrom - b.r.siFrom);
  sorted.forEach(({ r, i }, k) => {
    if (r.siTo < r.siFrom || (k > 0 && r.siFrom <= sorted[k - 1].r.siTo)) bad.push(i);
  });
  return bad;
}

function NumInput({ id, value, onChange, min = 0, step, placeholder, label }: { id: string; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; step?: number; placeholder?: string; label?: string }) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      aria-label={label}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

function ProductEditor({ initial, isNew, staffId, onClose }: { initial: Product; isNew: boolean; staffId: string; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [d, setD] = useState<Product>(() => structuredClone(initial));
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [stdDone, setStdDone] = useState(false);
  const [exModel, setExModel] = useState('');
  const [tryCode, setTryCode] = useState<UsageCode>('110');
  const [trySi, setTrySi] = useState(500_000);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setD((x) => ({ ...x, [k]: v }));
  const history = s.productLog.filter((v) => v.id === d.id);
  const badRows = rateIssues(d.rates);
  const isCmi = d.type === 'CMI';

  const applyStandard = () => {
    setD((x) => ({ ...x, ...standardCover(x.type) }));
    setStdDone(true);
  };
  const save = () => {
    if (!d.nameTh.trim()) return setErr(t('pdErr_noName'));
    if (!d.rates.length) return setErr(t('pdErr_noRates'));
    if (badRows.length) return setErr(t('pdErr_overlap'));
    setErr(null);
    const ok = saveProduct({ ...d, rates: [...d.rates].sort((a, b) => a.siFrom - b.siFrom) }, staffId, note.trim());
    setSaved(ok);
    setNote('');
    if (!ok) setErr(t('pdNoChange'));
  };
  const uploadPdf = async (f?: File) => {
    if (!f) return;
    const key = `product-pdf-${d.id}-${Date.now()}`;
    await putFile(key, f);
    set('pdf', { name: f.name, key });
  };
  const rule = (k: 'ownDamage' | 'fireTheft') => {
    const r = d[k];
    return (
      <div className="pd-rule">
        <select id={`pd-${k}-mode`} aria-label={t(k === 'ownDamage' ? 'ownDamage' : 'fireTheft')} value={r.mode} onChange={(e) => set(k, { ...r, mode: e.target.value as typeof r.mode })}>
          <option value="none">{t('pdRuleNone')}</option>
          <option value="si">{t('pdRuleSi')}</option>
          <option value="fixed">{t('pdRuleFixed')}</option>
          <option value="pct">{t('pdRulePct')}</option>
        </select>
        {r.mode === 'fixed' && <NumInput id={`pd-${k}-val`} label={t('pdAmount')} value={r.value} step={10000} onChange={(v) => set(k, { ...r, value: v ?? 0 })} />}
        {r.mode === 'pct' && (
          <>
            <NumInput id={`pd-${k}-pct`} label="%" value={r.value} onChange={(v) => set(k, { ...r, value: v ?? 0 })} />
            <span className="muted">% · {t('pdCap')}</span>
            <NumInput id={`pd-${k}-cap`} label={t('pdCap')} value={r.cap} step={10000} onChange={(v) => set(k, { ...r, cap: v })} />
          </>
        )}
      </div>
    );
  };
  const money = (k: 'tpbiPerson' | 'tpbiAccident' | 'tppd' | 'pa' | 'medical' | 'bail' | 'deductible', label: TKey) => (
    <div className="field">
      <label htmlFor={`pd-${k}`}>{t(label)}</label>
      <NumInput id={`pd-${k}`} value={d[k]} step={1000} onChange={(v) => set(k, v ?? 0)} />
    </div>
  );
  const tryRow = d.rates.find((r) => trySi >= r.siFrom && trySi <= r.siTo);
  const tryPrice = tryRow?.prices[tryCode];

  return (
    <section className="pd-editor">
      <div className="pd-ed-head">
        <button type="button" className="btn ghost small" onClick={onClose}>← {t('pdBack')}</button>
        <div>
          <h3>
            <TypeTag type={d.type} /> {isNew ? t('pdNewTitle') : productName(d, lang)}
          </h3>
          <p className="hint num">{d.id}{!isNew && ` · v${initial.ver} · ${t('pdUpdated', { at: fmtDateTime(initial.updatedAt, lang), by: staffName(initial.updatedBy, lang) })}`}</p>
        </div>
      </div>

      <div className="pd-ed-grid">
        <div className="pd-ed-main">
          <fieldset className="card pd-sec">
            <legend>{t('pdSecMarketing')}</legend>
            <div className="form-grid">
              <div className="field"><label htmlFor="pd-nameTh">{t('pdNameTh')}</label><input id="pd-nameTh" value={d.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-nameEn">{t('pdNameEn')}</label><input id="pd-nameEn" value={d.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-tagTh">{t('pdTagTh')}</label><input id="pd-tagTh" value={d.tagTh} onChange={(e) => set('tagTh', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-tagEn">{t('pdTagEn')}</label><input id="pd-tagEn" value={d.tagEn} onChange={(e) => set('tagEn', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-hlTh">{t('pdHlTh')}</label><textarea id="pd-hlTh" rows={3} value={d.highlightsTh.join('\n')} onChange={(e) => set('highlightsTh', e.target.value.split('\n'))} onBlur={() => set('highlightsTh', lines(d.highlightsTh.join('\n')))} /></div>
              <div className="field"><label htmlFor="pd-hlEn">{t('pdHlEn')}</label><textarea id="pd-hlEn" rows={3} value={d.highlightsEn.join('\n')} onChange={(e) => set('highlightsEn', e.target.value.split('\n'))} onBlur={() => set('highlightsEn', lines(d.highlightsEn.join('\n')))} /></div>
              <div className="field">
                <label htmlFor="pd-badge">{t('pdBadge')}</label>
                <select id="pd-badge" value={d.badge ?? ''} onChange={(e) => set('badge', (e.target.value || undefined) as Product['badge'])}>
                  <option value="">{t('none')}</option>
                  <option value="recommended">{t('pdBadgeRec')}</option>
                  <option value="new">{t('pdBadgeNew')}</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecSale')}</legend>
            <div className="pd-row">
              {(['self', 'partner'] as const).map((ch) => (
                <label key={ch} className="switch">
                  <input type="checkbox" id={`pd-ed-${ch}`} checked={d.channels[ch]} onChange={() => set('channels', { ...d.channels, [ch]: !d.channels[ch] })} />
                  <span className="switch-track" aria-hidden="true" />
                  {t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')}
                </label>
              ))}
            </div>
            <div className="field">
              <span className="field-label">{t('pdWhoSells')}</span>
              <div className="pd-row">
                <label className="check"><input type="radio" name="pd-partners" checked={d.partners === 'all'} onChange={() => set('partners', 'all')} />{t('pdAllPartners')}</label>
                <label className="check"><input type="radio" name="pd-partners" checked={d.partners !== 'all'} onChange={() => set('partners', [])} />{t('pdSomePartners')}</label>
              </div>
              {d.partners !== 'all' && (
                <div className="pd-chips">
                  {s.agents.map((a) => {
                    const on = (d.partners as string[]).includes(a.id);
                    return (
                      <label key={a.id} className={`check pd-pick${on ? ' on' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => set('partners', on ? (d.partners as string[]).filter((x) => x !== a.id) : [...(d.partners as string[]), a.id])} />
                        <span className="num">{a.code}</span> {a[lang]}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="field pd-until">
              <label htmlFor="pd-until">{t('pdSaleUntil')}</label>
              <div className="pd-row">
                <input id="pd-until" type="date" value={d.saleUntil ?? ''} onChange={(e) => set('saleUntil', e.target.value || undefined)} />
                {d.saleUntil && <button type="button" className="btn ghost small" onClick={() => set('saleUntil', undefined)}>{t('pdNoEnd')}</button>}
              </div>
              <span className="hint">{t('pdSaleUntilHint')}</span>
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecCover')}</legend>
            <div className="pd-std">
              <button type="button" className="btn small" onClick={applyStandard}>★ {t('pdStdBtn', { type: COVERAGE_LABEL[lang][d.type] })}</button>
              <span className="hint">{stdDone ? `✓ ${t('pdStdDone')}` : t('pdStdHint')}</span>
            </div>
            {!isCmi && (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="pd-repair">{t('repairType')}</label>
                  <select id="pd-repair" value={d.repair ?? ''} onChange={(e) => set('repair', (e.target.value || null) as Product['repair'])}>
                    <option value="">—</option>
                    <option value="dealer">{t('repairDealer')}</option>
                    <option value="garage">{t('repairGarage')}</option>
                  </select>
                </div>
                {money('deductible', 'deductible')}
                <div className="field"><span className="field-label">{t('ownDamage')}</span>{rule('ownDamage')}</div>
                <div className="field"><span className="field-label">{t('fireTheft')}</span>{rule('fireTheft')}</div>
                {money('tpbiPerson', 'pdTpbiPerson')}
                {money('tpbiAccident', 'pdTpbiAccident')}
                {money('tppd', 'tppd')}
                {money('pa', 'pdPa')}
                {money('medical', 'pdMedical')}
                {money('bail', 'bail')}
              </div>
            )}
            {isCmi && (
              <div className="form-grid">
                {money('tpbiPerson', 'pdTpbiPerson')}
                {money('pa', 'cmiDeath')}
                {money('medical', 'cmiMedical')}
              </div>
            )}
            <div className="field">
              <span className="field-label">{t('pdSecExtras')}</span>
              <div className="pd-chips">
                {EXTRAS.map((x) => {
                  const on = d.extras.includes(x);
                  return (
                    <label key={x} className={`check pd-pick${on ? ' on' : ''}`}>
                      <input type="checkbox" id={`pd-x-${x}`} checked={on} onChange={() => set('extras', on ? d.extras.filter((y) => y !== x) : [...d.extras, x])} />
                      {t(EXTRA_KEY[x])}
                    </label>
                  );
                })}
              </div>
              <span className="hint">{t('pdExtrasHint')}</span>
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecRules')}</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pd-maxAge">{t('pdMaxAge')}</label>
                <NumInput id="pd-maxAge" value={d.maxAge} placeholder={t('pdNoLimit')} onChange={(v) => set('maxAge', v)} />
              </div>
              <div className="field">
                <label htmlFor="pd-ev">{t('pdEv')}</label>
                <select id="pd-ev" value={d.ev} onChange={(e) => set('ev', e.target.value as Product['ev'])}>
                  <option value="allow">{t('pdEvAllow')}</option>
                  <option value="deny">{t('pdEvDeny')}</option>
                  <option value="only">{t('pdEvOnly')}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="pd-evLoading">{t('pdEvLoading')}</label>
                <NumInput id="pd-evLoading" value={d.evLoading} onChange={(v) => set('evLoading', v ?? 0)} />
              </div>
            </div>
            <div className="field">
              <span className="field-label">{t('pdCodes')}</span>
              <div className="pd-row">
                <label className="check"><input type="radio" name="pd-codes" checked={d.codes === 'all'} onChange={() => set('codes', 'all')} />{t('pdAllCodes')}</label>
                <label className="check"><input type="radio" name="pd-codes" checked={d.codes !== 'all'} onChange={() => set('codes', [...CATALOGUE_CODES])} />{t('pdSomeCodes')}</label>
                {d.codes !== 'all' &&
                  CATALOGUE_CODES.map((c) => {
                    const on = (d.codes as UsageCode[]).includes(c);
                    return (
                      <label key={c} className={`check pd-pick${on ? ' on' : ''}`}>
                        <input type="checkbox" id={`pd-code-${c}`} checked={on} onChange={() => set('codes', on ? (d.codes as UsageCode[]).filter((x) => x !== c) : [...(d.codes as UsageCode[]), c])} />
                        <span className="num">{c}</span> {USAGE_LABEL[lang][c]}
                      </label>
                    );
                  })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="pd-exmodel">{t('pdExclude')}</label>
              <div className="pd-row">
                <select id="pd-exmodel" value={exModel} onChange={(e) => setExModel(e.target.value)}>
                  <option value="">{t('pdPickModel')}</option>
                  {MODELS.filter((m) => !d.excludeModels.includes(m.id)).map((m) => (
                    <option key={m.id} value={m.id}>{brandById(m.brandId).name} {m.name}</option>
                  ))}
                </select>
                <button type="button" className="btn small" disabled={!exModel} onClick={() => { set('excludeModels', [...d.excludeModels, exModel]); setExModel(''); }}>{t('pdAdd')}</button>
              </div>
              {d.excludeModels.length > 0 && (
                <div className="pd-chips">
                  {d.excludeModels.map((id) => {
                    const m = modelById(id);
                    return (
                      <span key={id} className="chip">
                        {brandById(m.brandId).name} {m.name}
                        <button type="button" className="link" aria-label={t('pdRemove')} onClick={() => set('excludeModels', d.excludeModels.filter((x) => x !== id))}>✕</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecRates')}</legend>
            <p className="hint">{t('pdRatesHint')}</p>
            <div className="table-wrap">
              <table className="data pd-rates">
                <thead>
                  <tr>
                    <th>{t('pdSiFrom')}</th>
                    <th>{t('pdSiTo')}</th>
                    {CATALOGUE_CODES.map((c) => <th key={c} className="r num">{c}</th>)}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.rates.map((r, i) => {
                    const upd = (patch: Partial<RateRow>) => set('rates', d.rates.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <tr key={i} className={badRows.includes(i) ? 'bad-row' : ''}>
                        <td><NumInput id={`pd-r${i}-from`} label={t('pdSiFrom')} value={r.siFrom} step={10000} onChange={(v) => upd({ siFrom: v ?? 0 })} /></td>
                        <td><NumInput id={`pd-r${i}-to`} label={t('pdSiTo')} value={r.siTo >= SI_TOP ? undefined : r.siTo} placeholder="∞" step={10000} onChange={(v) => upd({ siTo: v ?? SI_TOP })} /></td>
                        {CATALOGUE_CODES.map((c) => (
                          <td key={c} className="r">
                            <NumInput id={`pd-r${i}-${c}`} label={`${c}`} value={r.prices[c]} step={10} placeholder="—" onChange={(v) => {
                              const prices = { ...r.prices };
                              if (v === undefined) delete prices[c];
                              else prices[c] = v;
                              upd({ prices });
                            }} />
                          </td>
                        ))}
                        <td><button type="button" className="btn ghost small" aria-label={t('pdRemove')} onClick={() => set('rates', d.rates.filter((_, j) => j !== i))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {badRows.length > 0 && <p className="error">{t('pdErr_overlap')}</p>}
            <div className="pd-row">
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  const last = [...d.rates].sort((a, b) => b.siFrom - a.siFrom)[0] as RateRow | undefined;
                  const from = last ? (last.siTo >= SI_TOP ? last.siFrom + 100_000 : last.siTo + 1) : 0;
                  set('rates', [...d.rates.map((r) => (r === last && r.siTo >= SI_TOP ? { ...r, siTo: from - 1 } : r)), { siFrom: from, siTo: SI_TOP, prices: { ...(last?.prices ?? {}) } }]);
                }}
              >
                + {t('pdAddBand')}
              </button>
              <span className="pd-try">
                {t('pdTry')}
                <NumInput id="pd-try-si" label={t('pdSiFrom')} value={trySi} step={10000} onChange={(v) => setTrySi(v ?? 0)} />
                <select id="pd-try-code" aria-label={t('pdCodes')} value={tryCode} onChange={(e) => setTryCode(e.target.value as UsageCode)}>
                  {CATALOGUE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                → <b className="num">{tryPrice === undefined ? t('pdNotOffered') : fmtBaht(tryPrice, lang)}</b>
              </span>
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecDocs')}</legend>
            <div className="pd-chips">
              {DOC_KEYS.map((k) => {
                const on = d.docs.includes(k);
                return (
                  <label key={k} className={`check pd-pick${on ? ' on' : ''}`}>
                    <input type="checkbox" id={`pd-doc-${k}`} checked={on} onChange={() => set('docs', on ? d.docs.filter((x) => x !== k) : DOC_KEYS.filter((x) => x === k || d.docs.includes(x)))} />
                    {DOC_LABEL[lang][k]}
                  </label>
                );
              })}
            </div>
            <span className="hint">{t('pdDocsHint')}</span>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecCommission')}</legend>
            <div className="pd-row">
              <label className="check"><input type="radio" name="pd-com" checked={d.commission === undefined} onChange={() => set('commission', undefined)} />{t('pdComStd', { pct: standardCommission(d.type) })}</label>
              <label className="check"><input type="radio" name="pd-com" checked={d.commission !== undefined} onChange={() => set('commission', standardCommission(d.type))} />{t('pdComUseSpecial')}</label>
              {d.commission !== undefined && (
                <span className="pd-pct">
                  <NumInput id="pd-com" label={t('pdSecCommission')} value={d.commission} step={0.5} onChange={(v) => set('commission', v ?? 0)} />%
                </span>
              )}
            </div>
            <p className="hint">{t('pdComHint')}</p>
            <div className="table-wrap">
            <table className="data pd-partner-com">
              <thead>
                <tr>
                  <th>{t('chAgent')}</th>
                  <th className="r">{t('pdComPartner')}</th>
                  <th className="r">{t('pdComApplied')}</th>
                </tr>
              </thead>
              <tbody>
                {s.agents.map((a) => {
                  const own = d.partnerCommission[a.id];
                  const applied = own ?? d.commission ?? standardCommission(d.type);
                  return (
                    <tr key={a.id}>
                      <td><span className="num">{a.code}</span> {a[lang]}</td>
                      <td className="r">
                        <NumInput id={`pd-pc-${a.id}`} label={`${a.code} %`} value={own} step={0.5} placeholder="—" onChange={(v) => {
                          const pc = { ...d.partnerCommission };
                          if (v === undefined) delete pc[a.id];
                          else pc[a.id] = v;
                          set('partnerCommission', pc);
                        }} />
                      </td>
                      <td className="r num">{applied}%{own !== undefined && <span className="mini-badge">{t('pdComOwn')}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </fieldset>

          <fieldset className="card pd-sec">
            <legend>{t('pdSecTerms')}</legend>
            <div className="form-grid">
              <div className="field"><label htmlFor="pd-termsTh">{t('pdTermsTh')}</label><textarea id="pd-termsTh" rows={3} value={d.termsTh} onChange={(e) => set('termsTh', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-termsEn">{t('pdTermsEn')}</label><textarea id="pd-termsEn" rows={3} value={d.termsEn} onChange={(e) => set('termsEn', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-exTh">{t('pdExclTh')}</label><textarea id="pd-exTh" rows={3} value={d.exclusionsTh.join('\n')} onChange={(e) => set('exclusionsTh', e.target.value.split('\n'))} onBlur={() => set('exclusionsTh', lines(d.exclusionsTh.join('\n')))} /></div>
              <div className="field"><label htmlFor="pd-exEn">{t('pdExclEn')}</label><textarea id="pd-exEn" rows={3} value={d.exclusionsEn.join('\n')} onChange={(e) => set('exclusionsEn', e.target.value.split('\n'))} onBlur={() => set('exclusionsEn', lines(d.exclusionsEn.join('\n')))} /></div>
            </div>
            <div className="field">
              <label htmlFor="pd-pdf">{t('pdPdf')}</label>
              <div className="pd-row">
                <input id="pd-pdf" type="file" accept="application/pdf" onChange={(e) => void uploadPdf(e.target.files?.[0])} />
                {d.pdf && (
                  <span className="chip">
                    📄 {d.pdf.name}
                    <button type="button" className="link" aria-label={t('pdRemove')} onClick={() => set('pdf', undefined)}>✕</button>
                  </span>
                )}
              </div>
            </div>
          </fieldset>
        </div>

        <aside className="pd-ed-side">
          <div className="card pd-save">
            <label htmlFor="pd-note">{t('pdNote')}</label>
            <input id="pd-note" value={note} placeholder={t('pdNoteHint')} onChange={(e) => setNote(e.target.value)} />
            {err && <p className="error" role="alert">{err}</p>}
            {saved && !err && <p className="ok-note" role="status">✓ {t('pdSaved', { ver: s.products.find((p) => p.id === d.id)?.ver ?? 1 })}</p>}
            <button type="button" className="btn primary block" onClick={save}>{t('pdSave')}</button>
            <p className="hint">{t('pdSaveHint')}</p>
          </div>
          <div className="card pd-history">
            <h4>{t('pdHistory')}</h4>
            {history.length === 0 ? (
              <p className="muted">{t('pdNoHistory')}</p>
            ) : (
              <ol>
                {history.map((v) => {
                  const current = v.ver === initial.ver && !isNew;
                  return (
                    <li key={v.ver} className={current ? 'current' : ''}>
                      <div className="pd-h-head">
                        <b className="num">v{v.ver}</b>
                        <span className="muted">{fmtDateTime(v.at, lang)} · {staffName(v.by, lang)}</span>
                      </div>
                      <div className="hint">
                        {v.note === 'init'
                          ? t('pdChInit')
                          : v.note.startsWith('rollback:')
                            ? t('pdChRollback', { ver: v.note.split(':')[1] })
                            : v.note === 'import'
                              ? t('pdChImport')
                              : v.note === 'toggle'
                                ? t('pdChToggle')
                                : v.note}
                      </div>
                      {v.changes.length > 0 && v.note !== 'init' && <div className="hint">{[...new Set(v.changes.map((c) => t(FIELD_KEY[c] ?? 'pdSecMarketing')))].join(' · ')}</div>}
                      {current ? (
                        <span className="chip tone-good">{t('pdCurrent')}</span>
                      ) : (
                        <button type="button" className="btn ghost small" onClick={() => { if (window.confirm(t('pdRollbackAsk', { ver: v.ver }))) { rollbackProduct(v.id, v.ver, staffId); setD(structuredClone(v.snapshot)); setSaved(false); } }}>
                          ↺ {t('pdRollback')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="hint">{t('pdHistoryHint')}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
