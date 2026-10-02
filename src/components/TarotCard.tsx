import type { TarotCard as Card } from "@/lib/systems/tarot/deck";

interface Props {
  card: Card;
  reversed: boolean;
  /** Tailwind width class; height follows the card's 300×527 ratio */
  width?: string;
  /** Extra rotation in degrees (the crossing card in a Celtic Cross is 90) */
  rotate?: number;
  label?: string;
}

export function TarotCard({ card, reversed, width = "w-28", rotate = 0, label }: Props) {
  const deg = rotate + (reversed ? 180 : 0);
  return (
    <div className={`relative ${width}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are pre-sized */}
      <img
        src={card.image}
        alt={`${card.nameTh} (${card.nameEn})${reversed ? " กลับหัว" : ""}`}
        width={300}
        height={527}
        loading="lazy"
        className="aspect-[300/527] w-full rounded-lg shadow-md"
        style={deg ? { transform: `rotate(${deg}deg)` } : undefined}
      />
      {label && (
        <span className="absolute -left-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white shadow">
          {label}
        </span>
      )}
    </div>
  );
}
