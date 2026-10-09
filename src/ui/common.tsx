import { useEffect, useState, type ReactNode } from 'react';
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
