import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Case, CoverageType, Status } from '../types';
import { COVERAGE_LABEL, SLA_LABEL, SLA_STATE_LABEL, STATUS_LABEL, fmtMinutes, useT } from '../i18n';
import { activeSla, type SlaResult } from '../lib/sla';
import { isBusinessTime } from '../lib/time';

export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const STATUS_TONE: Record<Status, string> = {
  NEW: 'info',
  AWAITING_PAYMENT: 'wait',
  ACCEPTED: 'neutral',
  QUOTED: 'neutral',
  AWAITING_DOCS: 'wait',
  DOCS_REVIEW: 'info',
  ISSUED: 'good',
  CANCELLED: 'muted',
};

export function StatusPill({ status }: { status: Status }) {
  const { lang } = useT();
  return <span className={`pill tone-${STATUS_TONE[status]}`}>{STATUS_LABEL[lang][status]}</span>;
}

export function TypeTag({ type }: { type: CoverageType }) {
  const { lang } = useT();
  return <span className={`type-tag type-${type}`}>{COVERAGE_LABEL[lang][type]}</span>;
}

const SLA_ICON: Record<string, string> = { met: '✓', breached: '!', running: '◷', atRisk: '◔', overdue: '!' };
const SLA_TONE: Record<string, string> = { met: 'good', breached: 'bad', running: 'neutral', atRisk: 'warn', overdue: 'bad' };

export function SlaChip({ r, withName = true }: { r: SlaResult; withName?: boolean }) {
  const { lang } = useT();
  const left = r.target - r.used;
  const detail = r.done ? fmtMinutes(r.used, lang) : left >= 0 ? `${lang === 'th' ? 'เหลือ' : ''} ${fmtMinutes(left, lang)}${lang === 'th' ? '' : ' left'}` : `+${fmtMinutes(-left, lang)}`;
  return (
    <span className={`sla-chip tone-${SLA_TONE[r.state]}`} title={`${SLA_LABEL[lang][r.key]} · ${SLA_STATE_LABEL[lang][r.state]}`}>
      <span aria-hidden="true" className="sla-icon">{SLA_ICON[r.state]}</span>
      {withName && <span>{SLA_LABEL[lang][r.key]}</span>}
      <span className="num">{detail.trim()}</span>
    </span>
  );
}

export function CaseSla({ c, now }: { c: Case; now: number }) {
  const r = activeSla(c, now);
  if (!r) return <span className="muted">—</span>;
  return <SlaChip r={r} />;
}

export function BizClock({ now }: { now: number }) {
  const { t } = useT();
  if (isBusinessTime(now)) return null;
  return <span className="paused-note">◑ {t('slaPaused')}</span>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  id,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  id: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} id={id}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, error, children, hint, htmlFor }: { label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; htmlFor: string }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}

export interface Toast {
  id: string;
  text: string;
  tone?: 'info' | 'bad' | 'good';
  onClick?: () => void;
}

