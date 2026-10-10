import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Lang } from './types';
import { LangContext, translate } from './i18n';
import { checkSlaBreaches, getState, resetDemo, useStore } from './store';
import { CustomerApp } from './ui/Customer';
import { BackOffice, notifText } from './ui/BackOffice';
import { Dashboard } from './ui/Dashboard';
import { Mail } from './ui/Mail';
import { AgentApp } from './ui/Agent';
import { MarketingApp } from './ui/Marketing';
import { VPApp } from './ui/VP';
import { OfferPage, openOffer } from './ui/Offer';
import { AGENTS, MARKETING, payInfo } from './data/agents';
import { Toasts, type Toast } from './ui/common';
import { STAFF } from './data/vehicles';
import { ProductsAdmin } from './ui/Products';
import { TravelAdmin } from './ui/TravelAdmin';

type View = 'customer' | 'agent' | 'marketing' | 'vp' | 'backoffice' | 'leads' | 'remit' | 'products' | 'travel' | 'dashboard' | 'mail' | 'split' | 'offer';
const VIEWS: View[] = ['customer', 'agent', 'marketing', 'vp', 'backoffice', 'leads', 'remit', 'products', 'travel', 'dashboard', 'mail', 'split'];
type NavKey = Parameters<typeof translate>[1];
/** ABC's own screens, grouped by the work they are for (left-hand menu). */
const ABC_GROUPS: [NavKey, [View, NavKey][]][] = [
  ['navGroupOps', [['backoffice', 'inbox'], ['leads', 'tabLeads'], ['remit', 'tabRemit']]],
  ['navGroupProduct', [['products', 'navPackages'], ['travel', 'navTravel']]],
  ['navGroupPartner', [['marketing', 'navMkt'], ['vp', 'navVp']]],
  ['navGroupReport', [['dashboard', 'navDash']]],
];
const ABC_VIEWS = ABC_GROUPS.flatMap(([, items]) => items.map(([v]) => v));
const isAbc = (v: View) => ABC_VIEWS.includes(v);
type OfferView = { id: string; asAgent: boolean; print: boolean };
const hashOffer = (): OfferView | null => {
  const m = typeof location !== 'undefined' ? /^#offer\/([\w-]+)/.exec(location.hash) : null;
  return m ? { id: m[1], asAgent: false, print: false } : null;
};

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

