import { useEffect, useState } from 'react';
import type { CoverRule, CoverageType, Product } from '../types';
import { COVERAGE_TYPES } from '../data/packages';
import { commissionFor, onSale, priceRange } from '../data/products';
import { brandById, modelById } from '../data/vehicles';
import { COVERAGE_LABEL, DOC_LABEL, fmtBaht, fmtDate, useT } from '../i18n';
import { useStore } from '../store';
import { getFile } from '../files';
import { TypeTag } from './common';
import { EXTRA_KEY, productName } from './Products';
import { riderRows } from './riders';
import { travelCommission, travelOnSale, travelPriceRange } from '../data/travel';
import { paCommission, paOnSale, paPriceRange } from '../data/pa';

const pick = (p: Product, lang: 'th' | 'en', th: keyof Product, en: keyof Product) => ((lang === 'en' && (p[en] as string)) || (p[th] as string) || '') as string;
const pickList = (p: Product, lang: 'th' | 'en', th: 'highlightsTh' | 'exclusionsTh', en: 'highlightsEn' | 'exclusionsEn') => (lang === 'en' && p[en].length ? p[en] : p[th]);

/**
 * Products on sale, for customers (website) or a Business Partner (only what they may sell, with
 * their commission). "Check your price" leads into the usual car → package flow.
 */
