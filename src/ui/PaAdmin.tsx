import { useEffect, useMemo, useState } from 'react';
import type { OccClass, PaCover, PaProduct } from '../types';
import { OCCUPATIONS, PA_COMMISSION, PA_COVER_KEYS, blankPaProduct, paExpired, paPriceRange } from '../data/pa';
import { fmtBaht, fmtDateTime, fmtNum, useT, type TKey } from '../i18n';
import { rollbackPaProduct, savePaProduct, travelChanges, useStore } from '../store';
import { NumberInput, DateInput, toDmy } from './common';
import { PA_COVER_LABEL } from './Pa';
import { staffById } from '../data/vehicles';

const newId = () => `PA-${Date.now().toString(36).toUpperCase().slice(-5)}`;
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const CLASS_KEY: Record<OccClass, TKey> = { 1: 'paClass1', 2: 'paClass2', 3: 'paClass3' };

/** Back office → Products → Personal accident: plans on sale and the plan editor. */
export function PaAdmin({ staffId }: { staffId: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const [editing, setEditing] = useState<{ p: PaProduct; isNew: boolean } | null>(null);
  const now = Date.now();
  // Sales per plan from issued PA policies.
  const sales = useMemo(() => {
    const m = new Map<string, { n: number; gwp: number }>();
    for (const c of s.cases) {
      if (c.coverage !== 'PA' || !c.stamps.issued || !c.pkg) continue;
      const cur = m.get(c.pkg.id) ?? { n: 0, gwp: 0 };
      m.set(c.pkg.id, { n: cur.n + 1, gwp: cur.gwp + (c.premium ?? 0) });
    }
    return m;
  }, [s.cases]);
  const waiting = s.cases.filter((c) => c.coverage === 'PA' && (c.status === 'NEW' || c.status === 'DOCS_REVIEW')).length;

  if (editing) {
    const cur = s.paProducts.find((x) => x.id === editing.p.id);
    return <PaEditor key={editing.p.id} initial={editing.isNew ? editing.p : (cur ?? editing.p)} isNew={editing.isNew && !cur} staffId={staffId} onClose={() => setEditing(null)} />;
  }
  const list = s.paProducts.filter((p) => !p.archived);
  const toggle = (p: PaProduct, ch: 'self' | 'partner') => savePaProduct({ ...p, channels: { ...p.channels, [ch]: !p.channels[ch] } }, staffId, 'toggle');

  return (
    <section className="leads products-admin travel-admin pa-admin">
      <div className="pd-list-head">
        <div>
          <h2>🩹 {t('paAdminTitle')}</h2>
          <p className="hint">{t('paAdminLead')}</p>
        </div>
        <div className="pd-tools">
          {waiting > 0 && <span className="pill tone-warn">🔎 {t('paWaiting', { n: waiting })}</span>}
          <button type="button" className="btn primary small" onClick={() => setEditing({ p: blankPaProduct(newId(), staffId), isNew: true })}>+ {t('paNew')}</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data pd-table ta-table">
          <thead>
            <tr>
              <th>{t('trPlan')}</th>
              <th>{t('pdChSelf')}</th>
              <th>{t('pdChPartner')}</th>
              <th className="r">{t('paSi')}</th>
              <th className="r">{t('taPriceRange')}</th>
              <th className="r">{t('paMcShort')}</th>
              <th className="r">{t('agCommission')}</th>
              <th className="r">{t('taSales')}</th>
              <th><span className="sr-only">{t('pdEdit')}</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const range = paPriceRange(p);
              const sold = sales.get(p.id);
              const expired = paExpired(p, now);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{lang === 'en' ? p.nameEn || p.nameTh : p.nameTh}</b>
                    {p.badge && <span className={`mini-badge badge-${p.badge} pa-badge`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                    <div className="hint num">{p.id} · v{p.ver}{p.saleUntil ? ` · ${t(expired ? 'pdEnded' : 'pdUntil', { date: toDmy(p.saleUntil) })}` : ''}</div>
                  </td>
                  {(['self', 'partner'] as const).map((ch) => (
                    <td key={ch}>
                      <label className="switch">
                        <input type="checkbox" id={`pa-${p.id}-${ch}`} checked={p.channels[ch]} onChange={() => toggle(p, ch)} />
                        <span className="switch-track" aria-hidden="true" />
                        <span className="sr-only">{t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')} {p.nameTh}</span>
                      </label>
                    </td>
                  ))}
                  <td className="r num">{fmtBaht(p.cover.death, lang)}</td>
                  <td className="r num">{range ? `${fmtBaht(range[0], lang)} – ${fmtBaht(range[1], lang)}` : '—'}</td>
                  <td className="r num">{p.motorcyclePct ? `+${p.motorcyclePct}%` : '—'}</td>
                  <td className="r num">{p.commission === undefined ? <span className="muted">{PA_COMMISSION}%</span> : <b>{p.commission}%</b>}</td>
                  <td className="r num">{sold ? `${fmtNum(sold.n, lang)} · ${fmtBaht(Math.round(sold.gwp), lang)}` : '—'}</td>
                  <td>
                    <div className="pd-row-actions">
                      <button type="button" className="btn small" onClick={() => setEditing({ p, isNew: false })}>{t('pdEdit')}</button>
                      <button type="button" className="btn small ghost" onClick={() => setEditing({ p: { ...structuredClone(p), id: newId(), ver: 0, nameTh: `${p.nameTh} (copy)`, nameEn: p.nameEn ? `${p.nameEn} (copy)` : '', channels: { self: false, partner: false } }, isNew: true })}>{t('pdCopy')}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="card pa-occ">
        <summary>{t('paOccList')}</summary>
        <div className="pa-occ-grid">
          {([1, 2, 3, 4] as const).map((cls) => (
            <div key={cls}>
              <b>{t(cls === 4 ? 'paClass4' : CLASS_KEY[cls])}</b>
              <ul>{OCCUPATIONS.filter((o) => o.cls === cls).map((o) => <li key={o.id}>{o[lang]}</li>)}</ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function PaEditor({ initial, isNew, staffId, onClose }: { initial: PaProduct; isNew: boolean; staffId: string; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [d, setD] = useState<PaProduct>(() => structuredClone(initial));
  const [base, setBase] = useState<PaProduct>(() => structuredClone(initial));
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState('');
  const set = <K extends keyof PaProduct>(k: K, v: PaProduct[K]) => setD((x) => ({ ...x, [k]: v }));
  const setCover = (k: keyof PaCover, v: number) => setD((x) => ({ ...x, cover: { ...x.cover, [k]: v } }));
  const saved = s.paProducts.find((x) => x.id === d.id);
  const history = s.paLog.filter((v) => v.id === d.id);
  const changes = isNew && !saved ? ['created'] : travelChanges(base, d);
  const dirty = changes.length > 0;
  const errors = [
    ...(!d.nameTh.trim() ? [t('pdErr_noName')] : []),
    ...(!(d.cover.death > 0) ? [t('paErrSi')] : []),
    ...(([1, 2, 3] as const).some((c) => !(d.prices[c] > 0)) ? [t('paErrPrice')] : []),
    ...(!(d.minAge <= d.maxAge && d.maxAge <= d.renewAge) ? [t('paErrAges')] : []),
  ];

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
  const save = () => {
    if (errors.length) return setFlash(errors[0]);
    if (!savePaProduct(d, staffId, note.trim())) return setFlash(t('pdNoChange'));
    const now = structuredClone(d);
    setBase(now);
    setD(now);
    setNote('');
    setFlash(t('pdSaved', { ver: (saved?.ver ?? 0) + 1 }));
  };

  return (
    <section className="pd-editor ta-editor pa-editor">
      <div className="pd-ed-head">
        <button type="button" className="btn ghost small" onClick={leave}>← {t('pdBack')}</button>
        <div className="pd-ed-title">
          <h3>🩹 {isNew && !saved ? t('paNew') : d.nameTh}</h3>
          <p className="hint num">{d.id}{saved && ` · v${saved.ver} · ${fmtDateTime(saved.updatedAt, lang)} · ${staffById(saved.updatedBy)?.[lang] ?? saved.updatedBy}`}</p>
        </div>
      </div>

      <div className="pd-tab-body">
        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecMarketing')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field"><label htmlFor="pa-nameTh">{t('pdNameTh')} *</label><input id="pa-nameTh" value={d.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="pa-nameEn">{t('pdNameEn')}</label><input id="pa-nameEn" value={d.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
            <div className="field"><label htmlFor="pa-tagTh">{t('pdTagTh')}</label><input id="pa-tagTh" value={d.tagTh} onChange={(e) => set('tagTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="pa-tagEn">{t('pdTagEn')}</label><input id="pa-tagEn" value={d.tagEn} onChange={(e) => set('tagEn', e.target.value)} /></div>
            <div className="field top"><label htmlFor="pa-hlTh">{t('pdHlTh')}</label><textarea id="pa-hlTh" rows={3} value={d.highlightsTh.join('\n')} onChange={(e) => set('highlightsTh', e.target.value.split('\n'))} onBlur={() => set('highlightsTh', lines(d.highlightsTh.join('\n')))} /></div>
            <div className="field top"><label htmlFor="pa-hlEn">{t('pdHlEn')}</label><textarea id="pa-hlEn" rows={3} value={d.highlightsEn.join('\n')} onChange={(e) => set('highlightsEn', e.target.value.split('\n'))} onBlur={() => set('highlightsEn', lines(d.highlightsEn.join('\n')))} /></div>
            <div className="field">
              <label htmlFor="pa-badge">{t('pdBadge')}</label>
              <select id="pa-badge" value={d.badge ?? ''} onChange={(e) => set('badge', (e.target.value || undefined) as PaProduct['badge'])}>
                <option value="">—</option>
                <option value="recommended">{t('pdBadgeRec')}</option>
                <option value="new">{t('pdBadgeNew')}</option>
              </select>
            </div>
            <div className="field">
              <span className="field-label">{t('pdOnSaleTo')}</span>
              <div className="pd-inline">
                <label className="check"><input id="pa-ch-self" type="checkbox" checked={d.channels.self} onChange={(e) => set('channels', { ...d.channels, self: e.target.checked })} /> {t('pdChSelf')}</label>
                <label className="check"><input id="pa-ch-partner" type="checkbox" checked={d.channels.partner} onChange={(e) => set('channels', { ...d.channels, partner: e.target.checked })} /> {t('pdChPartner')}</label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="pa-until">{t('pdSaleUntil')}</label>
              <DateInput id="pa-until" value={d.saleUntil ?? ''} onChange={(v) => set('saleUntil', v || undefined)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecCover')}</h4><p className="hint">{t('paCoverHint')}</p></div></div>
          <div className="form-grid pair">
            {PA_COVER_KEYS.map((k) => (
              <div className="field" key={k}>
                <label htmlFor={`pa-${k}`}>{t(PA_COVER_LABEL[k])}{k === 'death' ? ' *' : <small>{t('taZeroNone')}</small>}</label>
                <NumberInput id={`pa-${k}`} value={d.cover[k]} onChange={(v) => setCover(k, v ?? 0)} />
              </div>
            ))}
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('paPrices')}</h4><p className="hint">{t('paPricesHint')}</p></div></div>
          <div className="form-grid pair">
            {([1, 2, 3] as const).map((c) => (
              <div className="field" key={c}>
                <label htmlFor={`pa-price-${c}`}>{t(CLASS_KEY[c])}</label>
                <NumberInput id={`pa-price-${c}`} value={d.prices[c]} onChange={(v) => set('prices', { ...d.prices, [c]: v ?? 0 })} />
              </div>
            ))}
            <div className="field">
              <label htmlFor="pa-mc">{t('paMcPct')}<small>{t('paMcPctHint')}</small></label>
              <NumberInput id="pa-mc" value={d.motorcyclePct} onChange={(v) => set('motorcyclePct', v ?? 0)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('paRules')}</h4><p className="hint">{t('paRulesHint')}</p></div></div>
          <div className="form-grid pair">
            <div className="field"><label htmlFor="pa-minAge">{t('paMinAge')}</label><NumberInput id="pa-minAge" value={d.minAge} onChange={(v) => set('minAge', v ?? 0)} /></div>
            <div className="field"><label htmlFor="pa-maxAge">{t('paMaxAge')}</label><NumberInput id="pa-maxAge" value={d.maxAge} onChange={(v) => set('maxAge', v ?? 0)} /></div>
            <div className="field"><label htmlFor="pa-renewAge">{t('paRenewAge')}</label><NumberInput id="pa-renewAge" value={d.renewAge} onChange={(v) => set('renewAge', v ?? 0)} /></div>
            <div className="field">
              <label htmlFor="pa-com">{t('agCommission')} (%)</label>
              <NumberInput id="pa-com" value={d.commission} placeholder={t('taComStd', { pct: PA_COMMISSION })} onChange={(v) => set('commission', v)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecTerms')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field top"><label htmlFor="pa-termsTh">{t('pdTermsTh')}</label><textarea id="pa-termsTh" rows={3} value={d.termsTh} onChange={(e) => set('termsTh', e.target.value)} /></div>
            <div className="field top"><label htmlFor="pa-exTh">{t('pdExclTh')}</label><textarea id="pa-exTh" rows={3} value={d.exclusionsTh.join('\n')} onChange={(e) => set('exclusionsTh', e.target.value.split('\n'))} onBlur={() => set('exclusionsTh', lines(d.exclusionsTh.join('\n')))} /></div>
          </div>
        </section>

        {history.length > 0 && (
          <section className="card pd-sec">
            <div className="pd-sec-head"><div><h4>{t('pdHistory')} ({history.length})</h4></div></div>
            <ul className="pd-history">
              {history.map((v) => (
                <li key={v.ver}>
                  <b className="num">v{v.ver}</b> <span className="muted num">{fmtDateTime(v.at, lang)}</span> · {staffById(v.by)?.[lang] ?? v.by}
                  {v.note && v.note !== 'init' && <span className="muted"> · {v.note}</span>}
                  {v.ver !== saved?.ver && (
                    <button type="button" className="btn small ghost" onClick={() => { if (window.confirm(t('pdRollbackAsk', { ver: v.ver }))) { rollbackPaProduct(d.id, v.ver, staffId); onClose(); } }}>{t('pdRollback')}</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className={`pd-savebar${dirty ? ' dirty' : ''}`} role="region" aria-label={t('pdSave')}>
        <div className="pd-save-status" aria-live="polite">
          {flash ? <b>{flash}</b> : dirty ? <b>● {t('pdUnsaved', { n: changes.length })}</b> : <span className="muted">{saved ? t('pdAllSaved', { ver: saved.ver }) : t('pdNotSavedYet')}</span>}
        </div>
        <input id="pa-note" className="pd-note" value={note} placeholder={t('pdNotePh')} aria-label={t('pdNote')} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn ghost" disabled={!dirty} onClick={() => { setD(structuredClone(base)); setFlash(''); }}>{t('pdDiscard')}</button>
        <button type="button" className="btn primary" disabled={!dirty} onClick={save}>{t('pdSave')}</button>
      </div>
    </section>
  );
}
