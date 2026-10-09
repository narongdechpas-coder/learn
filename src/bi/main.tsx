import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CHANNELS, CY, DEFAULT_FILTERS, FIRST_YEAR, LATEST, PRODUCTS, REGIONS, type Filters, type PeriodMode } from './data';
import { buildItems, resolve } from './ops';
import { computeAlerts } from './alerts';
import { LangContext, monthLabel, useL, type Lang } from './lang';
import { BiContext, LENS, LensIcon, Seg, useDimLabels, type View } from './shared';
import { Strategic } from './views/Strategic';
import { Operational } from './views/Operational';
import { Tactical } from './views/Tactical';
import { Analytical } from './views/Analytical';

const VIEWS: View[] = ['strategic', 'operational', 'tactical', 'analytical'];

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

function App() {
  const [lang, setLangState] = useState<Lang>(() => load('bi.lang', 'th'));
  const setLang = (l: Lang) => { setLangState(l); save('bi.lang', l); };
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Shell />
    </LangContext.Provider>
  );
}

function Shell() {
  const { L, lang, setLang } = useL();
  const dim = useDimLabels();
  const [view, setView] = useState<View>(() => {
    const h = location.hash.slice(1) as View;
    return VIEWS.includes(h) ? h : load<View>('bi.view', 'strategic');
  });
  const [flt, setFlt] = useState<Filters>(DEFAULT_FILTERS);
  const [focus, setFocus] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>(() => load('bi.theme', 'auto'));
  const [anchor] = useState(() => Date.now());
  const [now, setNow] = useState(anchor);
  const items = useMemo(() => buildItems(anchor), [anchor]);
  const ops = useMemo(() => resolve(items, now), [items, now]);
  const alerts = useMemo(() => computeAlerts(flt, ops, now, lang), [flt, ops, now, lang]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    save('bi.theme', theme);
  }, [theme]);
  useEffect(() => {
    save('bi.view', view);
    history.replaceState(null, '', `#${view}`);
  }, [view]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1) as View;
      if (VIEWS.includes(h)) setView(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (v: View, patch?: Partial<Filters>, f?: string) => {
    if (patch) setFlt((cur) => ({ ...cur, ...patch }));
    setFocus(f ?? null);
    setView(v);
    setAlertsOpen(false);
    if (!f) window.scrollTo({ top: 0, behavior: 'smooth' });
    else setTimeout(() => document.getElementById(f)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const tabName: Record<View, string> = {
    strategic: L('ผลประกอบการธุรกิจ', 'Business Performance'),
    operational: L('ผลงานฝ่ายปฏิบัติการ', 'Operating Staff'),
    tactical: L('การตลาดและการขาย', 'Marketing & Sales'),
    analytical: L('วิเคราะห์ธุรกิจ', 'Business Analysis'),
  };
  const cyMonths = Array.from({ length: LATEST - (CY - FIRST_YEAR) * 12 + 1 }, (_, i) => (CY - FIRST_YEAR) * 12 + i);
  const filtersActive = flt.product !== 'all' || flt.channel !== 'all' || flt.region !== 'all' || flt.mode !== 'YTD' || flt.asOf !== LATEST;
  const ops2 = view === 'operational';
  const badCount = alerts.filter((a) => a.sev === 'bad').length;

  return (
    <BiContext.Provider value={{ flt, setFlt, go, now, ops, focus }}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><path d="M16 3 5 7v8c0 7 4.7 12 11 14 6.3-2 11-7 11-14V7L16 3Z" fill="var(--accent)" /><path d="M10 20.5v-4m4 4v-7m4 7v-5m4 5v-9" stroke="var(--accent-ink)" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </span>
          <span>
            <b>ABC Insurance BI</b>
            <small>{L('แดชบอร์ด 4 เลนส์ (ข้อมูลจำลอง)', 'Multi-lens dashboard (simulated data)')}</small>
          </span>
        </div>
        <nav className="mainnav" aria-label="lenses">
          {VIEWS.map((v) => (
            <button key={v} type="button" className={view === v ? 'on' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)} style={{ ['--lens' as string]: LENS[v].color }}>
              <span className="tab-lens" aria-hidden="true"><LensIcon kind={LENS[v].icon} size={16} /></span>
              <span className="tab-n">{LENS[v].n}.</span> {tabName[v]}
            </button>
          ))}
        </nav>
        <div className="top-tools">
          <button type="button" className={`bell${alertsOpen ? ' on' : ''}`} onClick={() => setAlertsOpen(!alertsOpen)} aria-expanded={alertsOpen} aria-label={L('รายการแจ้งเตือน', 'Alerts')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" /></svg>
            {alerts.length > 0 && <span className={`nav-badge num${badCount ? '' : ' warn'}`}>{alerts.length}</span>}
          </button>
          <button type="button" className="btn small ghost" onClick={() => window.print()} title={L('พิมพ์ / บันทึกเป็น PDF', 'Print / save as PDF')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" /></svg>
            <span className="hide-sm">{L('พิมพ์/PDF', 'Print/PDF')}</span>
          </button>
          <button type="button" className="btn small ghost theme-btn" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')} title={L('ธีม', 'Theme')} aria-label={`theme: ${theme}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              {theme === 'dark' ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /> : theme === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></>}
            </svg>
          </button>
          <div className="lang-switch" role="radiogroup" aria-label="language">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="filterbar" role="region" aria-label={L('ตัวกรอง', 'Filters')}>
        <div className="fb-inner">
          <div className={`fb-group${ops2 ? ' off' : ''}`} title={ops2 ? L('เลนส์ปฏิบัติการใช้ข้อมูลเรียลไทม์', 'The operational lens is real time') : undefined}>
            <Seg label="period" value={flt.mode} onChange={(m: PeriodMode) => setFlt({ ...flt, mode: m })} options={[{ value: 'MTD', label: 'MTD' }, { value: 'QTD', label: 'QTD' }, { value: 'YTD', label: 'YTD' }]} />
            <select aria-label={L('ณ เดือน', 'As of month')} value={flt.asOf} onChange={(e) => setFlt({ ...flt, asOf: Number(e.target.value) })} disabled={ops2}>
              {cyMonths.map((m) => <option key={m} value={m}>{L('ณ', 'as of')} {monthLabel(m, lang)}</option>)}
            </select>
          </div>
          <select aria-label={L('สายผลิตภัณฑ์', 'Product line')} value={flt.product} onChange={(e) => setFlt({ ...flt, product: e.target.value as Filters['product'] })} className={flt.product !== 'all' ? 'set' : ''}>
            <option value="all">{L('ทุกสายผลิตภัณฑ์', 'All product lines')}</option>
            {PRODUCTS.map((p) => <option key={p} value={p}>{dim.product(p)}</option>)}
          </select>
          <select aria-label={L('ช่องทาง', 'Channel')} value={flt.channel} onChange={(e) => setFlt({ ...flt, channel: e.target.value as Filters['channel'] })} className={flt.channel !== 'all' ? 'set' : ''}>
            <option value="all">{L('ทุกช่องทาง', 'All channels')}</option>
            {CHANNELS.map((c) => <option key={c} value={c}>{dim.channel(c)}</option>)}
          </select>
          <select aria-label={L('ภูมิภาค', 'Region')} value={flt.region} onChange={(e) => setFlt({ ...flt, region: e.target.value as Filters['region'] })} className={flt.region !== 'all' ? 'set' : ''} disabled={ops2}>
            <option value="all">{L('ทุกภูมิภาค', 'All regions')}</option>
            {REGIONS.map((r) => <option key={r} value={r}>{dim.region(r)}</option>)}
          </select>
          {filtersActive && <button type="button" className="link" onClick={() => setFlt(DEFAULT_FILTERS)}>{L('ล้างตัวกรอง', 'Reset filters')}</button>}
        </div>
      </div>

      {alertsOpen && (
        <aside className="alerts" aria-label={L('รายการแจ้งเตือน', 'Alerts')}>
          <div className="alerts-head">
            <div>
              <h3>{L('รายการต้องดำเนินการ', 'Action center')}</h3>
              <p className="hint">{L('KPI สีแดง/เหลือง และงานเกิน SLA ตามตัวกรองปัจจุบัน พร้อม Action ที่แนะนำ', 'Red/amber KPIs and SLA breaches under the current filters, with suggested actions')}</p>
            </div>
            <button type="button" className="btn small ghost" onClick={() => setAlertsOpen(false)} aria-label={L('ปิด', 'Close')}>✕</button>
          </div>
          <ul>
            {alerts.map((a) => (
              <li key={a.id} className={`alert sev-${a.sev}`}>
                <span className={`signal small sig-${a.sev}`} aria-hidden="true">!</span>
                <div>
                  <p className="alert-title">{a.title}</p>
                  <p className="hint">{a.detail} · <span className="lens-chip" style={{ ['--lens' as string]: LENS[a.view].color }}>{tabName[a.view]}</span></p>
                  <p className="alert-action">→ {a.action}</p>
                </div>
                <button type="button" className="btn small" onClick={() => go(a.view, a.patch, a.focus)}>{L('ดู', 'Open')}</button>
              </li>
            ))}
            {!alerts.length && <li className="empty-ok">✓ {L('ทุกตัวชี้วัดอยู่ในเกณฑ์', 'All indicators on track')}</li>}
          </ul>
        </aside>
      )}

      <main className="main bi-main">
        <p className="print-only print-meta">{tabName[view]} · {flt.mode} {monthLabel(flt.asOf, lang)}</p>
        {view === 'strategic' && <Strategic />}
        {view === 'operational' && <Operational />}
        {view === 'tactical' && <Tactical />}
        {view === 'analytical' && <Analytical />}
      </main>
      <footer className="foot">
        {L('ข้อมูลทั้งหมดเป็นข้อมูลจำลองเพื่อการสาธิต · เกณฑ์สี: เขียว ≥95% · เหลือง 85–95% · แดง <85% ของเป้า/SLA (อัตราส่วนที่ยิ่งต่ำยิ่งดีใช้ แผน ÷ ผลจริง)',
          'All figures are simulated for demonstration · RAG: green ≥95% · amber 85–95% · red <85% of target/SLA (lower-is-better ratios use plan ÷ actual)')}
      </footer>
    </BiContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
