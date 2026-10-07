import type { UsageCode } from '../types';

/**
 * Neutral monogram emblems for each brand (not the manufacturers' trademarks).
 * Each brand gets its own shape and colour so the grid is quick to scan.
 */
const EMBLEM: Record<string, { color: string; text: string; shape: 'oval' | 'circle' | 'square' | 'diamond' | 'octagon' | 'shield' | 'wide' }> = {
  toyota: { color: '#c8102e', text: 'T', shape: 'oval' },
  honda: { color: '#b5121b', text: 'H', shape: 'square' },
  isuzu: { color: '#a50f15', text: 'IS', shape: 'wide' },
  mazda: { color: '#4f5b66', text: 'M', shape: 'circle' },
  nissan: { color: '#5f6368', text: 'N', shape: 'circle' },
  mitsubishi: { color: '#d0021b', text: 'M', shape: 'diamond' },
  ford: { color: '#1c3f94', text: 'F', shape: 'oval' },
  mg: { color: '#8c1d2c', text: 'MG', shape: 'octagon' },
  byd: { color: '#2766b0', text: 'B', shape: 'wide' },
  suzuki: { color: '#1d4fa0', text: 'S', shape: 'shield' },
  hyundai: { color: '#0b2f5b', text: 'H', shape: 'oval' },
};

export function BrandIcon({ id, size = 30 }: { id: string; size?: number }) {
  const e = EMBLEM[id] ?? { color: '#6b7280', text: '?', shape: 'circle' as const };
  const shape = (() => {
    switch (e.shape) {
      case 'oval':
        return <ellipse cx="20" cy="20" rx="18" ry="13" fill={e.color} />;
      case 'circle':
        return <circle cx="20" cy="20" r="16" fill={e.color} />;
      case 'square':
        return <rect x="5" y="6" width="30" height="28" rx="7" fill={e.color} />;
      case 'diamond':
        return <rect x="9" y="9" width="22" height="22" rx="3" transform="rotate(45 20 20)" fill={e.color} />;
      case 'octagon':
        return <polygon points="13,4 27,4 36,13 36,27 27,36 13,36 4,27 4,13" fill={e.color} />;
      case 'shield':
        return <path d="M20 3 35 9v10c0 9-6 15-15 18C11 34 5 28 5 19V9Z" fill={e.color} />;
      default:
        return <rect x="2" y="10" width="36" height="20" rx="10" fill={e.color} />;
    }
  })();
  return (
    <svg className="brand-icon" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {shape}
      <text x="20" y="20" dy="0.36em" textAnchor="middle" fill="#fff" fontSize={e.text.length > 1 ? 12 : 16} fontWeight="700" fontFamily="var(--f-display)">
        {e.text}
      </text>
    </svg>
  );
}

export type CarKind = 'sedan' | 'van' | 'pickup' | 'truck' | 'front' | 'rear';

const wheel = (cx: number, r = 8) =>
  `<circle cx="${cx}" cy="44" r="${r + 1.5}" fill="#1d2326"/><circle cx="${cx}" cy="44" r="${r}" fill="#2b3236"/>` +
  `<circle cx="${cx}" cy="44" r="${r * 0.55}" fill="#c9d2d8"/><circle cx="${cx}" cy="44" r="${r * 0.55}" fill="none" stroke="#9aa6ad" stroke-width="1"/>` +
  `<circle cx="${cx}" cy="44" r="1.6" fill="#59656c"/>`;

