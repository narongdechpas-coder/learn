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

/** Line drawings for the vehicle-code cards. */
export function UsageIcon({ code }: { code: UsageCode | 'other' }) {
  const wheels = (
    <>
      <circle cx="14" cy="25" r="3.6" />
      <circle cx="40" cy="25" r="3.6" />
    </>
  );
  const body = (() => {
    switch (code) {
      case '110':
        return <path d="M4 25h6.4m7.2 0h18.8m7.2 0H50v-5l-8-2-7-7H18l-6 7-8 2Z" />;
      case '210':
        return <path d="M4 25h6.4m7.2 0h18.8m7.2 0H50V16l-7-8H4Zm0-9h41M16 8v8m13-8v8" />;
      case '320':
        return <path d="M4 25h6.4m7.2 0h18.8m7.2 0H50v-8H30v-6h-9l-6 6H4Z" />;
      default:
        return <path d="M4 25h6.4m7.2 0h18.8m7.2 0H50v-7l-5-5h-8V8H4Zm33 5h7" />;
    }
  })();
  return (
    <svg className="usage-icon" viewBox="0 0 54 32" width="64" height="38" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      {body}
      {wheels}
    </svg>
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