function App() {
  const [lang, setLangState] = useState<Lang>(() => (read('abc-lang') === 'en' ? 'en' : 'th'));
  const [view, setViewState] = useState<View>(() => {
    if (hashOffer()) return 'offer';
    const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '') as View;
    return VIEWS.includes(h) ? h : 'customer';
  });
  const [offer, setOffer] = useState<OfferView | null>(hashOffer);
  const [beforeOffer, setBeforeOffer] = useState<View>('customer');
  // Signed-in Business Partner for this tab (code + OTP from the customer page); no session, no partner screen.
  const [partnerId, setPartnerIdState] = useState<string | null>(() => {
    try {
      const id = sessionStorage.getItem('abc-partner');
      return id && AGENTS.some((a) => a.id === id) ? id : null;
    } catch {
      return null;
    }
  });
  const setPartnerId = (id: string | null) => {
    setPartnerIdState(id);
    try {
      if (id) sessionStorage.setItem('abc-partner', id);
      else sessionStorage.removeItem('abc-partner');
    } catch {
      /* ignore */
    }
  };
  const [mktId, setMktId] = useState(() => read('abc-mkt') ?? MARKETING[0].id);
  const [staffId, setStaffId] = useState(() => read('abc-staff') ?? STAFF[0].id);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(() => read('abc-side') !== '0');
  const toggleSide = () => setSideOpen((v) => (write('abc-side', v ? '0' : '1'), !v));
  const [lastAbc, setLastAbc] = useState<View>(() => (isAbc(view) ? view : 'backoffice'));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const s = useStore();
  const seen = useRef<Set<string>>(new Set(getState().notifications.map((n) => n.id)));
  const t = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, k, p);

  const setLang = (l: Lang) => {
    setLangState(l);
    write('abc-lang', l);
    document.documentElement.lang = l;
  };
  const setView = (v: View) => {
    setViewState(v);
    if (isAbc(v)) setLastAbc(v);
    setToolsOpen(false);
    try {
      history.replaceState(null, '', `#${v}`);
    } catch {
      /* ignore */
    }
  };
  const openCase = (id: string) => {
    setFocusId(id);
    if (view !== 'split') setView('backoffice');
  };
  const openTrack = (id: string | null) => {
    setTrackId(id);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // The side panel sits right under the top bar, whose height changes with wrapping and language.
  useEffect(() => {
    const bar = document.querySelector('.topbar');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  // The demo tools menu closes on any click outside it, or Escape.
  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (e: MouseEvent) => !(e.target as Element).closest('.tools-wrap') && setToolsOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setToolsOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen]);
  useEffect(() => write('abc-staff', staffId), [staffId]);
  useEffect(() => write('abc-mkt', mktId), [mktId]);
  // Quotations open from anywhere (agent screens, share box) as their own page.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<OfferView>).detail;
      setOffer(d);
      setViewState((v) => {
        if (v !== 'offer') setBeforeOffer(v);
        return 'offer';
      });
      try {
        history.replaceState(null, '', `#offer/${d.id}`);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('abc-open-offer', onOpen);
    return () => window.removeEventListener('abc-open-offer', onOpen);
  }, []);

  // Pop a toast for every notification that arrives while the page is open (from this tab or another).
  useEffect(() => {
    const fresh = s.notifications.filter((n) => !seen.current.has(n.id));
    if (!fresh.length) return;
    fresh.forEach((n) => seen.current.add(n.id));
    setToasts((cur) => [
      ...fresh.slice(0, 3).map((n) => ({
        id: n.id,
        text: notifText(n, lang, t),
        tone: (n.kind === 'sla' ? 'bad' : 'info') as Toast['tone'],
        onClick: () => openCase(n.caseId),
      })),
      ...cur,
    ].slice(0, 4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.notifications]);
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((cur) => cur.slice(0, -1)), 7000);
    return () => clearTimeout(id);
  }, [toasts]);

  useEffect(() => {
    checkSlaBreaches();
    const id = setInterval(checkSlaBreaches, 30000);
    return () => clearInterval(id);
  }, []);

  const unread = s.notifications.filter((n) => !n.read).length;
  const now = Date.now();
  const badges: Partial<Record<View, number>> = {
    backoffice: unread,
    leads: s.leads.filter((l) => !l.caseId && !l.contacted).length,
    remit: s.cases.filter((c) => c.collect === 'agent' && c.stamps.issued && !c.remittedAt && payInfo(c, now)?.state === 'overdue').length,
  };
  const badge = (n?: number) => (n ? <span className="nav-badge num">{n > 99 ? '99+' : n}</span> : null);
  const boTab = view === 'leads' ? 'leads' : view === 'remit' ? 'remit' : 'cases';
  const backOffice = (
    <BackOffice
      staffId={staffId}
      setStaffId={setStaffId}
      focusId={focusId}
      setFocusId={setFocusId}
      tab={boTab}
      onTab={(tb) => setView(tb === 'cases' ? 'backoffice' : tb)}
    />
  );

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><path d="M16 3 5 7v8c0 7 4.7 12 11 14 6.3-2 11-7 11-14V7L16 3Z" fill="var(--accent)" /><path d="M10.5 18.5h11l-1.4-4.2a2 2 0 0 0-1.9-1.3h-4.4a2 2 0 0 0-1.9 1.3L10.5 18.5Zm0 0v2.5m11-2.5v2.5" stroke="var(--accent-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span>
            <b>{t('appName')}</b>
            <small>{t('appSub')}</small>
          </span>
        </div>
        <nav className="mainnav" aria-label="main">
          <button type="button" className={`${view === 'customer' || view === 'agent' ? 'on' : ''} nav-customer`} aria-current={view === 'customer' ? 'page' : undefined} onClick={() => setView('customer')}>
            {t('navCustomer')}
          </button>
          <button type="button" className={`${isAbc(view) ? 'on' : ''} nav-abc`} aria-current={isAbc(view) ? 'page' : undefined} onClick={() => setView(lastAbc)}>
            {t('navAbc')}
            {badge(unread)}
          </button>
        </nav>
        <div className="top-tools">
          <div className="lang-switch" role="radiogroup" aria-label="language">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="tools-wrap">
            <button type="button" className={`btn small ghost nav-tools${toolsOpen || view === 'mail' || view === 'split' ? ' on' : ''}`} aria-expanded={toolsOpen} aria-haspopup="menu" onClick={() => setToolsOpen((v) => !v)}>
              <span aria-hidden="true">⚙</span> <span className="tools-label">{t('navTools')}</span> ▾
            </button>
            {toolsOpen && (
              <div className="tools-menu" role="menu">
                <button type="button" role="menuitem" className="nav-mail" onClick={() => setView('mail')}>✉ {t('navMail')}</button>
                <button type="button" role="menuitem" className="nav-split" onClick={() => setView('split')}>◫ {t('navSplit')}</button>
                <button type="button" role="menuitem" className="nav-reset" onClick={() => { setToolsOpen(false); setConfirmReset(true); }}>↺ {t('reset')}</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {confirmReset && (
        <div className="reset-bar" role="alertdialog">
          <span>{t('resetConfirm')}</span>
          <button type="button" className="btn small danger" onClick={async () => { await resetDemo(); setConfirmReset(false); setFocusId(null); setTrackId(null); }}>{t('resetYes')}</button>
          <button type="button" className="btn small ghost" onClick={() => setConfirmReset(false)}>{t('cancel')}</button>
        </div>
      )}

      <main className={`main view-${view}${isAbc(view) ? ' abc-full' : ''}`}>
        {view === 'offer' && offer && <OfferPage key={`${offer.id}-${offer.asAgent}`} id={offer.id} asAgent={offer.asAgent} print={offer.print} onBack={() => setView(beforeOffer === 'offer' ? 'customer' : beforeOffer)} />}
        {view === 'agent' && partnerId && <AgentApp agentId={partnerId} onLogout={() => { setPartnerId(null); setView('customer'); }} onOpenOffer={(id, asAgent) => openOffer(id, asAgent)} />}
        {view === 'agent' && !partnerId && <CustomerApp trackId={trackId} setTrackId={openTrack} onOpenCase={openCase} partnerId={null} openLogin onPartner={(id) => setPartnerId(id)} />}

        {view === 'customer' && <CustomerApp trackId={trackId} setTrackId={openTrack} onOpenCase={openCase} partnerId={partnerId} onPartner={(id) => { setPartnerId(id); setView('agent'); }} />}
        {isAbc(view) && (
          <div className={`abc-shell${sideOpen ? '' : ' side-hidden'}`}>
            {!sideOpen && (
              <button type="button" className="side-toggle side-show" aria-expanded={false} aria-controls="abc-side" onClick={toggleSide}>
                <span aria-hidden="true">☰</span> {t('navShowMenu')}
              </button>
            )}
            <aside id="abc-side" className="abc-side" aria-label={t('navAbc')} hidden={!sideOpen}>
              <button type="button" className="side-toggle side-hide" aria-expanded={true} aria-controls="abc-side" onClick={toggleSide}>
                <span aria-hidden="true">«</span> {t('navHideMenu')}
              </button>
              {ABC_GROUPS.map(([g, items]) => (
                <div key={g} className="abc-group">
                  <div className="abc-group-label">{t(g)}</div>
                  {items.map(([v, k]) => (
                    <button key={v} type="button" className={`abc-item nav-${v}${view === v ? ' on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
                      <span>{t(k)}</span>
                      {badge(badges[v])}
                    </button>
                  ))}
                </div>
              ))}
            </aside>
            <div className="abc-main">
              {(view === 'backoffice' || view === 'leads' || view === 'remit') && backOffice}
              {view === 'products' && <ProductsAdmin staffId={staffId} />}
              {view === 'travel' && <TravelAdmin staffId={staffId} />}
              {view === 'marketing' && <MarketingApp mktId={mktId} setMktId={setMktId} />}
              {view === 'vp' && <VPApp />}
              {view === 'dashboard' && <Dashboard onOpenCase={openCase} />}
            </div>
          </div>
        )}
        {view === 'mail' && <Mail onOpenCase={openCase} />}
        {view === 'split' && (
          <div className="split">
            <div className="split-pane">
              <div className="pane-label">{t('navCustomer')}</div>
              <CustomerApp trackId={trackId} setTrackId={openTrack} />
            </div>
            <div className="split-pane">
              <div className="pane-label">{t('navBack')}</div>
              <BackOffice staffId={staffId} setStaffId={setStaffId} focusId={focusId} setFocusId={setFocusId} compact />
            </div>
          </div>
        )}
      </main>
      <footer className="foot">{t('demoNote')}</footer>
      <Toasts items={toasts} dismiss={(id) => setToasts((cur) => cur.filter((x) => x.id !== id))} />
    </LangContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
