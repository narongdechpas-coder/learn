import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoverageType, DocKey, Product, ProductExtra, RateRow, UsageCode } from '../types';
import { COVERAGE_TYPES } from '../data/packages';
import { EXTRAS, SI_TOP, blankProduct, isExpired, priceRange, standardCommission, standardCover } from '../data/products';
import { CATALOGUE_CODES, MODELS, STAFF, brandById, modelById } from '../data/vehicles';
import { COVERAGE_LABEL, DOC_LABEL, USAGE_LABEL, fmtBaht, fmtDate, fmtDateTime, useT, type TKey } from '../i18n';
import { productChanges, rollbackProduct, saveProduct, saveProducts, useStore } from '../store';
import { productStats } from '../lib/productStats';
import { planImport, productsToSheets, type ImportItem } from '../lib/productSheets';
import { readXlsx, writeXlsx } from '../lib/xlsx';
import { putFile } from '../files';
import { NumberInput, TypeTag, DateInput } from './common';

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

type ListStatus = 'all' | 'onSale' | 'closed' | 'ending' | 'ended' | 'special';
const LIST_STATUSES: ListStatus[] = ['all', 'onSale', 'closed', 'ending', 'ended', 'special'];
const STATUS_KEY: Record<ListStatus, TKey> = { all: 'pdStatAll', onSale: 'pdStatOnSale', closed: 'pdStatClosed', ending: 'pdStatEnding', ended: 'pdStatEnded', special: 'pdStatSpecial' };
function matchStatus(p: Product, k: ListStatus, now: number) {
  const ended = isExpired(p, now);
  const open = p.channels.self || p.channels.partner;
  switch (k) {
    case 'onSale':
      return open && !ended;
    case 'closed':
      return !open;
    case 'ending':
      return !ended && !!p.saleUntil && new Date(`${p.saleUntil}T23:59:59+07:00`).getTime() - now <= 30 * 86_400_000;
    case 'ended':
      return ended;
    case 'special':
      return p.commission !== undefined || Object.keys(p.partnerCommission).length > 0;
    default:
      return true;
  }
}

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
  const [status, setStatus] = useState<ListStatus>('all');
  const now = Date.now();
  const live = s.products.filter((p) => !p.archived);
  const counts = Object.fromEntries(LIST_STATUSES.map((k) => [k, live.filter((p) => matchStatus(p, k, now)).length])) as Record<ListStatus, number>;
  const list = live.filter((p) => (type === 'all' || p.type === type) && matchStatus(p, status, now));

  if (editing) {
    const p = s.products.find((x) => x.id === editing.p.id);
    return <ProductEditor key={editing.p.id} initial={editing.isNew ? editing.p : (p ?? editing.p)} isNew={editing.isNew && !p} staffId={staffId} onClose={() => setEditing(null)} />;
  }

  const exportFile = () => {
    const blob = writeXlsx(productsToSheets(s.products));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jacky-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      <div className="pd-list-head">
        <div>
          <h2>{t('tabProducts')}</h2>
          <p className="hint">{t('pdLead')}</p>
        </div>
        <div className="pd-tools">
          <button type="button" className="btn small" onClick={exportFile}>⬇ {t('pdExport')}</button>
          <button type="button" className="btn small" onClick={() => fileRef.current?.click()}>⬆ {t('pdImport')}</button>
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
      <div className="pd-stats" role="radiogroup" aria-label={t('filterStatus')}>
        {LIST_STATUSES.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={status === k} className={`pd-stat${counts[k] ? ` pd-stat-${k}` : ''}${status === k ? ' on' : ''}`} onClick={() => setStatus(k)}>
            <b className="num">{counts[k]}</b>
            <span>{t(STATUS_KEY[k])}</span>
          </button>
        ))}
      </div>
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
              <th className="c">{t('pdChSelf')}</th>
              <th className="c">{t('pdChPartner')}</th>
              <th className="r">{t('pdPrice')}</th>
              <th className="gap">{t('pdSaleUntil')}</th>
              <th>{t('pdSecCommission')}</th>
              <th className="r">{t('pdSold')}</th>
              <th className="r">{t('pdConv')}</th>
              <th className="gap">{t('pdVersion')}</th>
              <th><span className="sr-only">{t('pdEdit')}</span></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={10} className="muted">{t('pdNoMatch')}</td></tr>
            )}
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
                    <td key={ch} className="c">
                      <label className="switch">
                        <input type="checkbox" id={`pd-${ch}-${p.id}`} checked={p.channels[ch]} onChange={() => toggle(p, ch)} />
                        <span className="switch-track" aria-hidden="true" />
                        <span className="sr-only">{t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')} {productName(p, lang)}</span>
                      </label>
                    </td>
                  ))}
                  <td className="r num">{range ? (range[0] === range[1] ? fmtBaht(range[0], lang) : `${fmtBaht(range[0], lang)} – ${fmtBaht(range[1], lang)}`) : '—'}</td>
                  <td className="gap">
                    {p.saleUntil ? (
                      <>
                        <span className="num">{fmtDate(new Date(`${p.saleUntil}T12:00:00+07:00`).getTime(), lang, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {expired && <div><span className="chip tone-bad">{t('pdExpired')}</span></div>}
                      </>
                    ) : (
                      <span className="muted">{t('pdNoEnd')}</span>
                    )}
                  </td>
                  <td>
                    {p.commission === undefined ? <span className="muted">{t('pdComStd', { pct: standardCommission(p.type) })}</span> : <b>{t('pdComSpecial', { pct: p.commission })}</b>}
                    {nPartner > 0 && <div className="hint">{t('pdComPartners', { n: nPartner })}</div>}
                  </td>
                  <td className="r num">
                    {st?.policies ?? 0}
                    <div className="hint">{fmtBaht(Math.round(st?.gwp ?? 0), lang)}</div>
                  </td>
                  <td className="r num">{st && st.offered ? `${Math.round((st.won / st.offered) * 100)}%` : '—'}</td>
                  <td className="gap num">v{p.ver}<div className="hint">{fmtDateTime(p.updatedAt, lang)}</div></td>
                  <td>
                    <div className="pd-row-actions">
                    <button type="button" className="btn small" onClick={() => setEditing({ p, isNew: false })}>{t('pdEdit')}</button>
                    <button
                      type="button"
                      className="btn small"
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

function NumInput({ id, value, onChange, placeholder, label }: { id: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; placeholder?: string; label?: string }) {
  return <NumberInput id={id} aria-label={label} placeholder={placeholder} value={value} onChange={onChange} />;
}


type EdTab = 'general' | 'cover' | 'price' | 'sale';
const ED_TABS: [EdTab, TKey][] = [
  ['general', 'pdTabGeneral'],
  ['cover', 'pdTabCover'],
  ['price', 'pdTabPrice'],
  ['sale', 'pdTabSale'],
];
/** Which tab each product field is edited on (for the unsaved-changes dots and the save summary). */
const TAB_OF: Partial<Record<keyof Product, EdTab>> = {
  nameTh: 'general', nameEn: 'general', tagTh: 'general', tagEn: 'general', highlightsTh: 'general', highlightsEn: 'general', badge: 'general',
  repair: 'cover', deductible: 'cover', ownDamage: 'cover', fireTheft: 'cover', tpbiPerson: 'cover', tpbiAccident: 'cover', tppd: 'cover',
  pa: 'cover', paPassenger: 'cover', tempDriver: 'cover', tempPassenger: 'cover', medical: 'cover', bail: 'cover', passengers: 'cover',
  extras: 'cover', maxAge: 'cover', codes: 'cover', ev: 'cover', evLoading: 'cover', excludeModels: 'cover',
  rates: 'price', commission: 'price', partnerCommission: 'price',
  channels: 'sale', partners: 'sale', saleUntil: 'sale', docs: 'sale', termsTh: 'sale', termsEn: 'sale', exclusionsTh: 'sale', exclusionsEn: 'sale', pdf: 'sale',
};

/** Price cells, bands added and removed between two rate tables. */
function rateDelta(a: RateRow[], b: RateRow[]) {
  const key = (r: RateRow) => `${r.siFrom}-${r.siTo}`;
  const am = new Map(a.map((r) => [key(r), r]));
  const bm = new Map(b.map((r) => [key(r), r]));
  let cells = 0;
  for (const [k, r] of bm) {
    const o = am.get(k);
    if (o) for (const c of CATALOGUE_CODES) if (o.prices[c] !== r.prices[c]) cells++;
  }
  return { cells, added: [...bm.keys()].filter((k) => !am.has(k)).length, removed: [...am.keys()].filter((k) => !bm.has(k)).length };
}

/** Fields each "fill in standard" button sets, by section. */
const STD_PARTS = {
  car: ['repair', 'deductible', 'ownDamage', 'fireTheft'],
  tp: ['tpbiPerson', 'tpbiAccident', 'tppd'],
  riders: ['pa', 'paPassenger', 'tempDriver', 'tempPassenger', 'medical', 'bail', 'passengers'],
  cmi: ['tpbiPerson', 'pa', 'medical'],
  extras: ['extras'],
  docs: ['docs'],
} satisfies Record<string, (keyof Product)[]>;
type StdPart = keyof typeof STD_PARTS;

function Section({ title, hint, children, id, action }: { title: string; hint?: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) {
  const hid = `${id ?? title}-h`;
  return (
    <section className="card pd-sec" aria-labelledby={hid}>
      <div className="pd-sec-head">
        <div>
          <h4 id={hid}>{title}</h4>
          {hint && <p className="hint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProductEditor({ initial, isNew, staffId, onClose }: { initial: Product; isNew: boolean; staffId: string; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [d, setD] = useState<Product>(() => structuredClone(initial));
  const [base, setBase] = useState<Product>(() => structuredClone(initial));
  const [tab, setTab] = useState<EdTab>('general');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [stdDone, setStdDone] = useState<Set<string>>(() => new Set());
  const [exModel, setExModel] = useState('');
  const [tryCode, setTryCode] = useState<UsageCode>('110');
  const [trySi, setTrySi] = useState(500_000);
  const [findSi, setFindSi] = useState<number | undefined>();
  const frameRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setD((x) => ({ ...x, [k]: v }));
  const history = s.productLog.filter((v) => v.id === d.id);
  const saved = s.products.find((p) => p.id === d.id);
  const badRows = rateIssues(d.rates);
  const isCmi = d.type === 'CMI';

  const changes = isNew && !saved ? ['created'] : productChanges(base, d);
  const dirty = changes.length > 0;
  const dirtyTabs = new Set(changes.map((c) => TAB_OF[c as keyof Product]).filter(Boolean));
  const errors: { tab: EdTab; text: string }[] = [
    ...(!d.nameTh.trim() ? [{ tab: 'general' as EdTab, text: t('pdErr_noName') }] : []),
    ...(!d.rates.length ? [{ tab: 'price' as EdTab, text: t('pdErr_noRates') }] : []),
    ...(badRows.length ? [{ tab: 'price' as EdTab, text: t('pdErr_overlap') }] : []),
  ];
  const errTabs = new Set(errors.map((e) => e.tab));

  // Warn before the tab or window closes with edits not saved.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const leave = () => {
    if (dirty && !window.confirm(t('pdLeaveAsk'))) return;
    onClose();
  };
  const applyStandard = () => {
    setD((x) => ({ ...x, ...standardCover(x.type), passengers: undefined }));
    setStdDone(new Set(['all', ...Object.keys(STD_PARTS)]));
  };
  // Fill one section with the class standard; everything stays editable afterwards.
  const stdBtn = (part: StdPart, title: string) => (
    <div className="pd-sec-std">
      {stdDone.has(part) && <span className="hint" role="status">✓ {t('pdStdPartDone')}</span>}
      <button
        type="button"
        className="btn small"
        aria-label={`${t('pdStdPart')} · ${title}`}
        onClick={() => {
          const std = standardCover(d.type);
          setD((x) => ({ ...x, ...Object.fromEntries(STD_PARTS[part].map((k) => [k, k === 'passengers' ? undefined : std[k as keyof typeof std]])) }));
          setStdDone((x) => new Set(x).add(part));
        }}
      >
        ★ {t('pdStdPart')}
      </button>
    </div>
  );
  const doSave = () => {
    const ok = saveProduct({ ...d, rates: [...d.rates].sort((a, b) => a.siFrom - b.siFrom) }, staffId, note.trim());
    setConfirm(false);
    if (!ok) return setFlash(t('pdNoChange'));
    const now = structuredClone({ ...d, rates: [...d.rates].sort((a, b) => a.siFrom - b.siFrom) });
    setBase(now);
    setD(now);
    setNote('');
    setFlash(t('pdSaved', { ver: (saved?.ver ?? 0) + 1 }));
  };
  const uploadPdf = async (f?: File) => {
    if (!f) return;
    const key = `product-pdf-${d.id}-${Date.now()}`;
    await putFile(key, f);
    set('pdf', { name: f.name, key });
  };
  const goToSi = () => {
    if (findSi === undefined) return;
    const i = d.rates.findIndex((r) => findSi >= r.siFrom && findSi <= r.siTo);
    const row = i >= 0 ? frameRef.current?.querySelector<HTMLElement>(`tr[data-row="${i}"]`) : null;
    if (!row || !frameRef.current) return;
    frameRef.current.scrollTop = row.offsetTop - 40;
    row.classList.add('found');
    setTimeout(() => row.classList.remove('found'), 1600);
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
        {r.mode === 'fixed' && <NumInput id={`pd-${k}-val`} label={t('pdAmount')} value={r.value} onChange={(v) => set(k, { ...r, value: v ?? 0 })} />}
        {r.mode === 'pct' && (
          <div className="pd-rule-pct">
            <NumInput id={`pd-${k}-pct`} label="%" value={r.value} onChange={(v) => set(k, { ...r, value: v ?? 0 })} />
            <span className="muted">% · {t('pdCap')}</span>
            <NumInput id={`pd-${k}-cap`} label={t('pdCap')} value={r.cap} onChange={(v) => set(k, { ...r, cap: v })} />
          </div>
        )}
      </div>
    );
  };
  type MoneyKey = 'tpbiPerson' | 'tpbiAccident' | 'tppd' | 'pa' | 'paPassenger' | 'tempDriver' | 'tempPassenger' | 'medical' | 'bail' | 'deductible';
  const money = (k: MoneyKey, label: string, sub?: string) => (
    <div className="field">
      <label htmlFor={`pd-${k}`}>{label}{sub && <small>{sub}</small>}</label>
      <NumInput id={`pd-${k}`} value={d[k]} onChange={(v) => set(k, v ?? 0)} />
    </div>
  );
  const tryRow = d.rates.find((r) => trySi >= r.siFrom && trySi <= r.siTo);
  const tryPrice = tryRow?.prices[tryCode];

  // What saving will change, in plain words, for the confirmation step.
  const summary: string[] = [];
  if (!isNew || saved) {
    (['self', 'partner'] as const).forEach((ch) => {
      if (base.channels[ch] !== d.channels[ch]) summary.push(t('pdSumChannel', { ch: t(ch === 'self' ? 'pdChSelf' : 'pdChPartner'), v: t(d.channels[ch] ? 'pdOpen' : 'pdClosed') }));
    });
    if (base.saleUntil !== d.saleUntil) summary.push(t('pdSumUntil', { from: base.saleUntil ?? t('pdNoEnd'), to: d.saleUntil ?? t('pdNoEnd') }));
    const rd = rateDelta(base.rates, d.rates);
    if (rd.cells || rd.added || rd.removed) summary.push(t('pdImpRates', { add: rd.added, del: rd.removed, chg: rd.cells }));
    if (base.commission !== d.commission) summary.push(t('pdSumCom', { from: base.commission ?? standardCommission(d.type), to: d.commission ?? standardCommission(d.type) }));
    const pcChanged = new Set([...Object.keys(base.partnerCommission), ...Object.keys(d.partnerCommission)].filter((a) => base.partnerCommission[a] !== d.partnerCommission[a])).size;
    if (pcChanged) summary.push(t('pdSumPartnerCom', { n: pcChanged }));
    const others = [...new Set(changes.filter((c) => !['channels', 'saleUntil', 'rates', 'commission', 'partnerCommission'].includes(c)).map((c) => t(FIELD_KEY[c] ?? 'pdSecMarketing')))];
    if (others.length) summary.push(t('pdSumOther', { list: others.join(', ') }));
  }

  return (
    <section className="pd-editor">
      <div className="pd-ed-head">
        <button type="button" className="btn ghost small" onClick={leave}>← {t('pdBack')}</button>
        <div className="pd-ed-title">
          <h3>
            <TypeTag type={d.type} /> {isNew && !saved ? t('pdNewTitle') : productName(d, lang)}
          </h3>
          <p className="hint num">{d.id}{saved && ` · v${saved.ver} · ${t('pdUpdated', { at: fmtDateTime(saved.updatedAt, lang), by: staffName(saved.updatedBy, lang) })}`}</p>
        </div>
        <button type="button" className="btn small pd-hist-btn" onClick={() => setShowHistory(true)} disabled={!history.length}>🕘 {t('pdHistory')} ({history.length})</button>
      </div>

      <div className="subtabs pd-tabs" role="tablist" aria-label={t('pdTabsLabel')}>
        {ED_TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`pd-tab-${k}`} aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {t(label)}
            {errTabs.has(k) ? <span className="pd-tab-dot bad" title={t('pdTabError')} aria-label={t('pdTabError')} /> : dirtyTabs.has(k) ? <span className="pd-tab-dot" title={t('pdTabDirty')} aria-label={t('pdTabDirty')} /> : null}
          </button>
        ))}
      </div>

      <div className="pd-tab-body" role="tabpanel" aria-labelledby={`pd-tab-${tab}`}>
        {tab === 'general' && (
          <Section title={t('pdSecMarketing')} hint={t('pdSecMarketingHint')}>
            <div className="form-grid pair">
              <div className="field"><label htmlFor="pd-nameTh">{t('pdNameTh')} *</label><input id="pd-nameTh" value={d.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-nameEn">{t('pdNameEn')}</label><input id="pd-nameEn" value={d.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-tagTh">{t('pdTagTh')}</label><input id="pd-tagTh" value={d.tagTh} onChange={(e) => set('tagTh', e.target.value)} /></div>
              <div className="field"><label htmlFor="pd-tagEn">{t('pdTagEn')}</label><input id="pd-tagEn" value={d.tagEn} onChange={(e) => set('tagEn', e.target.value)} /></div>
              <div className="field top"><label htmlFor="pd-hlTh">{t('pdHlTh')}</label><textarea id="pd-hlTh" rows={3} value={d.highlightsTh.join('\n')} onChange={(e) => set('highlightsTh', e.target.value.split('\n'))} onBlur={() => set('highlightsTh', lines(d.highlightsTh.join('\n')))} /></div>
              <div className="field top"><label htmlFor="pd-hlEn">{t('pdHlEn')}</label><textarea id="pd-hlEn" rows={3} value={d.highlightsEn.join('\n')} onChange={(e) => set('highlightsEn', e.target.value.split('\n'))} onBlur={() => set('highlightsEn', lines(d.highlightsEn.join('\n')))} /></div>
              <div className="field">
                <label htmlFor="pd-badge">{t('pdBadge')}</label>
                <select id="pd-badge" value={d.badge ?? ''} onChange={(e) => set('badge', (e.target.value || undefined) as Product['badge'])}>
                  <option value="">{t('none')}</option>
                  <option value="recommended">{t('pdBadgeRec')}</option>
                  <option value="new">{t('pdBadgeNew')}</option>
                </select>
              </div>
            </div>
          </Section>
        )}

        {tab === 'cover' && (
          <>
            <div className="pd-std">
              <button type="button" className="btn small" onClick={applyStandard}>★ {t('pdStdBtn', { type: COVERAGE_LABEL[lang][d.type] })}</button>
              <span className="hint">{stdDone.has('all') ? `✓ ${t('pdStdDone')}` : t('pdStdHint')}</span>
            </div>
            {!isCmi ? (
              <>
                <Section title={t('pdSubCar')} hint={t('pdSubCarHint')} action={stdBtn('car', t('pdSubCar'))}>
                  <div className="form-grid pair">
                    <div className="field">
                      <label htmlFor="pd-repair">{t('repairType')}</label>
                      <select id="pd-repair" value={d.repair ?? ''} onChange={(e) => set('repair', (e.target.value || null) as Product['repair'])}>
                        <option value="">—</option>
                        <option value="dealer">{t('repairDealer')}</option>
                        <option value="garage">{t('repairGarage')}</option>
                      </select>
                    </div>
                    {money('deductible', t('deductible'))}
                    <div className="field"><span className="field-label">{t('ownDamage')}</span>{rule('ownDamage')}</div>
                    <div className="field"><span className="field-label">{t('fireTheft')}</span>{rule('fireTheft')}</div>
                  </div>
                </Section>

                <Section title={t('pdSubTp')} hint={t('pdSubTpHint')} action={stdBtn('tp', t('pdSubTp'))}>
                  <div className="form-grid pair">
                    {money('tpbiPerson', t('pdTpbiPerson'))}
                    {money('tpbiAccident', t('pdTpbiAccident'))}
                    {money('tppd', t('tppd'))}
                  </div>
                </Section>

                <Section title={t('pdSubRiders')} hint={t('pdSubRidersHint')} action={stdBtn('riders', t('pdSubRiders'))}>
                  <div className="form-grid pair">
                    {money('pa', t('rdRy01Short'), t('rdDriver'))}
                    {money('paPassenger', t('rdRy01Short'), t('rdPassenger'))}
                    {money('tempDriver', t('rdRy01Temp'), `${t('rdDriver')} · ${t('rdTempHint')}`)}
                    {money('tempPassenger', t('rdRy01Temp'), `${t('rdPassenger')} · ${t('rdTempHint')}`)}
                    {money('medical', t('rdRy02'), t('pdPerPersonAll'))}
                    {money('bail', t('rdRy03'), t('pdPerCase'))}
                    <div className="field">
                      <label htmlFor="pd-passengers">{t('rdPassengers')}<small>{t('rdPassengersHint')}</small></label>
                      <NumInput id="pd-passengers" value={d.passengers} placeholder={t('pdByCode')} onChange={(v) => set('passengers', v)} />
                    </div>
                  </div>
                </Section>
              </>
            ) : (
              <Section title={t('pdSecCover')} hint={t('pdSecCoverHint')} action={stdBtn('cmi', t('pdSecCover'))}>
                <div className="form-grid pair">
                  {money('tpbiPerson', t('pdTpbiPerson'))}
                  {money('pa', t('cmiDeath'))}
                  {money('medical', t('cmiMedical'))}
                </div>
              </Section>
            )}

            <Section title={t('pdSecExtras')} hint={t('pdExtrasHint')} action={stdBtn('extras', t('pdSecExtras'))}>
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
            </Section>

            <Section title={t('pdSecRules')} hint={t('pdSecRulesHint')}>
              <div className="form-grid pair">
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
              <div className="field wide">
                <span className="field-label">{t('pdCodes')}</span>
                <div className="pd-row">
                  <label className="check"><input type="radio" name="pd-codes" checked={d.codes === 'all'} onChange={() => set('codes', 'all')} />{t('pdAllCodes')}</label>
                  <label className="check"><input type="radio" name="pd-codes" checked={d.codes !== 'all'} onChange={() => set('codes', [...CATALOGUE_CODES])} />{t('pdSomeCodes')}</label>
                </div>
                {d.codes !== 'all' && (
                  <div className="pd-chips">
                    {CATALOGUE_CODES.map((c) => {
                      const on = (d.codes as UsageCode[]).includes(c);
                      return (
                        <label key={c} className={`check pd-pick${on ? ' on' : ''}`}>
                          <input type="checkbox" id={`pd-code-${c}`} checked={on} onChange={() => set('codes', on ? (d.codes as UsageCode[]).filter((x) => x !== c) : [...(d.codes as UsageCode[]), c])} />
                          <span className="num">{c}</span> {USAGE_LABEL[lang][c]}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="field wide">
                <label htmlFor="pd-exmodel">{t('pdExclude')}</label>
                <div className="pd-inline">
                  <select id="pd-exmodel" value={exModel} onChange={(e) => setExModel(e.target.value)}>
                    <option value="">{t('pdPickModel')}</option>
                    {MODELS.filter((m) => !d.excludeModels.includes(m.id)).map((m) => (
                      <option key={m.id} value={m.id}>{brandById(m.brandId).name} {m.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn" disabled={!exModel} onClick={() => { set('excludeModels', [...d.excludeModels, exModel]); setExModel(''); }}>{t('pdAdd')}</button>
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
            </Section>
          </>
        )}

        {tab === 'price' && (
          <>
            <Section title={t('pdSecRates')} hint={t('pdRatesHint')}>
              <div className="pd-rates-tools">
                <span className="pd-inline">
                  <NumInput id="pd-find-si" label={t('pdFindSi')} value={findSi} placeholder={t('pdFindSi')} onChange={setFindSi} />
                  <button type="button" className="btn small" onClick={goToSi}>{t('pdFind')}</button>
                </span>
                <span className="muted">{t('pdBands', { n: d.rates.length })}</span>
              </div>
              <div className="pd-rates-frame" ref={frameRef}>
                <table className="data pd-rates">
                  <thead>
                    <tr>
                      <th>{t('pdSiFrom')}</th>
                      <th>{t('pdSiTo')}</th>
                      {CATALOGUE_CODES.map((c) => <th key={c} className="r num">{c}</th>)}
                      <th><span className="sr-only">{t('pdRemove')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rates.map((r, i) => {
                      const upd = (patch: Partial<RateRow>) => set('rates', d.rates.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                      return (
                        <tr key={i} data-row={i} className={badRows.includes(i) ? 'bad-row' : ''}>
                          <td><NumInput id={`pd-r${i}-from`} label={t('pdSiFrom')} value={r.siFrom} onChange={(v) => upd({ siFrom: v ?? 0 })} /></td>
                          <td><NumInput id={`pd-r${i}-to`} label={t('pdSiTo')} value={r.siTo >= SI_TOP ? undefined : r.siTo} placeholder="∞" onChange={(v) => upd({ siTo: v ?? SI_TOP })} /></td>
                          {CATALOGUE_CODES.map((c) => (
                            <td key={c} className="r">
                              <NumInput id={`pd-r${i}-${c}`} label={`${c}`} value={r.prices[c]} placeholder="—" onChange={(v) => {
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
              <div className="pd-rates-tools">
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
                  <NumInput id="pd-try-si" label={t('pdSiFrom')} value={trySi} onChange={(v) => setTrySi(v ?? 0)} />
                  <select id="pd-try-code" aria-label={t('pdCodes')} value={tryCode} onChange={(e) => setTryCode(e.target.value as UsageCode)}>
                    {CATALOGUE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  → <b className="num">{tryPrice === undefined ? t('pdNotOffered') : fmtBaht(tryPrice, lang)}</b>
                </span>
              </div>
            </Section>

            <Section title={t('pdSecCommission')} hint={t('pdComHint')}>
              <div className="pd-row">
                <label className="check"><input type="radio" name="pd-com" checked={d.commission === undefined} onChange={() => set('commission', undefined)} />{t('pdComStd', { pct: standardCommission(d.type) })}</label>
                <label className="check"><input type="radio" name="pd-com" checked={d.commission !== undefined} onChange={() => set('commission', standardCommission(d.type))} />{t('pdComUseSpecial')}</label>
                {d.commission !== undefined && (
                  <span className="pd-pct">
                    <NumInput id="pd-com" label={t('pdSecCommission')} value={d.commission} onChange={(v) => set('commission', v ?? 0)} />%
                  </span>
                )}
              </div>
              <div className="table-wrap">
                <table className="data pd-partner-com">
                  <thead>
                    <tr>
                      <th>{t('pdPartnerCol')}</th>
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
                            <NumInput id={`pd-pc-${a.id}`} label={`${a.code} %`} value={own} placeholder="—" onChange={(v) => {
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
            </Section>
          </>
        )}

        {tab === 'sale' && (
          <>
            <Section title={t('pdSecSale')} hint={t('pdSecSaleHint')}>
              <div className="field">
              <span className="field-label">{t('pdOnSaleTo')}</span>
              <div className="pd-row">
                {(['self', 'partner'] as const).map((ch) => (
                  <label key={ch} className="switch">
                    <input type="checkbox" id={`pd-ed-${ch}`} checked={d.channels[ch]} onChange={() => set('channels', { ...d.channels, [ch]: !d.channels[ch] })} />
                    <span className="switch-track" aria-hidden="true" />
                    {t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')}
                  </label>
                ))}
              </div>
              </div>
              <div className="form-grid pair">
                <div className="field">
                  <span className="field-label">{t('pdWhoSells')}</span>
                  <div className="pd-row">
                    <label className="check"><input type="radio" name="pd-partners" checked={d.partners === 'all'} onChange={() => set('partners', 'all')} />{t('pdAllPartners')}</label>
                    <label className="check"><input type="radio" name="pd-partners" checked={d.partners !== 'all'} onChange={() => set('partners', [])} />{t('pdSomePartners')}</label>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="pd-until">{t('pdSaleUntil')}</label>
                  <div className="pd-inline">
                    <DateInput id="pd-until" value={d.saleUntil ?? ''} onChange={(v) => set('saleUntil', v || undefined)} />
                    <button type="button" className="btn" disabled={!d.saleUntil} onClick={() => set('saleUntil', undefined)}>{t('pdNoEnd')}</button>
                  </div>
                  <span className="hint">{t('pdSaleUntilHint')}</span>
                </div>
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
            </Section>

            <Section title={t('pdSecDocs')} hint={t('pdDocsHint')} action={stdBtn('docs', t('pdSecDocs'))}>
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
            </Section>

            <Section title={t('pdSecTerms')} hint={t('pdSecTermsHint')}>
              <div className="form-grid pair">
                <div className="field top"><label htmlFor="pd-termsTh">{t('pdTermsTh')}</label><textarea id="pd-termsTh" rows={3} value={d.termsTh} onChange={(e) => set('termsTh', e.target.value)} /></div>
                <div className="field top"><label htmlFor="pd-termsEn">{t('pdTermsEn')}</label><textarea id="pd-termsEn" rows={3} value={d.termsEn} onChange={(e) => set('termsEn', e.target.value)} /></div>
                <div className="field top"><label htmlFor="pd-exTh">{t('pdExclTh')}</label><textarea id="pd-exTh" rows={3} value={d.exclusionsTh.join('\n')} onChange={(e) => set('exclusionsTh', e.target.value.split('\n'))} onBlur={() => set('exclusionsTh', lines(d.exclusionsTh.join('\n')))} /></div>
                <div className="field top"><label htmlFor="pd-exEn">{t('pdExclEn')}</label><textarea id="pd-exEn" rows={3} value={d.exclusionsEn.join('\n')} onChange={(e) => set('exclusionsEn', e.target.value.split('\n'))} onBlur={() => set('exclusionsEn', lines(d.exclusionsEn.join('\n')))} /></div>
              </div>
              <div className="field wide">
                <span className="field-label">{t('pdPdf')}</span>
                <div className="pd-inline">
                  <label className="btn" htmlFor="pd-pdf">📄 {t(d.pdf ? 'pdPdfReplace' : 'pdPdfPick')}</label>
                  <input id="pd-pdf" type="file" accept="application/pdf" className="sr-only" onChange={(e) => void uploadPdf(e.target.files?.[0])} />
                  {d.pdf ? (
                    <span className="chip">
                      {d.pdf.name}
                      <button type="button" className="link" aria-label={t('pdRemove')} onClick={() => set('pdf', undefined)}>✕</button>
                    </span>
                  ) : (
                    <span className="muted">{t('pdPdfNone')}</span>
                  )}
                </div>
              </div>
            </Section>
          </>
        )}
      </div>

      <div className={`pd-savebar${dirty ? ' dirty' : ''}`} role="region" aria-label={t('pdSave')}>
        <div className="pd-save-status" aria-live="polite">
          {dirty ? (
            <>
              <b>● {t('pdUnsaved', { n: dirtyTabs.size || 1 })}</b>
              <span className="hint">{ED_TABS.filter(([k]) => dirtyTabs.has(k)).map(([, l]) => t(l)).join(' · ')}</span>
            </>
          ) : (
            <span className="muted">{flash ?? (saved ? t('pdAllSaved', { ver: saved.ver }) : t('pdNotSavedYet'))}</span>
          )}
        </div>
        <input id="pd-note" value={note} placeholder={t('pdNoteHint')} aria-label={t('pdNote')} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn ghost" disabled={!dirty} onClick={() => { setD(structuredClone(base)); setFlash(null); }}>{t('pdDiscard')}</button>
        <button type="button" className="btn primary" disabled={!dirty} onClick={() => setConfirm(true)}>{t('pdSave')}</button>
      </div>

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(false)}>
          <div className="modal pd-confirm" role="dialog" aria-modal="true" aria-label={t('pdConfirmTitle')} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('pdConfirmTitle')}</h3>
              <button type="button" className="btn ghost small" onClick={() => setConfirm(false)}>{t('close')} ✕</button>
            </div>
            {errors.length > 0 ? (
              <>
                <p className="error" role="alert">{t('pdFixFirst')}</p>
                <ul className="pd-confirm-list bad">
                  {errors.map((e) => (
                    <li key={e.text}>
                      {e.text} · <button type="button" className="link" onClick={() => { setTab(e.tab); setConfirm(false); }}>{t('pdGoTo', { tab: t(ED_TABS.find(([k]) => k === e.tab)![1]) })}</button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p>{isNew && !saved ? t('pdConfirmNew') : t('pdConfirmLead', { ver: (saved?.ver ?? 0) + 1 })}</p>
                {summary.length > 0 && (
                  <ul className="pd-confirm-list">
                    {summary.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                )}
                <p className="hint">{t('pdSaveHint')}</p>
                <div className="field">
                  <label htmlFor="pd-note-confirm">{t('pdNote')}</label>
                  <input id="pd-note-confirm" value={note} placeholder={t('pdNoteHint')} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="pd-import-foot">
                  <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>{t('cancel')}</button>
                  <button type="button" className="btn primary" onClick={doSave}>{t('pdConfirmSave', { ver: (saved?.ver ?? 0) + 1 })}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <aside className="modal pd-history-drawer" role="dialog" aria-modal="true" aria-label={t('pdHistory')} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('pdHistory')}</h3>
              <button type="button" className="btn ghost small" onClick={() => setShowHistory(false)}>{t('close')} ✕</button>
            </div>
            <p className="hint">{t('pdHistoryHint')}</p>
            <ol className="pd-history">
              {history.map((v) => {
                const current = v.ver === saved?.ver;
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
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => {
                          if (dirty && !window.confirm(t('pdLeaveAsk'))) return;
                          if (!window.confirm(t('pdRollbackAsk', { ver: v.ver }))) return;
                          rollbackProduct(v.id, v.ver, staffId);
                          const snap = structuredClone(v.snapshot);
                          setD(snap);
                          setBase(snap);
                          setFlash(t('pdChRollback', { ver: v.ver }));
                        }}
                      >
                        ↺ {t('pdRollback')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      )}
    </section>
  );
}