export function Toasts({ items, dismiss }: { items: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((x) => (
        <div key={x.id} className={`toast tone-${x.tone ?? 'info'}`}>
          <button type="button" className="toast-body" onClick={() => { x.onClick?.(); dismiss(x.id); }}>
            {x.text}
          </button>
          <button type="button" className="toast-x" aria-label="close" onClick={() => dismiss(x.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export const SOURCE_KEY = { package: 'srcPackage', quote: 'srcQuote', self: 'srcSelf' } as const;

const groupDigits = (s: string) => {
  const [int, frac] = s.split('.');
  const g = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac === undefined ? g : `${g}.${frac}`;
};
const fmtGrouped = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? '' : groupDigits(String(v)));

/**
 * Number field shown with thousands separators (1,000,000) while typing.
 * Accepts pasted values with commas or spaces; reports undefined when empty.
 */
export function NumberInput({
  value,
  onChange,
  onBlur,
  decimals = true,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'onBlur'> & {
  value: number | undefined;
  onChange?: (v: number | undefined) => void;
  onBlur?: (v: number | undefined) => void;
  decimals?: boolean;
}) {
  const [text, setText] = useState(() => fmtGrouped(value));
  // Follow changes made elsewhere (standard cover button, rollback) without fighting the user's typing.
  useEffect(() => {
    const cur = text.replace(/,/g, '');
    if ((cur === '' ? undefined : Number(cur)) !== value) setText(fmtGrouped(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const parse = (s: string) => (s === '' || s === '.' ? undefined : Number(s));
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => {
        const el = e.target;
        const caret = el.selectionStart ?? el.value.length;
        const digitsBefore = el.value.slice(0, caret).replace(/[^\d.]/g, '').length;
        let clean = el.value.replace(/[^\d.]/g, '');
        if (!decimals) clean = clean.replace(/\./g, '');
        const dot = clean.indexOf('.');
        if (dot >= 0) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '');
        const next = groupDigits(clean);
        setText(next);
        onChange?.(parse(clean));
        // Keep the caret after the same digit once commas move around.
        requestAnimationFrame(() => {
          let seen = 0;
          let pos = 0;
          while (pos < next.length && seen < digitsBefore) {
            if (/[\d.]/.test(next[pos])) seen++;
            pos++;
          }
          if (document.activeElement === el) el.setSelectionRange(pos, pos);
        });
      }}
      onBlur={() => onBlur?.(parse(text.replace(/,/g, '')))}
    />
  );
}

/** YYYY-MM-DD → dd/mm/yyyy (empty stays empty). */
export const toDmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** dd/mm/yyyy (or YYYY-MM-DD) → YYYY-MM-DD when it is a real date, else null. */
export function fromDmy(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [y, mo, d] = m ? [m[1], m[2], m[3]] : (m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)) ? [m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0')] : [];
  if (!y) return null;
  const iso = `${y}-${mo}-${d}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * Date field that always reads dd/mm/yyyy, whatever the browser's language (the native date input
 * follows the device locale). Typing adds the slashes; the calendar button opens the native picker.
 * The value in and out is YYYY-MM-DD; '' while the text is not a whole, real date.
 */
export function DateInput({ id, value, onChange, min, max, invalid, 'aria-label': ariaLabel }: { id: string; value: string; onChange: (iso: string) => void; min?: string; max?: string; invalid?: boolean; 'aria-label'?: string }) {
  const [text, setText] = useState(() => toDmy(value));
  const picker = useRef<HTMLInputElement>(null);
  // Follow the value when it changes from outside (sample data, reset), not while it matches what is typed.
  useEffect(() => {
    if (fromDmy(text) !== value && (value || fromDmy(text) !== null)) setText(toDmy(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const type = (raw: string) => {
    let v = raw;
    // Auto-insert the slashes while typing digits: 15 → 15/, 1505 → 15/05/.
    if (/^\d{2}$/.test(raw) && raw.length > text.length) v = `${raw}/`;
    else if (/^\d{2}\/\d{2}$/.test(raw) && raw.length > text.length) v = `${raw}/`;
    else if (/^\d{8}$/.test(raw)) v = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    setText(v);
    const iso = fromDmy(v);
    onChange(iso ?? '');
  };
  return (
    <div className={`date-input${invalid ? ' invalid' : ''}`}>
      <input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} value={text} aria-label={ariaLabel} aria-invalid={invalid || undefined}
        onChange={(e) => type(e.target.value)}
        onBlur={() => { const iso = fromDmy(text); if (iso) setText(toDmy(iso)); }} />
      <button type="button" className="date-pick" aria-label="📅" tabIndex={-1} onClick={() => { const el = picker.current; if (!el) return; try { el.showPicker(); } catch { el.focus(); } }}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm12 8H5v9h14v-9ZM5 6v2h14V6H5Z" /></svg>
      </button>
      <input ref={picker} className="date-native" type="date" tabIndex={-1} aria-hidden="true" value={value} min={min} max={max} onChange={(e) => { setText(toDmy(e.target.value)); onChange(e.target.value); }} />
    </div>
  );
}
