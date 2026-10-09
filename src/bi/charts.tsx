import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Rag } from './data';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
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

export function niceScale(lo: number, hi: number, count = 4) {
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = a; v <= b + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export interface Series {
  key: string;
  label: string;
  values: (number | null)[];
  /** CSS color (use a token) */
  color: string;
  dashed?: boolean;
  thin?: boolean;
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean; box?: boolean }[] }) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          {i.box ? <span className="lg-box" style={{ background: i.color }} /> : <span className={`lg-line${i.dashed ? ' dashed' : ''}`} style={{ borderColor: i.color }} />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Multi-series line chart, one y-axis, crosshair tooltip. */
export function LineChart({ labels, series, format, formatAxis, height = 240, ariaLabel, refLine, yFloor }: {
  labels: string[]; series: Series[]; format: (v: number) => string; formatAxis: (v: number) => string; height?: number; ariaLabel: string;
  refLine?: { value: number; label: string }; yFloor?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (refLine) all.push(refLine.value);
  const lo = yFloor ?? Math.min(0, ...all);
  const hi = Math.max(...all, lo + 1e-9);
  const ticks = niceScale(lo, hi);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const padL = 56, padR = 14, padT = 12, padB = 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - y0) / (y1 - y0)) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 56))));
  const path = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };
  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={padL} x2={width - padR} y1={y(tv)} y2={y(tv)} className={tv === y0 ? 'axis' : 'gridline'} />
            <text x={padL - 8} y={y(tv)} dy="0.32em" textAnchor="end" className="tick">{formatAxis(tv)}</text>
          </g>
        ))}
        {refLine && (
          <g>
            <line x1={padL} x2={width - padR} y1={y(refLine.value)} y2={y(refLine.value)} className="refline" />
            <text x={width - padR} y={y(refLine.value) - 5} textAnchor="end" className="tick ref-label">{refLine.label}</text>
          </g>
        )}
        {labels.map((l, i) => (i % every === 0 || (i === n - 1 && ((n - 1) % every) * (plotW / Math.max(1, n - 1)) >= 60)) && (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="tick">{l}</text>
        ))}
        {series.map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.thin ? 1.5 : 2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) => {
          // end-point marker on the last value of each solid series
          let li = -1;
          s.values.forEach((v, i) => { if (v !== null) li = i; });
          return li >= 0 && !s.dashed ? <circle key={s.key} cx={x(li)} cy={y(s.values[li]!)} r={4} fill={s.color} className="ring" /> : null;
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} className="crosshair" />
            {series.map((s) => s.values[hover] !== null && <circle key={s.key} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} className="ring" />)}
          </g>
        )}
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" onMouseMove={onMove} onClick={onMove} />
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: Math.min(width - 190, Math.max(0, x(hover) + 12)), top: padT }}>
          <div className="tt-label">{labels[hover]}</div>
          {series.map((s) => s.values[hover] !== null && (
            <div key={s.key} className="tt-row"><span className="tt-key" style={{ background: s.color }} />{s.label}<b className="num">{format(s.values[hover]!)}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grouped columns (≤ 3 series) on one axis, per-group hover tooltip, optional click. */
export function ColumnChart({ labels, series, format, formatAxis, height = 240, ariaLabel, onPick, picked }: {
  labels: string[]; series: Series[]; format: (v: number) => string; formatAxis: (v: number) => string; height?: number; ariaLabel: string;
  onPick?: (i: number) => void; picked?: number | null;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const padL = 56, padR = 8, padT = 10, padB = 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const n = Math.max(1, labels.length);
  const band = plotW / n;
  const inner = band * 0.72;
  const bw = Math.max(2, (inner - (series.length - 1) * 2) / series.length);
  const y = (v: number) => padT + plotH - ((v - y0) / (y1 - y0)) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 56))));
  const bar = (x0: number, v: number) => {
    const top = y(Math.max(0, v));
    const bot = y(Math.min(0, v));
    const h = Math.max(0, bot - top);
    const r = Math.min(4, bw / 2, h);
    if (h <= 0) return '';
    return v >= 0
      ? `M${x0},${bot} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${bot} Z`
      : `M${x0},${top} V${bot - r} Q${x0},${bot} ${x0 + r},${bot} H${x0 + bw - r} Q${x0 + bw},${bot} ${x0 + bw},${bot - r} V${top} Z`;
  };
  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={padL} x2={width - padR} y1={y(tv)} y2={y(tv)} className={tv === 0 ? 'axis' : 'gridline'} />
            <text x={padL - 8} y={y(tv)} dy="0.32em" textAnchor="end" className="tick">{formatAxis(tv)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const gx = padL + i * band + (band - inner) / 2;
          const dim = (hover !== null && hover !== i) || (picked != null && picked !== i);
          return (
            <g key={i} opacity={dim ? 0.45 : 1}>
              {series.map((s, si) => s.values[i] !== null && <path key={s.key} d={bar(gx + si * (bw + 2), s.values[i]!)} fill={s.color} />)}
              {(i % every === 0) && <text x={padL + i * band + band / 2} y={height - 8} textAnchor="middle" className="tick">{l}</text>}
              <rect x={padL + i * band} y={padT} width={band} height={plotH} fill="transparent" style={{ cursor: onPick ? 'pointer' : undefined }}
                onMouseEnter={() => setHover(i)} onClick={() => (onPick ? onPick(i) : setHover(i))} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: Math.min(width - 190, Math.max(0, padL + hover * band + band / 2 + 8)), top: padT }}>
          <div className="tt-label">{labels[hover]}</div>
          {series.map((s) => s.values[hover] !== null && (
            <div key={s.key} className="tt-row"><span className="tt-key" style={{ background: s.color }} />{s.label}<b className="num">{format(s.values[hover]!)}</b></div>
          ))}
          {onPick && <div className="tt-hint">↗</div>}
        </div>
      )}
    </div>
  );
}

