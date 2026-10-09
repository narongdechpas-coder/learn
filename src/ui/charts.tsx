import { useEffect, useRef, useState, type ReactNode } from 'react';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el);
    setW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v);
  return out;
}

export interface BarDatum {
  key: string;
  label: string;
  /** Longer label for the tooltip. */
  full: string;
  value: number;
}

/** Single-series vertical bar chart with a hover tooltip. */
export function BarChart({ data, format, formatAxis, height = 240, ariaLabel }: { data: BarDatum[]; format: (v: number) => string; formatAxis: (v: number) => string; height?: number; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const padL = 52;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const n = Math.max(1, data.length);
  const band = plotW / n;
  const gap = Math.min(band * 0.25, 2 + band * 0.18);
  const barW = Math.max(1, band - gap);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 58))));
  const r = Math.min(4, barW / 2);

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={padL} x2={width - padR} y1={y(tv)} y2={y(tv)} className={tv === 0 ? 'axis' : 'grid'} />
            <text x={padL - 8} y={y(tv)} dy="0.32em" textAnchor="end" className="tick">{formatAxis(tv)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * band + gap / 2;
          const h = Math.max(0, y(0) - y(d.value));
          const rr = Math.min(r, h);
          const path = h > 0 ? `M${x},${y(0)} V${y(d.value) + rr} Q${x},${y(d.value)} ${x + rr},${y(d.value)} H${x + barW - rr} Q${x + barW},${y(d.value)} ${x + barW},${y(d.value) + rr} V${y(0)} Z` : '';
          return (
            <g key={d.key}>
              {path && <path d={path} className={`bar${hover === i ? ' hot' : ''}${hover !== null && hover !== i ? ' dim' : ''}`} />}
              {i % every === 0 && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="tick">{d.label}</text>
              )}
              <rect x={padL + i * band} y={padT} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="tooltip"
          style={{
            left: Math.min(width - 150, Math.max(0, padL + hover * band + band / 2 - 70)),
            top: Math.max(0, y(data[hover].value) - 54),
          }}
        >
          <div className="tt-label">{data[hover].full}</div>
          <div className="tt-value num">{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars as an HTML list (ranked breakdowns). */
export function HBars({ rows, format, empty }: { rows: { key: string; label: ReactNode; value: number; sub?: string }[]; format: (v: number) => string; empty: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.key} title={`${typeof r.label === 'string' ? r.label : r.key}: ${format(r.value)}`}>
          <span className="hb-label">{r.label}</span>
          <span className="hb-track">
            <span className="hb-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="hb-value num">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
