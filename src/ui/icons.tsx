import type { UsageCode } from '../types';
import { BRAND_LOGOS } from '../data/brandLogos';

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
  const logo = BRAND_LOGOS[id];
  if (logo)
    return (
      <span className="brand-logo" style={{ width: size, height: size }} aria-hidden="true">
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.74)} height={Math.round(size * 0.74)}>
          <path fill={logo.hex} d={logo.path} />
        </svg>
      </span>
    );
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
    <span className="brand-logo" style={{ width: size, height: size }} aria-hidden="true">
    <svg className="brand-icon" viewBox="0 0 40 40" width={Math.round(size * 0.8)} height={Math.round(size * 0.8)}>
      {shape}
      <text x="20" y="20" dy="0.36em" textAnchor="middle" fill="#fff" fontSize={e.text.length > 1 ? 12 : 16} fontWeight="700" fontFamily="var(--f-display)">
        {e.text}
      </text>
    </svg>
    </span>
  );
}

export type CarKind = 'sedan' | 'van' | 'pickup' | 'truck' | 'front' | 'rear';

type Paint = [string, string, string];

const defsFor = (u: string, paint: Paint) =>
  `<linearGradient id="p-${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paint[0]}"/><stop offset=".45" stop-color="${paint[1]}"/><stop offset="1" stop-color="${paint[2]}"/></linearGradient>` +
  `<linearGradient id="g-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4f2fc"/><stop offset=".55" stop-color="#9cc3de"/><stop offset="1" stop-color="#5f8fb2"/></linearGradient>` +
  `<radialGradient id="s-${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-${u}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f2f5f7"/><stop offset=".7" stop-color="#b9c3ca"/><stop offset="1" stop-color="#7d8a92"/></radialGradient>` +
  `<linearGradient id="l-${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff8d6"/><stop offset="1" stop-color="#ffd76a"/></linearGradient>`;