export function ProductCatalog({ channel, agentId, onCheck }: { channel: 'self' | 'partner'; agentId?: string; onCheck: (type: CoverageType, productId?: string) => void }) {
  const travel = useStore().travelProducts.filter((p) => travelOnSale(p, channel, agentId));
  const paPlans = useStore().paProducts.filter((p) => paOnSale(p, channel, agentId));
  const { t, lang } = useT();
  const s = useStore();
  const [type, setType] = useState<CoverageType | 'all'>('all');
  const [open, setOpen] = useState<Product | null>(null);
  const live = s.products.filter((p) => onSale(p, channel, agentId));
  const types = COVERAGE_TYPES.filter((x) => live.some((p) => p.type === x));
  const shown = live.filter((p) => type === 'all' || p.type === type);
  return (
    <section className="catalog">
      <div className="catalog-head">
        <div>
          <h2>{t('ctTitle')}</h2>
          <p className="hint">{t(channel === 'partner' ? 'ctLeadPartner' : 'ctLead', { n: live.length })}</p>
        </div>
        <div className="chips-row" role="radiogroup" aria-label={t('pdClass')}>
          {(['all', ...types] as const).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={type === x} className={`filter-chip${type === x ? ' on' : ''}`} onClick={() => setType(x)}>
              {x === 'all' ? t('filterAll') : COVERAGE_LABEL[lang][x]}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="muted pad">{t('ctNone')}</p>
      ) : (
        <div className="catalog-grid">
          {shown.map((p) => {
            const range = priceRange(p);
            const hl = pickList(p, lang, 'highlightsTh', 'highlightsEn');
            return (
              <article key={p.id} className={`ct-card type-${p.type}`}>
                <header>
                  <TypeTag type={p.type} />
                  {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                  {channel === 'partner' && <span className="chip ct-com">{t('ctCom', { pct: +(commissionFor(p, agentId) * 100).toFixed(1) })}</span>}
                </header>
                <h3>{productName(p, lang)}</h3>
                <p className="ct-tag">{pick(p, lang, 'tagTh', 'tagEn')}</p>
                {hl.length > 0 && (
                  <ul className="ct-hl">
                    {hl.map((h) => <li key={h}>{h}</li>)}
                  </ul>
                )}
                {p.extras.length > 0 && (
                  <div className="ct-extras">
                    {p.extras.map((x) => <span key={x} className="chip">{t(EXTRA_KEY[x])}</span>)}
                  </div>
                )}
                <div className="ct-foot">
                  <div>
                    {range && <div className="ct-price"><small>{t('ctFrom')}</small> <b className="num">{fmtBaht(range[0], lang)}</b><small>{t('perYear')}</small></div>}
                    {p.saleUntil && <div className="hint">⏳ {t('ctUntil', { date: fmtDate(new Date(`${p.saleUntil}T12:00:00+07:00`).getTime(), lang) })}</div>}
                  </div>
                  <div className="ct-actions">
                    <button type="button" className="btn ghost small" onClick={() => setOpen(p)}>{t('ctDetails')}</button>
                    <button type="button" className="btn primary small" onClick={() => onCheck(p.type)}>{t('ctCheck')}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {travel.length > 0 && (
        <>
          <h3 className="ct-line-h">✈️ {t('lineTravel')}</h3>
          <div className="catalog-grid">
            {travel.map((p) => {
              const range = travelPriceRange(p);
              const hl = lang === 'en' && p.highlightsEn.length ? p.highlightsEn : p.highlightsTh;
              return (
                <article key={p.id} className="ct-card type-TRV">
                  <header>
                    <TypeTag type="TRV" />
                    {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                    {channel === 'partner' && <span className="chip ct-com">{t('ctCom', { pct: +(travelCommission(p, agentId) * 100).toFixed(1) })}</span>}
                  </header>
                  <h3>{lang === 'en' ? p.nameEn || p.nameTh : p.nameTh}</h3>
                  <p className="ct-tag">{lang === 'en' ? p.tagEn || p.tagTh : p.tagTh}</p>
                  {hl.length > 0 && <ul className="ct-hl">{hl.map((h) => <li key={h}>{h}</li>)}</ul>}
                  <div className="ct-foot">
                    <div>{range && <div className="ct-price"><small>{t('ctFrom')}</small> <b className="num">{fmtBaht(range[0], lang)}</b></div>}</div>
                    <div className="ct-actions">
                      <button type="button" className="btn primary small" onClick={() => onCheck('TRV', p.id)}>{t(channel === 'partner' ? 'ctSellPlan' : 'trChoose')}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {paPlans.length > 0 && (
        <>
          <h3 className="ct-line-h">🩹 {t('linePa')}</h3>
          <div className="catalog-grid">
            {paPlans.map((p) => {
              const range = paPriceRange(p);
              const hl = lang === 'en' && p.highlightsEn.length ? p.highlightsEn : p.highlightsTh;
              return (
                <article key={p.id} className="ct-card type-PA">
                  <header>
                    <TypeTag type="PA" />
                    {p.badge && <span className={`mini-badge badge-${p.badge}`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                    {channel === 'partner' && <span className="chip ct-com">{t('ctCom', { pct: +(paCommission(p, agentId) * 100).toFixed(1) })}</span>}
                  </header>
                  <h3>{lang === 'en' ? p.nameEn || p.nameTh : p.nameTh}</h3>
                  <p className="ct-tag">{lang === 'en' ? p.tagEn || p.tagTh : p.tagTh}</p>
                  {hl.length > 0 && <ul className="ct-hl">{hl.map((h) => <li key={h}>{h}</li>)}</ul>}
                  <div className="ct-foot">
                    <div>{range && <div className="ct-price"><small>{t('ctFrom')}</small> <b className="num">{fmtBaht(range[0], lang)}</b></div>}</div>
                    <div className="ct-actions">
                      <button type="button" className="btn primary small" onClick={() => onCheck('PA', p.id)}>{t(channel === 'partner' ? 'ctSellPlan' : 'trChoose')}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {open && <ProductDetail p={open} channel={channel} agentId={agentId} onClose={() => setOpen(null)} onCheck={() => onCheck(open.type)} />}
    </section>
  );
}

function ruleText(r: CoverRule, t: ReturnType<typeof useT>['t'], lang: 'th' | 'en') {
  switch (r.mode) {
    case 'si':
      return t('ctRuleSi');
    case 'fixed':
      return fmtBaht(r.value, lang);
    case 'pct':
      return t('ctRulePct', { pct: r.value, cap: r.cap ? fmtBaht(r.cap, lang) : '—' });
    default:
      return t('notCovered');
  }
}

function ProductDetail({ p, channel, agentId, onClose, onCheck }: { p: Product; channel: 'self' | 'partner'; agentId?: string; onClose: () => void; onCheck: () => void }) {
  const { t, lang } = useT();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    let made: string | null = null;
    if (p.pdf)
      void getFile(p.pdf.key).then((b) => {
        if (b) setPdfUrl((made = URL.createObjectURL(b)));
      });
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [p.pdf]);
  const money = (n: number) => (n ? fmtBaht(n, lang) : t('notCovered'));
  const rows: [string, string][] =
    p.type === 'CMI'
      ? [
          [t('cmiMedical'), `${fmtBaht(p.medical, lang)}${t('perPerson')}`],
          [t('cmiDeath'), `${fmtBaht(p.pa, lang)}${t('perPerson')}`],
        ]
      : [
          [t('repairType'), p.repair ? t(p.repair === 'dealer' ? 'repairDealer' : 'repairGarage') : '—'],
          [t('deductible'), p.deductible ? fmtBaht(p.deductible, lang) : t('none')],
          [t('ownDamage'), ruleText(p.ownDamage, t, lang)],
          [t('fireTheft'), ruleText(p.fireTheft, t, lang)],
          [t('tpbi'), `${fmtBaht(p.tpbiPerson, lang)}${t('perPerson')} / ${fmtBaht(p.tpbiAccident, lang)}`],
          [t('tppd'), money(p.tppd)],
          ...riderRows(p, t, lang),
        ];
  const rules: string[] = [
    p.maxAge !== undefined ? t('ctMaxAge', { n: p.maxAge }) : t('ctAnyAge'),
    p.codes === 'all' ? t('ctAllCodes') : t('ctCodes', { codes: p.codes.join(', ') }),
    t(p.ev === 'only' ? 'ctEvOnly' : p.ev === 'deny' ? 'ctEvDeny' : 'ctEvAllow'),
    ...(p.excludeModels.length ? [t('ctExcluded', { models: p.excludeModels.map((id) => { const m = modelById(id); return `${brandById(m.brandId).name} ${m.name}`; }).join(', ') })] : []),
  ];
  const excl = pickList(p, lang, 'exclusionsTh', 'exclusionsEn');
  const terms = pick(p, lang, 'termsTh', 'termsEn');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal ct-modal" role="dialog" aria-modal="true" aria-label={productName(p, lang)} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><TypeTag type={p.type} /> {productName(p, lang)}</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>{t('close')} ✕</button>
        </div>
        <p className="ct-tag">{pick(p, lang, 'tagTh', 'tagEn')}</p>
        {channel === 'partner' && <p className="chip ct-com">{t('ctCom', { pct: +(commissionFor(p, agentId) * 100).toFixed(1) })}</p>}
        <div className="ct-detail-grid">
          <div>
            <h4>{t('ctCover')}</h4>
            <dl className="cover-list">
              {rows.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>
              ))}
            </dl>
            {p.extras.length > 0 && (
              <>
                <h4>{t('pdSecExtras')}</h4>
                <ul className="ct-hl">{p.extras.map((x) => <li key={x}>{t(EXTRA_KEY[x])}</li>)}</ul>
              </>
            )}
          </div>
          <div>
            <h4>{t('ctRules')}</h4>
            <ul className="ct-plain">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
            <h4>{t('ctDocs')}</h4>
            <p className="hint">{p.docs.length ? p.docs.map((k) => DOC_LABEL[lang][k]).join(' · ') : t('none')}</p>
            {(terms || excl.length > 0) && <h4>{t('pdSecTerms')}</h4>}
            {terms && <p className="hint">{terms}</p>}
            {excl.length > 0 && (
              <ul className="ct-plain ct-excl">{excl.map((x) => <li key={x}>{x}</li>)}</ul>
            )}
            {p.pdf && pdfUrl && (
              <a className="btn ghost small" href={pdfUrl} target="_blank" rel="noreferrer" download={p.pdf.name}>📄 {t('ctPdf')}</a>
            )}
          </div>
        </div>
        <div className="ct-modal-foot">
          <button type="button" className="btn primary" onClick={onCheck}>{t('ctCheck')}</button>
        </div>
      </div>
    </div>
  );
}
