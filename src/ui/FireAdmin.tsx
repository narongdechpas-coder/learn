import { useEffect, useMemo, useState } from 'react';
import type { BuildingType, Construction, FireMode, FireOccupancy, FirePeril, FireProduct, FireSettings } from '../types';
import { BUILDINGS, CONSTRUCTIONS, FIRE_COMMISSION, PERILS, PROVINCES_ALL, blankFireProduct, buildingName, fireExpired } from '../data/fire';
import { fmtBaht, fmtDateTime, fmtNum, useT } from '../i18n';
import { rollbackFireProduct, saveFireProduct, saveFireSettings, travelChanges, useStore } from '../store';
import { DateInput, NumberInput, Segmented, toDmy } from './common';
import { CONSTRUCTION_KEY, PERIL_KEY } from './Fire';
import { staffById } from '../data/vehicles';

const newId = () => `FIRE-${Date.now().toString(36).toUpperCase().slice(-5)}`;
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** Back office → Products → Fire: sales mode and rules, products of both kinds, and the editor. */
export function FireAdmin({ staffId }: { staffId: string }) {
  const { t, lang } = useT();
  const s = useStore();
  const [editing, setEditing] = useState<{ p: FireProduct; isNew: boolean } | null>(null);
  const [show, setShow] = useState<FireMode>(s.fireSettings.mode);
  const now = Date.now();
  const sales = useMemo(() => {
    const m = new Map<string, { n: number; gwp: number }>();
    for (const c of s.cases) {
      if (c.coverage !== 'FIRE' || !c.stamps.issued || !c.pkg) continue;
      const cur = m.get(c.pkg.id) ?? { n: 0, gwp: 0 };
      m.set(c.pkg.id, { n: cur.n + 1, gwp: cur.gwp + (c.premium ?? 0) });
    }
    return m;
  }, [s.cases]);
  const waiting = s.cases.filter((c) => c.coverage === 'FIRE' && (c.status === 'NEW' || c.status === 'DOCS_REVIEW')).length;

  if (editing) {
    const cur = s.fireProducts.find((x) => x.id === editing.p.id);
    return <FireEditor key={editing.p.id} initial={editing.isNew ? editing.p : (cur ?? editing.p)} isNew={editing.isNew && !cur} staffId={staffId} onClose={() => setEditing(null)} />;
  }
  const list = s.fireProducts.filter((p) => !p.archived && p.mode === show);
  const toggle = (p: FireProduct, ch: 'self' | 'partner') => saveFireProduct({ ...p, channels: { ...p.channels, [ch]: !p.channels[ch] } }, staffId, 'toggle');
  const live = show === s.fireSettings.mode;

  return (
    <section className="leads products-admin travel-admin fire-admin">
      <div className="pd-list-head">
        <div>
          <h2>🏠 {t('faTitle')}</h2>
          <p className="hint">{t('faLead')}</p>
        </div>
        <div className="pd-tools">
          {waiting > 0 && <span className="pill tone-warn">🔎 {t('faWaiting', { n: waiting })}</span>}
          <button type="button" className="btn primary small" onClick={() => setEditing({ p: blankFireProduct(newId(), staffId, show, 'home'), isNew: true })}>+ {t('faNew')}</button>
        </div>
      </div>
      <FireSettingsCard key={JSON.stringify(s.fireSettings)} settings={s.fireSettings} />
      <div className="fa-show">
        <Segmented id="fa-show" label={t('faMode')} value={show} onChange={setShow} options={[
          { value: 'rate', label: `${t('fiModeRate')}${s.fireSettings.mode === 'rate' ? ' ●' : ''}` },
          { value: 'plan', label: `${t('fiModePlan')}${s.fireSettings.mode === 'plan' ? ' ●' : ''}` },
        ]} />
        <span className={`pill tone-${live ? 'good' : 'neutral'}`}>{t(live ? 'faOnSale' : 'faOff')}</span>
      </div>
      <div className="table-wrap">
        <table className="data pd-table ta-table fa-table">
          <thead>
            <tr>
              <th>{t('trPlan')}</th>
              <th>{t('faOccupancy')}</th>
              <th>{t('pdChSelf')}</th>
              <th>{t('pdChPartner')}</th>
              <th className="r">{show === 'rate' ? t('faRates') : t('faPlanPrice')}</th>
              <th className="r">{t('agCommission')}</th>
              <th className="r">{t('taSales')}</th>
              <th><span className="sr-only">{t('pdEdit')}</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const sold = sales.get(p.id);
              const expired = fireExpired(p, now);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{lang === 'en' ? p.nameEn || p.nameTh : p.nameTh}</b>
                    {p.badge && <span className={`mini-badge badge-${p.badge} pa-badge`}>{t(p.badge === 'new' ? 'pdBadgeNew' : 'pdBadgeRec')}</span>}
                    <div className="hint num">{p.id} · v{p.ver}{p.saleUntil ? ` · ${t(expired ? 'pdEnded' : 'pdUntil', { date: toDmy(p.saleUntil) })}` : ''}</div>
                  </td>
                  <td>{t(p.occupancy === 'home' ? 'fiHome' : 'fiShop')}</td>
                  {(['self', 'partner'] as const).map((ch) => (
                    <td key={ch}>
                      <label className="switch">
                        <input type="checkbox" id={`fa-${p.id}-${ch}`} checked={p.channels[ch]} onChange={() => toggle(p, ch)} />
                        <span className="switch-track" aria-hidden="true" />
                        <span className="sr-only">{t(ch === 'self' ? 'pdChSelf' : 'pdChPartner')} {p.nameTh}</span>
                      </label>
                    </td>
                  ))}
                  <td className="r num">{p.mode === 'rate' ? CONSTRUCTIONS.map((c) => `${p.rates[c]}‰`).join(' / ') : `${fmtBaht(p.planPrice, lang)} · ${fmtBaht(p.planBuildingSi + p.planContentsSi, lang)}`}</td>
                  <td className="r num">{p.commission === undefined ? <span className="muted">{FIRE_COMMISSION}%</span> : <b>{p.commission}%</b>}</td>
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

/** Sales mode, review threshold, flood-prone provinces and rebuild cost per m². */
function FireSettingsCard({ settings }: { settings: FireSettings }) {
  const { t, lang } = useT();
  const [d, setD] = useState<FireSettings>(() => structuredClone(settings));
  const [add, setAdd] = useState('');
  const [msg, setMsg] = useState('');
  const dirty = JSON.stringify(d) !== JSON.stringify(settings);
  const setCost = (b: BuildingType, v: number) => setD((x) => ({ ...x, costPerSqm: { ...x.costPerSqm, [b]: v } }));
  return (
    <section className="card fa-settings">
      <h3>{t('faSettings')}</h3>
      <div className="fa-mode" role="radiogroup" aria-label={t('faMode')}>
        <span className="field-label">{t('faMode')}</span>
        {(['rate', 'plan'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={d.mode === m} className={`option-card${d.mode === m ? ' on' : ''}`} onClick={() => setD((x) => ({ ...x, mode: m }))}>
            <span className="radio-dot" aria-hidden="true" />
            <span>
              <b>{t(m === 'rate' ? 'fiModeRate' : 'fiModePlan')}</b>
              <small>{t(m === 'rate' ? 'faModeRateHint' : 'faModePlanHint')}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="form-grid pair">
        <div className="field">
          <label htmlFor="fa-refsi">{t('faReferralSi')}</label>
          <NumberInput id="fa-refsi" value={d.referralSi} onChange={(v) => setD((x) => ({ ...x, referralSi: v ?? 0 }))} />
        </div>
        <div className="field top">
          <span className="field-label">{t('faCost')}</span>
          <div className="fa-costs">
            {(Object.values(BUILDINGS).flat() as BuildingType[]).map((b) => (
              <label key={b} htmlFor={`fa-cost-${b}`}>
                <span>{buildingName(b, lang)}</span>
                <NumberInput id={`fa-cost-${b}`} value={d.costPerSqm[b]} onChange={(v) => setCost(b, v ?? 0)} />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="field">
        <span className="field-label">{t('faFlood')}</span>
        <div className="fa-flood">
          {d.floodProvinces.map((p) => (
            <span key={p} className="chip">
              {p} <button type="button" className="link" aria-label={`${t('pdRemove')} ${p}`} onClick={() => setD((x) => ({ ...x, floodProvinces: x.floodProvinces.filter((y) => y !== p) }))}>✕</button>
            </span>
          ))}
          <select id="fa-flood-add" aria-label={t('faFloodAdd')} value={add} onChange={(e) => { const v = e.target.value; if (v) setD((x) => ({ ...x, floodProvinces: [...x.floodProvinces, v] })); setAdd(''); }}>
            <option value="">+ {t('faFloodAdd')}</option>
            {PROVINCES_ALL.filter((p) => !d.floodProvinces.includes(p)).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn primary small" disabled={!dirty} onClick={() => { saveFireSettings(d); setMsg(t('faSaved')); }}>{t('faSaveSettings')}</button>
        {msg && !dirty && <span className="hint" role="status">✓ {msg}</span>}
      </div>
    </section>
  );
}

function FireEditor({ initial, isNew, staffId, onClose }: { initial: FireProduct; isNew: boolean; staffId: string; onClose: () => void }) {
  const { t, lang } = useT();
  const s = useStore();
  const [d, setD] = useState<FireProduct>(() => structuredClone(initial));
  const [base, setBase] = useState<FireProduct>(() => structuredClone(initial));
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState('');
  const set = <K extends keyof FireProduct>(k: K, v: FireProduct[K]) => setD((x) => ({ ...x, [k]: v }));
  const saved = s.fireProducts.find((x) => x.id === d.id);
  const history = s.fireLog.filter((v) => v.id === d.id);
  const changes = isNew && !saved ? ['created'] : travelChanges(base, d);
  const dirty = changes.length > 0;
  const errors = [
    ...(!d.nameTh.trim() ? [t('pdErr_noName')] : []),
    ...(d.mode === 'rate' && CONSTRUCTIONS.some((c) => !(d.rates[c] > 0)) ? [t('paErrPrice')] : []),
    ...(d.mode === 'plan' && !(d.planPrice > 0 && d.planBuildingSi + d.planContentsSi > 0) ? [t('paErrPrice')] : []),
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
    if (!saveFireProduct(d, staffId, note.trim())) return setFlash(t('pdNoChange'));
    const next = structuredClone(d);
    setBase(next);
    setD(next);
    setNote('');
    setFlash(t('pdSaved', { ver: (saved?.ver ?? 0) + 1 }));
  };
  const num = (id: string, label: string, value: number | undefined, on: (v: number) => void, hint?: string) => (
    <div className="field" key={id}>
      <label htmlFor={id}>{label}{hint && <small>{hint}</small>}</label>
      <NumberInput id={id} value={value} onChange={(v) => on(v ?? 0)} />
    </div>
  );

  return (
    <section className="pd-editor ta-editor fire-editor">
      <div className="pd-ed-head">
        <button type="button" className="btn ghost small" onClick={leave}>← {t('pdBack')}</button>
        <div className="pd-ed-title">
          <h3>🏠 {isNew && !saved ? t('faNew') : d.nameTh}</h3>
          <p className="hint num">{d.id} · {t(d.mode === 'plan' ? 'fiModePlan' : 'fiModeRate')}{saved && ` · v${saved.ver} · ${fmtDateTime(saved.updatedAt, lang)} · ${staffById(saved.updatedBy)?.[lang] ?? saved.updatedBy}`}</p>
        </div>
      </div>

      <div className="pd-tab-body">
        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecMarketing')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field"><label htmlFor="fa-nameTh">{t('pdNameTh')} *</label><input id="fa-nameTh" value={d.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="fa-nameEn">{t('pdNameEn')}</label><input id="fa-nameEn" value={d.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
            <div className="field"><label htmlFor="fa-tagTh">{t('pdTagTh')}</label><input id="fa-tagTh" value={d.tagTh} onChange={(e) => set('tagTh', e.target.value)} /></div>
            <div className="field"><label htmlFor="fa-tagEn">{t('pdTagEn')}</label><input id="fa-tagEn" value={d.tagEn} onChange={(e) => set('tagEn', e.target.value)} /></div>
            <div className="field top"><label htmlFor="fa-hlTh">{t('pdHlTh')}</label><textarea id="fa-hlTh" rows={3} value={d.highlightsTh.join('\n')} onChange={(e) => set('highlightsTh', e.target.value.split('\n'))} onBlur={() => set('highlightsTh', lines(d.highlightsTh.join('\n')))} /></div>
            <div className="field top"><label htmlFor="fa-hlEn">{t('pdHlEn')}</label><textarea id="fa-hlEn" rows={3} value={d.highlightsEn.join('\n')} onChange={(e) => set('highlightsEn', e.target.value.split('\n'))} onBlur={() => set('highlightsEn', lines(d.highlightsEn.join('\n')))} /></div>
            <div className="field">
              <label htmlFor="fa-occ">{t('faOccupancy')}</label>
              <select id="fa-occ" value={d.occupancy} onChange={(e) => set('occupancy', e.target.value as FireOccupancy)}>
                <option value="home">{t('fiHome')}</option>
                <option value="shop">{t('fiShop')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fa-badge">{t('pdBadge')}</label>
              <select id="fa-badge" value={d.badge ?? ''} onChange={(e) => set('badge', (e.target.value || undefined) as FireProduct['badge'])}>
                <option value="">—</option>
                <option value="recommended">{t('pdBadgeRec')}</option>
                <option value="new">{t('pdBadgeNew')}</option>
              </select>
            </div>
            <div className="field">
              <span className="field-label">{t('pdOnSaleTo')}</span>
              <div className="pd-inline">
                <label className="check"><input id="fa-ch-self" type="checkbox" checked={d.channels.self} onChange={(e) => set('channels', { ...d.channels, self: e.target.checked })} /> {t('pdChSelf')}</label>
                <label className="check"><input id="fa-ch-partner" type="checkbox" checked={d.channels.partner} onChange={(e) => set('channels', { ...d.channels, partner: e.target.checked })} /> {t('pdChPartner')}</label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="fa-until">{t('pdSaleUntil')}</label>
              <DateInput id="fa-until" value={d.saleUntil ?? ''} onChange={(v) => set('saleUntil', v || undefined)} />
            </div>
          </div>
        </section>

        {d.mode === 'rate' ? (
          <section className="card pd-sec">
            <div className="pd-sec-head"><div><h4>{t('faRates')}</h4></div></div>
            <div className="form-grid pair">
              {CONSTRUCTIONS.map((c: Construction) => num(`fa-rate-${c}`, t(CONSTRUCTION_KEY[c]), d.rates[c], (v) => set('rates', { ...d.rates, [c]: v })))}
              {num('fa-min', t('faMinPremium'), d.minPremium, (v) => set('minPremium', v))}
            </div>
            <h4 className="fa-sub">{t('faPerilRates')}</h4>
            <div className="form-grid pair">
              {PERILS.map((p: FirePeril) => num(`fa-prate-${p}`, t(PERIL_KEY[p]), d.perilRates[p], (v) => set('perilRates', { ...d.perilRates, [p]: v })))}
            </div>
          </section>
        ) : (
          <section className="card pd-sec">
            <div className="pd-sec-head"><div><h4>{t('faPlanSums')}</h4></div></div>
            <div className="form-grid pair">
              {num('fa-pbsi', t('fiBuildingSi'), d.planBuildingSi, (v) => set('planBuildingSi', v))}
              {num('fa-pcsi', t(d.occupancy === 'shop' ? 'fiStockSi' : 'fiContentsSi'), d.planContentsSi, (v) => set('planContentsSi', v))}
              {num('fa-pprice', t('faPlanPrice'), d.planPrice, (v) => set('planPrice', v))}
            </div>
            <h4 className="fa-sub">{t('faPerilPrices')}</h4>
            <div className="form-grid pair">
              {PERILS.map((p: FirePeril) => num(`fa-pprice-${p}`, t(PERIL_KEY[p]), d.perilPrices[p], (v) => set('perilPrices', { ...d.perilPrices, [p]: v })))}
            </div>
          </section>
        )}

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('faPerilsOffered')}</h4></div></div>
          <div className="pd-inline">
            {PERILS.map((p) => (
              <label key={p} className="check"><input id={`fa-offer-${p}`} type="checkbox" checked={d.perils.includes(p)} onChange={(e) => set('perils', e.target.checked ? [...d.perils, p] : d.perils.filter((x) => x !== p))} /> {t(PERIL_KEY[p])}</label>
            ))}
          </div>
          <div className="form-grid pair">
            <div className="field">
              <label htmlFor="fa-com">{t('agCommission')} (%)</label>
              <NumberInput id="fa-com" value={d.commission} placeholder={t('taComStd', { pct: FIRE_COMMISSION })} onChange={(v) => set('commission', v)} />
            </div>
          </div>
        </section>

        <section className="card pd-sec">
          <div className="pd-sec-head"><div><h4>{t('pdSecTerms')}</h4></div></div>
          <div className="form-grid pair">
            <div className="field top"><label htmlFor="fa-termsTh">{t('pdTermsTh')}</label><textarea id="fa-termsTh" rows={3} value={d.termsTh} onChange={(e) => set('termsTh', e.target.value)} /></div>
            <div className="field top"><label htmlFor="fa-exTh">{t('pdExclTh')}</label><textarea id="fa-exTh" rows={3} value={d.exclusionsTh.join('\n')} onChange={(e) => set('exclusionsTh', e.target.value.split('\n'))} onBlur={() => set('exclusionsTh', lines(d.exclusionsTh.join('\n')))} /></div>
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
                    <button type="button" className="btn small ghost" onClick={() => { if (window.confirm(t('pdRollbackAsk', { ver: v.ver }))) { rollbackFireProduct(d.id, v.ver, staffId); onClose(); } }}>{t('pdRollback')}</button>
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
        <input id="fa-note" className="pd-note" value={note} placeholder={t('pdNotePh')} aria-label={t('pdNote')} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn ghost" disabled={!dirty} onClick={() => { setD(structuredClone(base)); setFlash(''); }}>{t('pdDiscard')}</button>
        <button type="button" className="btn primary" disabled={!dirty} onClick={save}>{t('pdSave')}</button>
      </div>
    </section>
  );
}
