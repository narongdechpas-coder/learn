import { SUITS, type Card } from "@/lib/systems/playing-cards/deck";

export function PlayingCard({ card }: { card: Card }) {
  const suit = SUITS[card.suit];
  const color = suit.red ? "text-rose-600" : "text-zinc-900";
  return (
    <div
      className={`relative flex h-40 w-28 flex-col justify-between rounded-xl border border-zinc-300 bg-white p-2 shadow-sm ${color}`}
      aria-label={`${card.rank} ${suit.name}`}
    >
      <div className="text-left text-lg font-semibold leading-none">
        {card.rank}
        <div>{suit.symbol}</div>
      </div>
      <div className="text-center text-5xl">{suit.symbol}</div>
      <div className="rotate-180 text-left text-lg font-semibold leading-none">
        {card.rank}
        <div>{suit.symbol}</div>
      </div>
    </div>
  );
}
