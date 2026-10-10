import type { ReactNode } from 'react';
import type { Line } from '../types';
import homeImg from '../../assets/hero/home.webp';
import motorImg from '../../assets/hero/motor.webp';
import travelImg from '../../assets/hero/travel.webp';
import paImg from '../../assets/hero/pa.webp';
import fireImg from '../../assets/hero/fire.webp';

/** Wide hero art (21:9, subject on the right, the left side left clear for the headline). */
export const HERO_IMG: Record<Line | 'home', string> = { home: homeImg, motor: motorImg, travel: travelImg, pa: paImg, fire: fireImg };

/**
 * Horizontal hero: the illustration fills the banner and the headline sits on its quiet left side.
 * On phones the picture is cropped to its right-hand subject and the text moves underneath.
 */
export function HeroBanner({ img, title, lead, children, className = '' }: { img: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={`hero-banner ${className}`}>
      <div className="hb-media">
        <img src={img} alt="" width={1600} height={686} />
      </div>
      <div className="hb-copy">
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
        {children}
      </div>
    </section>
  );
}
