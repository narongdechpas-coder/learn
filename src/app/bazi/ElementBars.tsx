import { ELEMENTS, ELEMENT_INFO, type Element } from "@/lib/systems/bazi/names";

/** แถบนับจำนวนธาตุ: สีเดียว ระบุธาตุด้วยข้อความ ไม่ใช้สีแทนธาตุ (อ่านได้สำหรับผู้ที่ตาบอดสี) */
export function ElementBars({ counts, highlight }: { counts: Record<Element, number>; highlight: Element }) {
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-2" role="table" aria-label="จำนวนอักษรของแต่ละธาตุ">
      {ELEMENTS.map((e) => {
        const info = ELEMENT_INFO[e];
        const n = counts[e];
        return (
          <div key={e} role="row" className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-2 text-sm" title={`ธาตุ${info.th}: ${n} ตัว`}>
            <span role="rowheader" className={e === highlight ? "font-semibold" : "text-[var(--muted)]"}>
              {info.zh} {info.th}
              {e === highlight && <span className="ml-1 text-xs text-[var(--accent)]">ตัวเรา</span>}
            </span>
            <span className="h-3 rounded-r bg-[var(--border)]/40">
              {n > 0 && <span className="block h-3 rounded-r bg-[var(--accent)]" style={{ width: `${(n / max) * 100}%` }} />}
            </span>
            <span role="cell" className="text-right tabular-nums">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
