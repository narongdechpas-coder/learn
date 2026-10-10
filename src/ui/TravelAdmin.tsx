import { useEffect, useMemo, useState } from 'react';
import type { TravelCover, TravelProduct, TravelRateRow, TravelZone } from '../types';
import { COVER_KEYS, SCHENGEN_MIN_MEDICAL, TRAVEL_COMMISSION, blankTravelProduct, travelExpired, travelPriceRange } from '../data/travel';
import { fmtBaht, fmtDateTime, fmtNum, useT } from '../i18n';
import { rollbackTravelProduct, saveTravelProduct, saveTravelZones, travelChanges, useStore } from '../store';
import { NumberInput } from './common';
import { COVER_LABEL } from './Travel';
import { staffById } from '../data/vehicles';

const newId = () => `TRV-${Date.now().toString(36).toUpperCase().slice(-5)}`;
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** Back office → Products → Travel: plans on sale, destination zones, and the plan editor. */
export function TravelAdmin({ staffId }: { staffId: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const [editing, setEditing] = useState<{ p: TravelProduct; isNew: boolean } | null>(null);
  const [zonesOpen, setZonesOpen] = useState(false);
  const now = Date.now();
  // Sales per plan from issued travel policies.
  const sales = useMemo(() => {
    const m = new Map<string, { n: number; gwp: number }>();
    for (const c of s.cases) {
      if (c.coverage !== 'TRV' || !c.stamps.issued || !c.pkg) continue;
      const cur = m.get(c.pkg.id) ?? { n: 0, gwp: 0 };
      m.set(c.pkg.id, { n: cur.n + 1, gwp: cur.gwp + (c.premium ?? 0) });
    }
    return m;
  }, [s.cases]);

  if (editing) {
    const cur = s.travelProducts.find((x) => x.id === editing.p.id);
    return <TravelEditor key={editing.p.id} initial={editing.isNew ? editing.p : (cur ?? editing.p)} isNew={editing.isNew && !cur} staffId={staffId} zones={s.travelZones} onClose={() => setEditing(null)} />;
  }
  const list = s.travelProducts.filter((p) => !p.archived);
  const toggle = (p: TravelProduct, ch: 'self' | 'partner') => saveTravelProduct({ ...p, channels: { ...p.channels, [ch]: !p.channels[ch] } }, staffId, 'toggle');

  return (
    <section className="leads products-admin travel-admin">
      <div className="pd-list-head">
        <div>
          <h2>✈️ {t('taTitle')}</h2>
          <p className="hint">{t('taLead')}</p>
        </div>
        <div className="pd-tools">
          <button type="button" className="btn small" aria-expanded={zonesOpen} onClick={() => setZonesOpen((v) => !v)}>🌏 {t('taZones')} ({s.travelZones.length})</button>
          <button type="button" className="btn primary small" onClick={() => setEditing({ p: blankTravelProduct(newId(), staffId), isNew: true })}>+ {t('taNew')}</button>
        </div>
      </div>
      {zonesOpen && <ZonesEditor zones={s.travelZones} onClose={() => setZonesOpen(false)} />}
      <div className="table-wrap">
        <table className="data pd-table ta-table">
          <thead>
            <tr>
              <th>{t('trPlan')}</th>
              <th>{t('pdChSelf')}</th>
              <th>{t('pdChPartner')}</th>
              <th className="r">{t('taPriceRange')}</th>
              <th className="r">{t('trcMedical')}</th>
              <th className="r">{t('agCommission')}</th>
              <th className="r">{t('taSales')}</th>
              <th><span className="sr-only">{t('pdEdit')}</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const range = travelPriceRange(p);
              const sold = sales.get(p.id);
              const expired = travelExpired(p, now);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{lang === 'en' ? p.nameEn || p.nameTh : p.nameTh}</b>
                    <div className="hint num">{p.id} · v{p.ver}{p.saleUntil ? ` · ${t(expired ? 'pdEnded' : 'pdUntil', { date: p.saleUntil })}` : ''}</div>
                  </td>
                  {(['self', 'partner'] as const).map((ch) => (
                    <td key={ch}>
                      <label className="switch">
                        <input type="checkbox" id={`ta-${p.id}-${ch}`} checked={p.channels[ch]} onChange={() => toggle(p, ch)} />
                        <span className="switch-track" aria-hidden="true" />
                        <span className="sr-only">{t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')} {p.nameTh}</span>
                      </label>
                    </td>
                  ))}
                  <td className="r num">{range ? `${fmtBaht(range[0], lang)} – ${fmtBaht(range[1], lang)}` : '—'}</td>
                  <td className="r num">{fmtBaht(p.cover.medical, lang)}</td>
                  <td className="r num">{p.commission === undefined ? <span className="muted">{TRAVEL_COMMISSION}%</span> : <b>{p.commission}%</b>}</td>
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
    </section>
  );
}

/** Destination zones: names, countries and whether plans for the zone carry a Schengen letter. */
function ZonesEditor({ zones, onClose }: { zones: TravelZone[]; onClose: () => void }) {
  const { t } = useT();
  const [rows, setRows] = useState<TravelZone[]>(() => structuredClone(zones));
  const [msg, setMsg] = useState('');
  const set = (i: number, patch: Partial<TravelZone>) => setRows((r) => r.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const save = () => {
    if (rows.some((z) => !z.nameTh.trim())) return setMsg(t('taZoneNeedName'));
    saveTravelZones(rows.map((z) => ({ ...z, nameTh: z.nameTh.trim(), nameEn: z.nameEn.trim() || z.nameTh.trim() })));
    setMsg(t('taZonesSaved'));
  };
  return (
    <section className="card ta-zones">
      <div className="card-head">
        <div>
          <h3>{t('taZones')}</h3>
          <p className="hint">{t('taZonesLead')}</p>
        </div>
        <button type="button" className="btn ghost small" onClick={onClose}>✕</button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>ID</th><th>{t('taZoneTh')}</th><th>{t('taZoneEn')}</th><th>{t('taZoneNote')}</th><th>{t('trSchengen')}</th></tr>
          </thead>
          <tbody>
            {rows.map((z, i) => (
              <tr key={z.id}>
                <td className="num muted">{z.id}</td>
                <td><input aria-label={`${t('taZoneTh')} ${z.id}`} value={z.nameTh} onChange={(e) => set(i, { nameTh: e.target.value })} /></td>
                <td><input aria-label={`${t('taZoneEn')} ${z.id}`} value={z.nameEn} onChange={(e) => set(i, { nameEn: e.target.value })} /></td>
                <td><input aria-label={`${t('taZoneNote')} ${z.id}`} value={z.noteTh} onChange={(e) => set(i, { noteTh: e.target.value, noteEn: z.noteEn || e.target.value })} /></td>
                <td><input type="checkbox" aria-label={`${t('trSchengen')} ${z.id}`} checked={z.schengen} onChange={(e) => set(i, { schengen: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button type="button" className="btn small" onClick={() => setRows((r) => [...r, { id: `z${Date.now().toString(36).slice(-4)}`, nameTh: '', nameEn: '', noteTh: '', noteEn: '', schengen: false }])}>+ {t('taZoneAdd')}</button>
        <button type="button" className="btn primary small" onClick={save}>{t('taZonesSave')}</button>
        {msg && <span className="hint" role="status">{msg}</span>}
      </div>
    </section>
  );
}

function bandIssues(rows: TravelRateRow[]) {
  const sorted = [...rows].sort((a, b) => a.dayFrom - b.dayFrom);
  const bad = new Set<number>();
  sorted.forEach((r, i) => {
    if (!(r.dayFrom >= 1) || !(r.dayTo >= r.dayFrom) || r.dayTo > 180) bad.add(rows.indexOf(r));
    if (i && r.dayFrom <= sorted[i - 1].dayTo) bad.add(rows.indexOf(r));
  });
  return bad;
}

function TravelEditor({ initial, isNew, staffId, zones, onClose }: { initial: TravelProduct; isNew: boolean; staffId: string; zones: TravelZone[]; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [d, setD] = useState<TravelProduct>(() => structuredClone(initial));
  const [base, setBase] = useState<TravelProduct>(() => structuredClone(initial));
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState('');
  const set = <K extends keyof TravelProduct>(k: K, v: TravelProduct[K]) => setD((x) => ({ ...x, [k]: v }));
  const setCover = (k: keyof TravelCover, v: number) => setD((x) => ({ ...x, cover: { ...x.cover, [k]: v } }));
  const saved = s.travelProducts.find((x) => x.id === d.id);
  const history = s.travelLog.filter((v) => v.id === d.id);
  const changes = isNew && !saved ? ['created'] : travelChanges(base, d);
  const dirty = changes.length > 0;
  const bad = bandIssues(d.single);
  const errors = [...(!d.nameTh.trim() ? [t('pdErr_noName')] : []), ...(bad.size ? [t('taErrBands')] : [])];

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
    const next = { ...d, single: [...d.single].sort((a, b) => a.dayFrom - b.dayFrom) };
    if (!saveTravelProduct(next, staffId, note.trim())) return setFlash(t('pdNoChange'));
    const now = structuredClone(next);
    setBase(now);
    setD(now);
    setNote('');
    setFlash(t('pdSaved', { ver: (saved?.ver ?? 0) + 1 }));
  };
  const setRate = (i: number, zoneId: string, v: number | undefined) =>
    setD((x) => ({ ...x, single: x.single.map((r, j) => (j === i ? { ...r, prices: v === undefined ? Object.fromEntries(Object.entries(r.prices).filter(([z]) => z !== zoneId)) : { ...r.prices, [zoneId]: v } } : r)) }));
  const setBand = (i: number, patch: Partial<TravelRateRow>) => setD((x) => ({ ...x, single: x.single.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const name = (z: TravelZone) => (lang === 'th' ? z.nameTh : z.nameEn);
  const schengenOk = d.cover.medical >= SCHENGEN_MIN_MEDICAL;

  return (
    <section className="pd-editor ta-editor">
      <div className="pd-ed-head">
        <button type="button" className="btn ghost small" onClick={leave}>← {t('pdBack')}</button>
        <div className="pd-ed-title">
          <h3>✈️ {isNew && !saved ? t('taNew') : d.nameTh}</h3>
          <p className="hint num">{d.id}{saved && ` · v${saved.ver} · ${fmtDateTime(saved.updatedAt, lang)} · ${staffById(saved.updatedBy)?.[lang] ?? saved.updatedBy}`}</p>
        </div>
      </div>

      <div className="pd-tab-body">
        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecMarketing')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field"><label htmlFor="ta-nameTh">{t('pdNameTh')} *</label><input id="ta-nameTh" value={d.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="ta-nameEn">{t('pdNameEn')}</label><input id="ta-nameEn" value={d.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
            <div className="field"><label htmlFor="ta-tagTh">{t('pdTagTh')}</label><input id="ta-tagTh" value={d.tagTh} onChange={(e) => set('tagTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="ta-tagEn">{t('pdTagEn')}</label><input id="ta-tagEn" value={d.tagEn} onChange={(e) => set('tagEn', e.target.value)} /></div>
            <div className="field top"><label htmlFor="ta-hlTh">{t('pdHlTh')}</label><textarea id="ta-hlTh" rows={3} value={d.highlightsTh.join('\n')} onChange={(e) => set('highlightsTh', e.target.value.split('\n'))} onBlur={() => set('highlightsTh', lines(d.highlightsTh.join('\n')))} /></div>
            <div className="field top"><label htmlFor="ta-hlEn">{t('pdHlEn')}</label><textarea id="ta-hlEn" rows={3} value={d.highlightsEn.join('\n')} onChange={(e) => set('highlightsEn', e.target.value.split('\n'))} onBlur={() => set('highlightsEn', lines(d.highlightsEn.join('\n')))} /></div>
            <div className="field">
              <label htmlFor="ta-badge">{t('pdBadge')}</label>
              <select id="ta-badge" value={d.badge ?? ''} onChange={(e) => set('badge', (e.target.value || undefined) as TravelProduct['badge'])}>
                <option value="">—</option>
                <option value="recommended">{t('pdBadgeRec')}</option>
                <option value="new">{t('pdBadgeNew')}</option>
              </select>
            </div>
            <div className="field">
              <span className="field-label">{t('pdOnSaleTo')}</span>
              <div className="pd-inline">
                <label className="check"><input id="ta-ch-self" type="checkbox" checked={d.channels.self} onChange={(e) => set('channels', { ...d.channels, self: e.target.checked })} /> {t('pdChSelf')}</label>
                <label className="check"><input id="ta-ch-partner" type="checkbox" checked={d.channels.partner} onChange={(e) => set('channels', { ...d.channels, partner: e.target.checked })} /> {t('pdChPartner')}</label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="ta-until">{t('pdSaleUntil')}</label>
              <input id="ta-until" type="date" value={d.saleUntil ?? ''} onChange={(e) => set('saleUntil', e.target.value || undefined)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecCover')}</h4><p className="hint">{schengenOk ? `✓ ${t('taSchengenOk')}` : t('taSchengenNo', { min: fmtBaht(SCHENGEN_MIN_MEDICAL, lang) })}</p></div></div>
          <div className="form-grid pair">
            {COVER_KEYS.map((k) => (
              <div className="field" key={k}>
                <label htmlFor={`ta-${k}`}>{t(COVER_LABEL[k])}<small>{t('taZeroNone')}</small></label>
                <NumberInput id={`ta-${k}`} value={d.cover[k]} onChange={(v) => setCover(k, v ?? 0)} />
              </div>
            ))}
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('taRatesSingle')}</h4><p className="hint">{t('taRatesHint')}</p></div></div>
          <div className="pd-rates-frame">
            <table className="data pd-rates ta-rates">
              <thead>
                <tr>
                  <th>{t('taDayFrom')}</th>
                  <th>{t('taDayTo')}</th>
                  {zones.map((z) => <th key={z.id} className="r">{name(z)}</th>)}
                  <th><span className="sr-only">{t('pdRemove')}</span></th>
                </tr>
              </thead>
              <tbody>
                {d.single.map((r, i) => (
                  <tr key={i} className={bad.has(i) ? 'bad' : ''}>
                    <td><NumberInput id={`ta-r${i}-from`} aria-label={`${t('taDayFrom')} ${i + 1}`} value={r.dayFrom} onChange={(v) => setBand(i, { dayFrom: v ?? 0 })} /></td>
                    <td><NumberInput id={`ta-r${i}-to`} aria-label={`${t('taDayTo')} ${i + 1}`} value={r.dayTo} onChange={(v) => setBand(i, { dayTo: v ?? 0 })} /></td>
                    {zones.map((z) => (
                      <td key={z.id}><NumberInput id={`ta-r${i}-${z.id}`} aria-label={`${name(z)} ${r.dayFrom}-${r.dayTo}`} value={r.prices[z.id]} onChange={(v) => setRate(i, z.id, v)} /></td>
                    ))}
                    <td><button type="button" className="link" aria-label={t('pdRemove')} onClick={() => set('single', d.single.filter((_, j) => j !== i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button type="button" className="btn small" onClick={() => { const last = d.single[d.single.length - 1]; set('single', [...d.single, { dayFrom: (last?.dayTo ?? 0) + 1, dayTo: Math.min(180, (last?.dayTo ?? 0) + 30), prices: {} }]); }}>+ {t('taAddBand')}</button>
            {bad.size > 0 && <span className="error">{t('taErrBands')}</span>}
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('taRatesAnnual')}</h4><p className="hint">{t('taAnnualHint')}</p></div></div>
          <div className="form-grid pair">
            {zones.map((z) => (
              <div className="field" key={z.id}>
                <label htmlFor={`ta-an-${z.id}`}>{name(z)}</label>
                <NumberInput id={`ta-an-${z.id}`} value={d.annual[z.id]} placeholder={t('taNotSold')} onChange={(v) => set('annual', v === undefined ? Object.fromEntries(Object.entries(d.annual).filter(([k]) => k !== z.id)) : { ...d.annual, [z.id]: v })} />
              </div>
            ))}
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecRules')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field"><label htmlFor="ta-maxAge">{t('taMaxAge')}</label><NumberInput id="ta-maxAge" value={d.maxAge} onChange={(v) => set('maxAge', v ?? 0)} /></div>
            <div className="field"><label htmlFor="ta-loadAge">{t('taLoadAge')}</label><NumberInput id="ta-loadAge" value={d.loadAge} onChange={(v) => set('loadAge', v ?? 0)} /></div>
            <div className="field"><label htmlFor="ta-loadPct">{t('taLoadPct')}</label><NumberInput id="ta-loadPct" value={d.loadPct} onChange={(v) => set('loadPct', v ?? 0)} /></div>
            <div className="field">
              <label htmlFor="ta-com">{t('agCommission')} (%)</label>
              <NumberInput id="ta-com" value={d.commission} placeholder={t('taComStd', { pct: TRAVEL_COMMISSION })} onChange={(v) => set('commission', v)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecTerms')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field top"><label htmlFor="ta-termsTh">{t('pdTermsTh')}</label><textarea id="ta-termsTh" rows={3} value={d.termsTh} onChange={(e) => set('termsTh', e.target.value)} /></div>
            <div className="field top"><label htmlFor="ta-exTh">{t('pdExclTh')}</label><textarea id="ta-exTh" rows={3} value={d.exclusionsTh.join('\n')} onChange={(e) => set('exclusionsTh', e.target.value.split('\n'))} onBlur={() => set('exclusionsTh', lines(d.exclusionsTh.join('\n')))} /></div>
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
                    <button type="button" className="btn small ghost" onClick={() => { if (window.confirm(t('pdRollbackAsk', { ver: v.ver }))) { rollbackTravelProduct(d.id, v.ver, staffId); onClose(); } }}>{t('pdRollback')}</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className={`pd-savebar${dirty ? ' dirty' : ''}`} role="region" aria-label={t('pdSave')}>
        <div className="pd-save-status" aria-live="polite">
          {flash ? <b>{flash}</b> : dirty ? <b>● {t('pdUnsaved', { n: changes.length })}</b> : <span className="muted">{t('pdAllSaved')}{saved ? ` · v${saved.ver}` : ''}</span>}
        </div>
        <input id="ta-note" className="pd-note" value={note} placeholder={t('pdNotePh')} aria-label={t('pdNote')} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn ghost" disabled={!dirty} onClick={() => { setD(structuredClone(base)); setFlash(''); }}>{t('pdDiscard')}</button>
        <button type="button" className="btn primary" disabled={!dirty} onClick={save}>{t('pdSave')}</button>
      </div>
    </section>
  );
}