/** Tyre, alloy rim with spokes, and the dark wheel arch cut into the body. */
const wheel = (u: string, cx: number, r = 8, arch = true) => {
  let spokes = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180);
    spokes += `<path d="M${cx} 44 L${(cx + Math.cos(a) * r * 0.55).toFixed(2)} ${(44 + Math.sin(a) * r * 0.55).toFixed(2)}" stroke="#8d989f" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  const ar = r + 2.6;
  return (
    (arch ? `<path d="M${cx - ar} 45.5 A${ar} ${ar} 0 0 1 ${cx + ar} 45.5 Z" fill="#0b1114" opacity=".55"/>` : '') +
    `<circle cx="${cx}" cy="44" r="${r}" fill="#20272b"/><circle cx="${cx}" cy="44" r="${r - 1.4}" fill="#2e373c"/>` +
    `<circle cx="${cx}" cy="44" r="${r * 0.62}" fill="url(#r-${u})"/>${spokes}` +
    `<circle cx="${cx}" cy="44" r="${r * 0.2}" fill="#5c676e"/>` +
    `<path d="M${cx - r * 0.45} ${44 - r * 0.35} A${r * 0.6} ${r * 0.6} 0 0 1 ${cx + r * 0.1} ${44 - r * 0.58}" stroke="#fff" stroke-opacity=".55" stroke-width=".9" fill="none"/>`
  );
};

/** Lower-body shade and shoulder highlight, both clipped to the body outline. */
const shading = (u: string, body: string, shoulderY: number, sillY = 39) =>
  `<clipPath id="c-${u}"><path d="${body}"/></clipPath>` +
  `<g clip-path="url(#c-${u})"><rect x="0" y="${sillY}" width="120" height="10" fill="#000" opacity=".2"/>` +
  `<rect x="0" y="${shoulderY}" width="120" height="1.6" fill="#fff" opacity=".45"/>` +
  `<rect x="0" y="${shoulderY + 1.6}" width="120" height="1.2" fill="#000" opacity=".12"/></g>`;

const glare = (pts: string) => `<polygon points="${pts}" fill="#fff" opacity=".42"/>`;

/**
 * Side / front / rear car illustrations as SVG markup. Kept as strings so the same drawing
 * renders inline and can be painted onto a canvas for the simulated phone photos.
 */
export function carSvg(kind: CarKind, uid: string = kind): string {
  const u = uid.replace(/[^a-zA-Z0-9-]/g, '');
  const shadow = `<ellipse cx="60" cy="52.5" rx="56" ry="4.2" fill="url(#s-${u})"/>`;
  let paint: Paint = ['#6ea6ea', '#3570c2', '#1d4378'];
  let body = '';
  switch (kind) {
    case 'sedan': {
      // Rear deck and hood are about the same length so the cabin sits in the middle.
      const outline =
        'M9 46C7 46 6 45 6 43V37C6 34 8 32 12 31L30 29C33 28.5 35 27.5 37 25.5L44 18C46 16 49 15 52 15H69C72 15 75 16 77 18L85 26C87 28 89 29 92 29.5L107 31.5C111 32 114 34 114 38V43C114 45 113 46 111 46Z';
      body =
        `<path d="${outline}" fill="url(#p-${u})"/>` +
        shading(u, outline, 31.2) +
        `<path d="M40 27.5L46.5 20C47.5 19 49 18.5 50.5 18.5H59V27.5Z" fill="url(#g-${u})"/>` +
        `<path d="M62 18.5H69.5C71 18.5 72.5 19 73.5 20L81 27.5H62Z" fill="url(#g-${u})"/>` +
        glare('48,19.5 53,19.5 47,27 42,27') + glare('66,19.5 70,19.5 64,27 62,27 62,24') +
        `<path d="M50.5 16H70" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>` +
        `<path d="M60.5 28v16M37.5 29.5v13.5M84.5 29v13" stroke="#0f2b52" stroke-opacity=".55" stroke-width=".8"/>` +
        `<rect x="49" y="32" width="5" height="1.4" rx=".7" fill="#0f2b52" opacity=".7"/><rect x="70" y="32" width="5" height="1.4" rx=".7" fill="#0f2b52" opacity=".7"/>` +
        `<path d="M80 25.5h4.2l.8 2.6h-4.6Z" fill="#163a66"/>` +
        `<path d="M107.5 32.8l6 1.1v2.8h-6.4Z" fill="url(#l-${u})"/><path d="M6.4 33h4.8v3.2H6.2Z" fill="#e2463a"/>` +
        wheel(u, 31) + wheel(u, 90);
      break;
    }
    case 'van': {
      paint = ['#ffffff', '#e6ebee', '#b4bfc6'];
      const outline = 'M8 46C7 46 6 45 6 44V19C6 14 9 11 14 11H84C89 11 92 13 95 16.5L106 29L111 30.5C113.5 31.3 114.5 33 114.5 36V44C114.5 45 113.5 46 112.5 46Z';
      body =
        `<path d="${outline}" fill="url(#p-${u})" stroke="#9aa6ad" stroke-width=".8"/>` +
        shading(u, outline, 30) +
        `<rect x="11" y="15" width="19" height="11" rx="2" fill="url(#g-${u})"/><rect x="33" y="15" width="19" height="11" rx="2" fill="url(#g-${u})"/><rect x="55" y="15" width="19" height="11" rx="2" fill="url(#g-${u})"/>` +
        `<path d="M77 15H85C88 15 90 16 92 18L100 27H77Z" fill="url(#g-${u})"/>` +
        glare('14,16 19,16 15,25 12,25') + glare('36,16 41,16 37,25 34,25') + glare('58,16 63,16 59,25 56,25') + glare('81,16 86,16 82,26 78,26') +
        `<path d="M14 12.4H82" stroke="#fff" stroke-width="1.2"/>` +
        `<path d="M53.5 27v18M75.5 27v18" stroke="#8a969d" stroke-width=".8"/><rect x="64" y="31" width="6" height="1.4" rx=".7" fill="#6b7880"/>` +
        `<path d="M108.5 32l6 1.2v3h-6Z" fill="url(#l-${u})"/><path d="M6 24h3v6H6Z" fill="#e2463a"/>` +
        wheel(u, 25, 7.6) + wheel(u, 94, 7.6);
      break;
    }
    case 'pickup': {
      paint = ['#f3826a', '#cc4128', '#7c2213'];
      const outline = 'M8 46C7 46 6 45 6 44V30H52V22C52 19.5 54 17 57 17H80C84 17 87.5 18.5 90 21L99 29L108 31C112 32 114 34 114 38V44C114 45 113 46 112 46Z';
      body =
        `<path d="${outline}" fill="url(#p-${u})"/>` +
        shading(u, outline, 31.5) +
        `<path d="M6 29.4H52.5" stroke="#5f180b" stroke-width="1.6"/>` +
        `<path d="M56 21C56 20 57 20 58 20H68V29H56Z" fill="url(#g-${u})"/><path d="M71 20H80C83 20 85.5 21 87.5 23L94 29H71Z" fill="url(#g-${u})"/>` +
        glare('59,21 63,21 59,28 57,28') + glare('74,21 78,21 74,28 72,28') +
        `<path d="M58 18.3H80" stroke="#fff" stroke-opacity=".5" stroke-width="1.1"/>` +
        `<path d="M52 23v22M69.5 30v15" stroke="#5f180b" stroke-opacity=".6" stroke-width=".8"/><rect x="61" y="33" width="5" height="1.4" rx=".7" fill="#5f180b"/>` +
        `<path d="M108 32.6l6 1.1v3h-6Z" fill="url(#l-${u})"/><path d="M6 32h4v4H6Z" fill="#ffb3a6"/>` +
        wheel(u, 27, 8.6) + wheel(u, 93, 8.6);
      break;
    }
    case 'truck': {
      paint = ['#f9c46a', '#ec9c2e', '#b5670f'];
      const box = 'M4 41V11C4 9.9 4.9 9 6 9H70C71.1 9 72 9.9 72 11V41Z';
      const cab = 'M74 46V20C74 18 75 17 77 17H95C98 17 100 18 102 21L109 30C112 31 114.5 33 114.5 36V44C114.5 45 113.5 46 112.5 46Z';
      body =
        `<path d="${box}" fill="url(#p-${u})"/>` + shading(u, box, 12, 36) +
        `<path d="M10 16H66M10 22H66M10 28H66" stroke="#fff" stroke-opacity=".3"/>` +
        `<path d="${cab}" fill="#f3f6f8" stroke="#9aa6ad" stroke-width=".8"/>` +
        `<path d="M79 21H94C96 21 97.5 22 99 24L104 31H79Z" fill="url(#g-${u})"/>` + glare('82,22 87,22 83,30 80,30') +
        `<path d="M4 41.5H74" stroke="#4d585e" stroke-width="2.4"/>` +
        `<path d="M109 32.5l5.5 1v3H109Z" fill="url(#l-${u})"/>` +
        wheel(u, 22, 7.6, false) + wheel(u, 50, 7.6, false) + wheel(u, 96, 7.6);
      break;
    }
    case 'front':
    case 'rear': {
      const rear = kind === 'rear';
      const outline = 'M22 47V33C22 29 24 27 27 26L34 13C35 11 37 10 40 10H80C83 10 85 11 86 13L93 26C96 27 98 29 98 33V47Z';
      body =
        `<path d="${outline}" fill="url(#p-${u})"/>` + shading(u, outline, 27.5, 40) +
        `<path d="M37 14H83L89 25H31Z" fill="url(#g-${u})"/>` + glare('44,15 54,15 46,24 37,24') +
        (rear
          ? `<rect x="25" y="30" width="15" height="6" rx="2" fill="#e2463a"/><rect x="80" y="30" width="15" height="6" rx="2" fill="#e2463a"/><rect x="48" y="35" width="24" height="7" rx="1" fill="#fff" stroke="#9aa6ad" stroke-width=".6"/>`
          : `<ellipse cx="32" cy="33" rx="7" ry="3.8" fill="url(#l-${u})"/><ellipse cx="88" cy="33" rx="7" ry="3.8" fill="url(#l-${u})"/><rect x="44" y="30" width="32" height="8" rx="3" fill="#1d2326"/><path d="M47 32.5h26M47 35.5h26" stroke="#59656c"/>`) +
        `<rect x="23" y="46" width="13" height="7" rx="2" fill="#1d2326"/><rect x="84" y="46" width="13" height="7" rx="2" fill="#1d2326"/>` +
        `<path d="M22 21h-6v4h7M98 21h6v4h-7" fill="#1d4378"/>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 58"><defs>${defsFor(u, paint)}</defs>${shadow}${body}</svg>`;
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