const glass = (id: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7ecfa"/><stop offset="1" stop-color="#8fb6d1"/></linearGradient>`;
const paint = (id: string, c1: string, c2: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;

/**
 * Side / front / rear car illustrations as SVG markup. Kept as strings so the same drawing
 * renders inline and can be painted onto a canvas for the simulated phone photos.
 */
export function carSvg(kind: CarKind, uid: string = kind): string {
  const g = `g-${uid}`;
  const p = `p-${uid}`;
  const shadow = `<ellipse cx="60" cy="53" rx="54" ry="3.5" fill="#000" opacity="0.13"/>`;
  let body = '';
  let defs = glass(g);
  switch (kind) {
    case 'sedan':
      defs += paint(p, '#4f8ad0', '#24508a');
      body =
        `<path d="M7 41c0-5 2-8 8-9l15-3 13-12c3-2 6-3 10-3h22c5 0 9 2 13 5l10 9 10 2c5 1 7 4 7 8v4c0 1-1 2-2 2H9c-1 0-2-1-2-2Z" fill="url(#${p})"/>` +
        `<path d="M36 29l11-10c2-1 3-2 6-2h8v12Z" fill="url(#${g})"/><path d="M64 17h11c4 0 7 1 10 4l8 8H64Z" fill="url(#${g})"/>` +
        `<path d="M62 30v14M33 31v12" stroke="#1b3f6e" stroke-width="1"/><rect x="66" y="33" width="6" height="1.6" rx=".8" fill="#1b3f6e"/><rect x="39" y="33" width="6" height="1.6" rx=".8" fill="#1b3f6e"/>` +
        `<path d="M12 35h100" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>` +
        `<path d="M106 33l7 1.5v3h-7Z" fill="#fff3c4"/><path d="M8 34h5v3H7Z" fill="#e2463a"/>` +
        wheel(31) + wheel(93);
      break;
    case 'van':
      defs += paint(p, '#f4f6f8', '#c3ccd3');
      body =
        `<path d="M6 44V20c0-6 3-9 9-9h70c5 0 8 2 11 5l11 13 6 2c2 1 3 3 3 6v7c0 1-1 2-2 2H8c-1 0-2-1-2-2Z" fill="url(#${p})" stroke="#9aa6ad" stroke-width="1"/>` +
        `<rect x="11" y="15" width="19" height="11" rx="2" fill="url(#${g})"/><rect x="33" y="15" width="19" height="11" rx="2" fill="url(#${g})"/><rect x="55" y="15" width="19" height="11" rx="2" fill="url(#${g})"/>` +
        `<path d="M77 15h8c3 0 5 1 7 3l8 9H77Z" fill="url(#${g})"/>` +
        `<path d="M53 28v16M76 28v16" stroke="#9aa6ad" stroke-width="1"/><path d="M6 33h107" stroke="#6b7a84" stroke-width="2.4" stroke-opacity=".6"/>` +
        `<path d="M108 32l6 1v3h-6Z" fill="#fff3c4"/><path d="M6 25h3v5H6Z" fill="#e2463a"/>` +
        wheel(25, 7.5) + wheel(94, 7.5);
      break;
    case 'pickup':
      defs += paint(p, '#e0583f', '#9c2d1d');
      body =
        `<path d="M6 44V31h46v-8c0-3 2-5 5-5h23c4 0 8 1 11 4l9 8 10 2c3 1 4 3 4 6v6c0 1-1 2-2 2H8c-1 0-2-1-2-2Z" fill="url(#${p})"/>` +
        `<path d="M56 21h12v9H56v-6c0-2 0-3 0-3Z" fill="url(#${g})"/><path d="M71 21h9c3 0 6 1 8 3l7 6H71Z" fill="url(#${g})"/>` +
        `<path d="M6 31h46" stroke="#6e1f13" stroke-width="2"/><path d="M52 23v21M70 31v13" stroke="#7a2214" stroke-width="1"/>` +
        `<path d="M10 36h104" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>` +
        `<path d="M107 33l7 1v3h-7Z" fill="#fff3c4"/><path d="M6 33h4v4H6Z" fill="#ffb3a6"/>` +
        wheel(27, 8.5) + wheel(93, 8.5);
      break;
    case 'truck':
      defs += paint(p, '#f3b04a', '#d1801b');
      body =
        `<rect x="4" y="9" width="68" height="33" rx="2" fill="url(#${p})"/><path d="M10 15h56M10 21h56" stroke="#fff" stroke-opacity=".35"/>` +
        `<path d="M74 44V20c0-2 1-3 3-3h18c3 0 5 1 7 4l7 9c3 1 5 3 5 6v6c0 1-1 2-2 2Z" fill="#eef1f3" stroke="#9aa6ad"/>` +
        `<path d="M79 21h15c2 0 4 1 5 3l5 7H79Z" fill="url(#${g})"/>` +
        `<path d="M109 33l5 1v3h-5Z" fill="#fff3c4"/><path d="M4 42h110" stroke="#59656c" stroke-width="2"/>` +
        wheel(22, 7.5) + wheel(50, 7.5) + wheel(96, 7.5);
      break;
    case 'front':
    case 'rear': {
      const rear = kind === 'rear';
      defs += paint(p, '#4f8ad0', '#24508a');
      body =
        `<path d="M22 46V33c0-4 2-6 5-7l7-13c1-2 3-3 6-3h40c3 0 5 1 6 3l7 13c3 1 5 3 5 7v13Z" fill="url(#${p})"/>` +
        `<path d="M37 14h46l6 12H31Z" fill="url(#${g})"/>` +
        (rear
          ? `<rect x="26" y="31" width="14" height="6" rx="2" fill="#e2463a"/><rect x="80" y="31" width="14" height="6" rx="2" fill="#e2463a"/><rect x="48" y="36" width="24" height="7" rx="1" fill="#fff"/>`
          : `<ellipse cx="32" cy="34" rx="7" ry="4" fill="#fff3c4"/><ellipse cx="88" cy="34" rx="7" ry="4" fill="#fff3c4"/><rect x="44" y="31" width="32" height="8" rx="3" fill="#1d2326"/><path d="M47 35h26" stroke="#59656c"/>`) +
        `<rect x="24" y="44" width="12" height="7" rx="2" fill="#1d2326"/><rect x="84" y="44" width="12" height="7" rx="2" fill="#1d2326"/>` +
        `<path d="M22 22h-6v4h7M98 22h6v4h-7" fill="#24508a"/>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 58"><defs>${defs}</defs>${shadow}${body}</svg>`;
}

const USAGE_KIND: Record<string, CarKind> = { '110': 'sedan', '210': 'van', '320': 'pickup', other: 'truck' };

/** Illustrations for the vehicle-code cards. */
export function UsageIcon({ code }: { code: UsageCode | 'other' }) {
  const kind = USAGE_KIND[code] ?? 'sedan';
  return <span className="usage-icon car-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: carSvg(kind, `u${code}`) }} />;
}

/** Car drawing, optionally mirrored (left side) or faded as a framing guide. */
export function CarArt({ kind, flip = false, ghost = false, className = '' }: { kind: CarKind; flip?: boolean; ghost?: boolean; className?: string }) {
  return (
    <span
      className={`car-art${flip ? ' flip' : ''}${ghost ? ' ghost' : ''} ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: carSvg(kind, `${kind}${flip ? 'f' : ''}${ghost ? 'g' : ''}${className}`) }}
    />
  );
}

/** Decorative QR-like pattern for the simulated PromptPay payment. */
export function FakeQr({ seed, size = 168 }: { seed: string; size?: number }) {
  const n = 25;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const finder = (x: number, y: number) => x < 7 && y < 7;
  const inFinder = (x: number, y: number) => finder(x, y) || finder(n - 1 - x, y) || finder(x, n - 1 - y);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() < 0.48) cells.push([x, y]);
  const eye = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#111" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#111" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label="QR" className="fake-qr">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />
      ))}
      {eye(0, 0)}
      {eye(n - 7, 0)}
      {eye(0, n - 7)}
    </svg>
  );
}
