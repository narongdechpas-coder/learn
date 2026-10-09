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

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  /** Second series of the same colour family: drawn hatched so identity never rests on colour alone. */
  hatched?: boolean;
  values: (number | null)[];
}

/** Clustered bars: one cluster per period, one bar per series; hover a cluster for every value in it. */
export function ClusteredBarChart({ series, labels, full, format, formatAxis, height = 280, ariaLabel, refLine }: {
  series: BarSeries[];
  labels: string[];
  full: string[];
  format: (v: number) => string;
  formatAxis: (v: number) => string;
  height?: number;
  ariaLabel: string;
  refLine?: { value: number; label: string };
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.max(0, refLine?.value ?? 0, ...all));
  const top = ticks[ticks.length - 1];
  const padL = 52;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const n = Math.max(1, labels.length);
  const band = plotW / n;
  const inner = band * 0.82;
  const gap = 2; // surface gap between neighbouring bars
  const barW = Math.max(1, (inner - gap * (series.length - 1)) / series.length);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 48))));
  const r = Math.min(4, barW / 2);
  const bar = (x: number, v: number) => {
    const h = Math.max(0, y(0) - y(v));
    if (!h) return '';
    const rr = Math.min(r, h);
    return `M${x},${y(0)} V${y(v) + rr} Q${x},${y(v)} ${x + rr},${y(v)} H${x + barW - rr} Q${x + barW},${y(v)} ${x + barW},${y(v) + rr} V${y(0)} Z`;
  };
  const uid = useRef(`cb${Math.random().toString(36).slice(2, 7)}`).current;

  return (
    <div className="chart cluster-chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <defs>
          {series.filter((s) => s.hatched).map((s) => (
            <pattern key={s.key} id={`${uid}-${s.key}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <rect width="5" height="5" style={{ fill: s.color, opacity: 0.35 }} />
              <line x1="0" y1="0" x2="0" y2="5" style={{ stroke: s.color, strokeWidth: 2.4 }} />
            </pattern>
          ))}
        </defs>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={padL} x2={padL + plotW} y1={y(tv)} y2={y(tv)} className={tv === 0 ? 'axis' : 'grid'} />
            <text x={padL - 8} y={y(tv)} dy="0.32em" textAnchor="end" className="tick">{formatAxis(tv)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const x0 = padL + i * band + (band - inner) / 2;
          return (
            <g key={i} className={hover !== null && hover !== i ? 'dim' : ''}>
              {series.map((s, k) => {
                const v = s.values[i];
                if (v === null || v === undefined) return null;
                const x = x0 + k * (barW + gap);
                return <path key={s.key} d={bar(x, v)} style={{ fill: s.hatched ? `url(#${uid}-${s.key})` : s.color, stroke: s.hatched ? s.color : undefined, strokeWidth: s.hatched ? 1 : undefined }} />;
              })}
              {(i % every === 0 || i === n - 1) && (
                <text x={padL + i * band + band / 2} y={height - 8} textAnchor="middle" className="tick">{l}</text>
              )}
              <rect x={padL + i * band} y={padT} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          );
        })}
        {refLine && (
          <g className="ref-line" pointerEvents="none">
            <line x1={padL} x2={padL + plotW} y1={y(refLine.value)} y2={y(refLine.value)} />
            <text x={padL + 4} y={y(refLine.value) - 5} className="tick">{refLine.label}</text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: Math.min(width - 230, Math.max(0, padL + (hover + 1) * band + 6 > width - 230 ? padL + hover * band - 236 : padL + (hover + 1) * band + 6)), top: padT }}>
          <div className="tt-label">{full[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="tt-row">
              <i style={s.hatched ? { background: `repeating-linear-gradient(45deg, ${s.color} 0 2px, transparent 2px 4px)`, boxShadow: `inset 0 0 0 1px ${s.color}` } : { background: s.color }} />
              <span>{s.label}</span>
              <b className="num">{s.values[hover] === null ? '—' : format(s.values[hover]!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
