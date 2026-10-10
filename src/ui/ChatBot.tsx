import { Fragment, useEffect, useRef, useState } from 'react';
import { useT, type TKey } from '../i18n';
import { buildKnowledge } from '../lib/kb';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  /** A notice from the page itself (offline, error, privacy): shown, never sent to the model. */
  local?: boolean;
}

/** The chatbot endpoint (a Netlify function); file:// pages and the offline copy cannot reach it. */
export const CHAT_URL = '/api/chat';

// Thai ID card (13 digits), phone numbers and passport-like codes stay out of the chat.
const PII = /(\d[\s-]?){13}|\b0\d{1,2}[\s-]?\d{3}[\s-]?\d{4}\b|\b[A-Z]{1,2}\d{6,8}\b/i;

/** **bold**, and "- " lines as a list. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') && x.endsWith('**') ? <b key={i}>{x.slice(2, -2)}</b> : <Fragment key={i}>{x}</Fragment>));
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-•*]\s+(.*)$/);
    if (m) list.push(m[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

/** Customer chatbot: answers product questions with Claude, from the catalogue on sale right now. */
export function ChatBot() {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [human, setHuman] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  // Keep the newest message in view (scrolls the chat log only, never the page).
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [msgs, busy, open]);

  const notice = (k: TKey) => setMsgs((m) => [...m, { role: 'assistant', content: t(k), local: true }]);

  const ask = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    setText('');
    if (PII.test(q)) return setMsgs((m) => [...m, { role: 'user', content: q, local: true }, { role: 'assistant', content: t('cbPii'), local: true }]);
    const next = [...msgs, { role: 'user' as const, content: q }];
    setMsgs(next);
    if (!/^https?:$/.test(location.protocol)) return notice('cbOffline');
    // Only the real conversation goes to the model (local notices are left out), most recent 10 turns.
    const convo = next.filter((m) => !m.local).slice(-19);
    while (convo.length && convo[0].role !== 'user') convo.shift();
    setBusy(true);
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: convo.map(({ role, content }) => ({ role, content })), knowledge: buildKnowledge(), lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.text === 'string') setMsgs((m) => [...m, { role: 'assistant', content: data.text }]);
      else if (data.error === 'upstream' && (data.status || data.detail)) {
        // Say why the API refused (wrong key, no credit, model not available) so it can be fixed.
        const why = data.status === 401 ? t('cbErrKey') : /credit/i.test(data.detail ?? '') ? t('cbErrCredit') : data.status === 404 ? t('cbErrModel') : '';
        setMsgs((m) => [...m, { role: 'assistant', content: `${t('cbError')}\n${why ? `${why} ` : ''}(${data.status ?? ''} ${data.detail ?? ''})`.trim(), local: true }]);
      } else notice(data.error === 'not_configured' ? 'cbNotSet' : data.error === 'rate_limited' ? 'cbBusy' : res.status === 404 ? 'cbOffline' : 'cbError');
    } catch {
      notice('cbOffline');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      {open && (
        <div className="chat-panel chatbot" role="dialog" aria-label={t('cbTitle')}>
          <div className="cb-head">
            <span className="cb-avatar" aria-hidden="true">J</span>
            <div>
              <b>{t('cbTitle')} <span className="cb-badge">{t('cbBadge')}</span></b>
              <div className="hint">{t('cbLead')}</div>
            </div>
            {msgs.length > 0 && <button type="button" className="link cb-clear" onClick={() => setMsgs([])}>{t('cbClear')}</button>}
          </div>
          <div className="cb-log" aria-live="polite" ref={log}>
            <div className="cb-msg bot"><Rich text={t('cbHello')} /></div>
            {msgs.map((m, i) => (
              <div key={i} className={`cb-msg ${m.role === 'user' ? 'me' : 'bot'}${m.local ? ' local' : ''}`}>
                {m.role === 'user' ? m.content : <Rich text={m.content} />}
              </div>
            ))}
            {busy && <div className="cb-msg bot typing"><span className="spinner" aria-hidden="true" /> {t('cbThinking')}</div>}
            {!msgs.length && (
              <div className="cb-chips">
                {(['cbQ1', 'cbQ2', 'cbQ3'] as const).map((k) => (
                  <button key={k} type="button" className="filter-chip" onClick={() => ask(t(k))}>{t(k)}</button>
                ))}
              </div>
            )}
          </div>
          <form className="cb-form" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
            <label htmlFor="cb-input" className="sr-only">{t('cbPh')}</label>
            <input id="cb-input" value={text} maxLength={500} placeholder={t('cbPh')} autoComplete="off" onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="btn primary small" disabled={busy || !text.trim()}>{t('cbSend')}</button>
          </form>
          <div className="cb-foot">
            <button type="button" className="link" aria-expanded={human} onClick={() => setHuman((v) => !v)}>{t('cbHuman')}</button>
            {human && (
              <ul>
                <li><span className="chat-ico line" aria-hidden="true">L</span> LINE <b>@jacky-demo</b></li>
                <li><span className="chat-ico" aria-hidden="true">☎</span> <b className="num">02-000-0000</b> · {t('chatLead')}</li>
              </ul>
            )}
            <p className="hint">{t('cbNote')}</p>
          </div>
        </div>
      )}
      <button type="button" className="chat-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 6.5a1.5 1.5 0 1 0 0 .01Zm5 0a1.5 1.5 0 1 0 0 .01Zm5 0a1.5 1.5 0 1 0 0 .01Z" /></svg>
        <span>{open ? t('close') : t('cbTitle')}</span>
      </button>
    </div>
  );
}
