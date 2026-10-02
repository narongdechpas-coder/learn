import type { DrawnTarot } from "@/lib/systems/tarot/spreads";
import { TarotCard } from "@/components/TarotCard";

/** วางไพ่ Celtic Cross แบบดั้งเดิม: กากบาท 6 ใบทางซ้าย และคอลัมน์ 4 ใบทางขวา (ใบที่ 10 อยู่บนสุด) */
export function CelticCross({ cards }: { cards: DrawnTarot[] }) {
  const at = (i: number, rotate = 0, label = true) => (
    <TarotCard card={cards[i].card} reversed={cards[i].reversed} width="w-20" rotate={rotate} label={label ? String(i + 1) : undefined} />
  );
  return (
    <div className="hidden items-center justify-center gap-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:flex" data-testid="celtic-layout">
      <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-x-12 gap-y-3">
        <div className="col-start-2 row-start-1">{at(4)}</div>
        <div className="col-start-1 row-start-2">{at(3)}</div>
        <div className="relative col-start-2 row-start-2 flex items-center justify-center">
          {at(0)}
          <div className="absolute">{at(1, 90, false)}</div>
          {/* the crossing card shares card 1's box, so its number sits on the right edge instead */}
          <span className="absolute -right-9 top-1/2 z-10 flex h-6 w-6 -translate-y-[190%] items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white shadow">
            2
          </span>
        </div>
        <div className="col-start-3 row-start-2">{at(5)}</div>
        <div className="col-start-2 row-start-3">{at(2)}</div>
      </div>
      <div className="flex flex-col-reverse gap-3">
        {[6, 7, 8, 9].map((i) => (
          <div key={i}>{at(i)}</div>
        ))}
      </div>
    </div>
  );
}