/** Scatter with mean quadrant lines; emphasised points use slot 1, the rest recede. */
export function Scatter({ points, xLabel, yLabel, fx, fy, height = 280, ariaLabel, onPick }: {
  points: { key: string; x: number; y: number; label: string; hot?: boolean; size?: number }[];
  xLabel: string; yLabel: string; fx: (v: number) => string; fy: (v: number) => string; height?: number; ariaLabel: string; onPick?: (key: string) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <p className="muted">—</p>;
  const xt = niceScale(0, Math.max(...points.map((p) => p.x)) * 1.05);
  const yt = niceScale(0, Math.max(...points.map((p) => p.y)) * 1.05);
  const padL = 60, padR = 14, padT = 12, padB = 40;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = height - padT - padB;
  const X = (v: number) => padL + (v / xt[xt.length - 1]) * plotW;
  const Y = (v: number) => padT + plotH - (v / yt[yt.length - 1]) * plotH;
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  const order = points.map((p, i) => ({ p, i })).sort((a, b) => Number(!!a.p.hot) - Number(!!b.p.hot));
  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {yt.map((tv) => (
          <g key={`y${tv}`}>
            <line x1={padL} x2={width - padR} y1={Y(tv)} y2={Y(tv)} className={tv === 0 ? 'axis' : 'gridline'} />
            <text x={padL - 8} y={Y(tv)} dy="0.32em" textAnchor="end" className="tick">{fy(tv)}</text>
          </g>
        ))}
        {xt.map((tv) => <text key={`x${tv}`} x={X(tv)} y={padT + plotH + 16} textAnchor="middle" className="tick">{fx(tv)}</text>)}
        <text x={padL + plotW / 2} y={height - 4} textAnchor="middle" className="tick axis-title">{xLabel}</text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" className="tick axis-title" transform={`rotate(-90 12 ${padT + plotH / 2})`}>{yLabel}</text>
        <line x1={X(mx)} x2={X(mx)} y1={padT} y2={padT + plotH} className="refline" />
        <line x1={padL} x2={width - padR} y1={Y(my)} y2={Y(my)} className="refline" />
        <text x={width - padR - 4} y={padT + 12} textAnchor="end" className="tick quad">↑ freq · ↑ sev</text>
        {order.map(({ p, i }) => (
          <circle key={p.key} cx={X(p.x)} cy={Y(p.y)} r={(p.size ?? 5) + (hover === i ? 2 : 0)} className={`dot ring${p.hot ? ' hot' : ''}`}
            onMouseEnter={() => setHover(i)} onClick={() => (onPick ? onPick(p.key) : setHover(i))} style={{ cursor: onPick ? 'pointer' : undefined }} />
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div className="tooltip" style={{ left: Math.min(width - 200, Math.max(0, X(points[hover].x) + 10)), top: Math.max(0, Y(points[hover].y) - 60) }}>
          <div className="tt-label">{points[hover].label}</div>
          <div className="tt-row">{xLabel}<b className="num">{fx(points[hover].x)}</b></div>
          <div className="tt-row">{yLabel}<b className="num">{fy(points[hover].y)}</b></div>
        </div>
      )}
    </div>
  );
}

export function RagPill({ r, children }: { r: Rag; children: ReactNode }) {
  const icon = r === 'good' ? '✓' : r === 'warn' ? '!' : '✕';
  return <span className={`pill rag tone-${r}`}><span aria-hidden="true" className="rag-i">{icon}</span>{children}</span>;
}

/** Horizontal bullet rows: actual bar, target tick, achievement pill. */
export function Bullets({ rows, format, onPick, emptyText }: {
  rows: { key: string; label: ReactNode; actual: number; target: number; rag: Rag; pct: string; sub?: ReactNode }[];
  format: (v: number) => string; onPick?: (key: string) => void; emptyText: string;
}) {
  const max = Math.max(1e-9, ...rows.flatMap((r) => [r.actual, r.target]));
  if (!rows.length) return <p className="muted">{emptyText}</p>;
  return (
    <ul className="bullets">
      {rows.map((r) => (
        <li key={r.key}>
          <button type="button" className="bl-row" onClick={onPick ? () => onPick(r.key) : undefined} disabled={!onPick} title={`${format(r.actual)} / ${format(r.target)}`}>
            <span className="bl-label">{r.label}{r.sub && <small>{r.sub}</small>}</span>
            <span className="bl-track">
              <span className={`bl-fill rag-${r.rag}`} style={{ width: `${(r.actual / max) * 100}%` }} />
              <i style={{ left: `${(r.target / max) * 100}%` }} />
            </span>
            <span className="bl-num num">{format(r.actual)}</span>
            <RagPill r={r.rag}>{r.pct}</RagPill>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Ranked horizontal bars that may go negative (diverging from a zero line). */
export function DivBars({ rows, format, onPick }: { rows: { key: string; label: string; value: number }[]; format: (v: number) => string; onPick?: (key: string) => void }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  const hasNeg = rows.some((r) => r.value < 0);
  return (
    <ul className="divbars">
      {rows.map((r) => {
        const w = (Math.abs(r.value) / max) * (hasNeg ? 50 : 100);
        return (
          <li key={r.key}>
            <button type="button" className="db-row" onClick={onPick ? () => onPick(r.key) : undefined} disabled={!onPick}>
              <span className="db-label">{r.label}</span>
              <span className="db-track">
                {hasNeg && <i className="db-zero" />}
                <span className={`db-fill ${r.value < 0 ? 'neg' : 'pos'}`} style={r.value < 0 ? { right: '50%', width: `${w}%` } : { left: hasNeg ? '50%' : 0, width: `${w}%` }} />
              </span>
              <span className={`db-num num${r.value < 0 ? ' bad-text' : ''}`}>{format(r.value)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : v;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
