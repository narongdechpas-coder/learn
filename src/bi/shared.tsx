import { createContext, useContext, type ReactNode } from 'react';
import { CHANNELS, PRODUCTS, REGIONS, type Filters } from './data';
import type { ItemState } from './ops';
import { CHANNEL_NAME, PRODUCT_NAME, REGION_NAME, name, useL } from './lang';

export type View = 'strategic' | 'operational' | 'tactical' | 'analytical';
export type Go = (view: View, patch?: Partial<Filters>, focus?: string) => void;

export interface Ctx {
  flt: Filters;
  setFlt: (f: Filters) => void;
  go: Go;
  now: number;
  ops: ItemState[];
  /** id of a section to scroll to after a drill-across */
  focus: string | null;
}
export const BiContext = createContext<Ctx>(null as unknown as Ctx);
export const useBi = () => useContext(BiContext);

export const LENS: Record<View, { n: number; color: string; icon: string }> = {
  strategic: { n: 1, color: 'var(--lens-1)', icon: 'telescope' },
  operational: { n: 2, color: 'var(--lens-3)', icon: 'radar' },
  tactical: { n: 3, color: 'var(--lens-2)', icon: 'binoculars' },
  analytical: { n: 4, color: 'var(--lens-4)', icon: 'microscope' },
};

export function LensIcon({ kind, size = 20 }: { kind: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (kind) {
    case 'telescope':
      return <svg {...common}><path d="m4 13 13-6.5 1.6 3.2L5.6 16.2z" /><path d="m17 6.5 2-1 1.6 3.2-2 1" /><path d="M11 13.5 8 21M12 13l3 8M10.5 15.5h3" /></svg>;
    case 'binoculars':
      return <svg {...common}><circle cx="6.5" cy="15.5" r="3.5" /><circle cx="17.5" cy="15.5" r="3.5" /><path d="M3 15V8a2 2 0 0 1 4 0M21 15V8a2 2 0 0 0-4 0M10 14h4M10 14V7h4v7" /></svg>;
    case 'radar':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="M12 12 18.5 5.5" /></svg>;
    default:
      return <svg {...common}><path d="M9 3h4l-1 7h-2z" /><path d="M11 10v3" /><circle cx="11" cy="15" r="2" /><path d="M5 21h14M8 21c-2-1-3-3-3-5a7 7 0 0 1 9-6.7" /></svg>;
  }
}

/** Section heading for a lens: the decision question it answers plus its metadata panel. */
export function LensHeader({ view, title, question, user, freq, detail, children }: { view: View; title: string; question: string; user: string; freq: string; detail: string; children?: ReactNode }) {
  const { L } = useL();
  const l = LENS[view];
  return (
    <header className="lens-head" style={{ ['--lens' as string]: l.color }}>
      <div className="lens-title">
        <span className="lens-mark"><LensIcon kind={l.icon} size={22} /></span>
        <div>
          <p className="eyebrow">{L('เลนส์', 'Lens')} {l.n} · {title}</p>
          <h2>{question}</h2>
        </div>
        {children && <div className="lens-tools">{children}</div>}
      </div>
      <dl className="lens-meta">
        <div><dt>{L('ผู้ใช้หลัก', 'Primary user')}</dt><dd>{user}</dd></div>
        <div><dt>{L('ความถี่', 'Refresh')}</dt><dd>{freq}</dd></div>
        <div><dt>{L('ระดับข้อมูล', 'Level of detail')}</dt><dd>{detail}</dd></div>
      </dl>
    </header>
  );
}

export function Card({ title, sub, tools, children, id, className = '' }: { title: ReactNode; sub?: ReactNode; tools?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section className={`card ${className}`} id={id}>
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {sub && <p className="hint">{sub}</p>}
        </div>
        {tools && <div className="card-tools">{tools}</div>}
      </div>
      {children}
    </section>
  );
}

export function useDimLabels() {
  const { lang } = useL();
  return {
    product: (p: (typeof PRODUCTS)[number]) => name(PRODUCT_NAME[p], lang),
    channel: (c: (typeof CHANNELS)[number]) => name(CHANNEL_NAME[c], lang),
    region: (r: (typeof REGIONS)[number]) => name(REGION_NAME[r], lang),
  };
}

export function ExportBtn({ onClick }: { onClick: () => void }) {
  const { L } = useL();
  return (
    <button type="button" className="btn small" onClick={onClick} title={L('ดาวน์โหลด CSV', 'Download CSV')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
      CSV
    </button>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Delta({ v, text, goodWhenUp = true }: { v: number; text: string; goodWhenUp?: boolean }) {
  const cls = Math.abs(v) < 1e-9 ? 'flat' : (v > 0) === goodWhenUp ? 'up' : 'down';
  return <span className={`delta ${cls}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {text}</span>;
}
