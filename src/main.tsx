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
import { OfferPage, openOffer } from './ui/Offer';
import { AGENTS, MARKETING } from './data/agents';
import { Toasts, type Toast } from './ui/common';
import { STAFF } from './data/vehicles';

type View = 'customer' | 'agent' | 'marketing' | 'backoffice' | 'dashboard' | 'mail' | 'split' | 'offer';
const VIEWS: View[] = ['customer', 'agent', 'marketing', 'backoffice', 'dashboard', 'mail', 'split'];
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
  const [agentId, setAgentId] = useState(() => read('abc-agent') ?? AGENTS[0].id);
  const [mktId, setMktId] = useState(() => read('abc-mkt') ?? MARKETING[0].id);
  const [staffId, setStaffId] = useState(() => read('abc-staff') ?? STAFF[0].id);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
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
  useEffect(() => write('abc-staff', staffId), [staffId]);
  useEffect(() => write('abc-agent', agentId), [agentId]);
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
  const nav: [View, Parameters<typeof translate>[1]][] = [
    ['customer', 'navCustomer'],
    ['agent', 'navAgent'],
    ['marketing', 'navMkt'],
    ['backoffice', 'navBack'],
    ['dashboard', 'navDash'],
    ['mail', 'navMail'],
    ['split', 'navSplit'],
  ];

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
          {nav.map(([v, k]) => (
            <button key={v} type="button" className={`${view === v ? 'on' : ''} nav-${v}`} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
              {t(k)}
              {v === 'backoffice' && unread > 0 && <span className="nav-badge num">{unread > 99 ? '99+' : unread}</span>}
            </button>
          ))}
        </nav>
        <div className="top-tools">
          <div className="lang-switch" role="radiogroup" aria-label="language">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="btn small ghost" onClick={() => setConfirmReset((v) => !v)}>{t('reset')}</button>
        </div>
      </header>
      {confirmReset && (
        <div className="reset-bar" role="alertdialog">
          <span>{t('resetConfirm')}</span>
          <button type="button" className="btn small danger" onClick={async () => { await resetDemo(); setConfirmReset(false); setFocusId(null); setTrackId(null); }}>{t('resetYes')}</button>
          <button type="button" className="btn small ghost" onClick={() => setConfirmReset(false)}>{t('cancel')}</button>
        </div>
      )}

      <main className={`main view-${view}`}>
        {view === 'offer' && offer && <OfferPage key={`${offer.id}-${offer.asAgent}`} id={offer.id} asAgent={offer.asAgent} print={offer.print} onBack={() => setView(beforeOffer === 'offer' ? 'customer' : beforeOffer)} />}
        {view === 'agent' && <AgentApp agentId={agentId} setAgentId={setAgentId} onOpenOffer={(id, asAgent) => openOffer(id, asAgent)} />}
        {view === 'marketing' && <MarketingApp mktId={mktId} setMktId={setMktId} />}
        {view === 'customer' && <CustomerApp trackId={trackId} setTrackId={openTrack} onOpenCase={openCase} onPartner={(id) => { setAgentId(id); setView('agent'); }} />}
        {view === 'backoffice' && <BackOffice staffId={staffId} setStaffId={setStaffId} focusId={focusId} setFocusId={setFocusId} />}
        {view === 'dashboard' && <Dashboard onOpenCase={openCase} />}
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
