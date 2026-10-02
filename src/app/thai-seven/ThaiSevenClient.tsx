"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { calculateSeven, sumLevel, type SevenResult } from "@/lib/systems/thai-seven/calculate";
import { interpretSeven } from "@/lib/systems/thai-seven/story";
import { ReadingList } from "@/components/ReadingList";

const LEVEL_STYLE = { สูง: "text-emerald-600", กลาง: "text-[var(--muted)]", ต่ำ: "text-rose-500" } as const;

function compute(date: string | null, time: string | null): { result?: SevenResult; error?: string } {
  if (!date) return {};
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return { error: "รูปแบบวันที่ไม่ถูกต้อง" };
  try {
    return { result: calculateSeven({ year: +m[1], month: +m[2], day: +m[3], time: time || undefined }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function ThaiSevenClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qDate = params.get("d");
  const qTime = params.get("t");
  const [date, setDate] = useState(qDate ?? "");
  const [time, setTime] = useState(qTime ?? "");
  const { result, error } = useMemo(() => compute(qDate, qTime), [qDate, qTime]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ d: date });
    if (time) q.set("t", time);
    router.push(`${pathname}?${q}`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-semibold">เลข 7 ตัว</h1>
        <p className="text-[var(--muted)]">
          ใส่วันเกิดเพื่อวางดวงเลข 7 ตัว 4 ฐาน ระบบจะแปลงเป็นวันทางจันทรคติไทยให้เอง ถ้ารู้เวลาเกิดให้ใส่ด้วย
          เพราะถ้าเกิดก่อน 06:00 จะนับเป็นวันก่อนหน้า และถ้าเกิดวันพุธหลัง 18:00 จะนับเป็นพุธกลางคืน (ราหู)
        </p>
      </section>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="flex flex-col gap-1 text-sm">
          วันเกิด
          <input
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          เวลาเกิด (ไม่บังคับ)
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-[var(--on-accent)]">
          ดูดวง
        </button>
      </form>

      {error && <p className="text-rose-500">{error}</p>}

      {result && (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">คำทำนาย</h2>
            <p className="text-[var(--muted)]">
              วัน{result.dayName} {result.lunar.phase} {result.lunar.kham} ค่ำ {result.monthName} ปี{result.lunar.naksatrName}
              {result.shiftedToPreviousDay && (
                <span className="text-sm text-[var(--muted)]"> (เกิดก่อน 06:00 จึงนับเป็นวันก่อนหน้า)</span>
              )}
            </p>
            <ReadingList items={interpretSeven(result)} />
          </section>
          <details className="rounded-xl border border-[var(--border)] p-4">
            <summary className="cursor-pointer font-semibold">ดูตารางเลข 7 ตัว (สำหรับผู้สนใจโหราศาสตร์)</summary>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full table-fixed text-center" data-testid="seven-table">
                  <tbody>
                    {result.rows.map((row, r) => (
                      <tr key={r} className="border-b border-[var(--border)]">
                        {row.map((cell) => (
                          <td key={cell.house} className="px-0.5 py-2 sm:p-2" title={cell.meaning}>
                            <div className="text-xl sm:text-2xl font-semibold">{cell.value}</div>
                            <div className={`text-[10px] sm:text-xs ${cell.negative ? "text-rose-500" : "text-[var(--muted)]"}`}>{cell.house}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-[var(--bg)]">
                      {result.sums.map((s, c) => (
                        <td key={c} className="px-0.5 py-2 sm:p-2">
                          <div className="text-xl sm:text-2xl font-semibold text-[var(--gold)]">{s}</div>
                          <div className={`text-[10px] sm:text-xs ${LEVEL_STYLE[sumLevel(s)]}`}>กำลัง{sumLevel(s)}</div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[var(--muted)]">
                แถว 1 เริ่มจากเลขวันเกิด แถว 2 เริ่มจากเดือนจันทรคติ แถว 3 เริ่มจากปีนักษัตร (เปลี่ยนปีตามจุลศักราช
                ราวกลางเดือนเมษายน) แถวล่างคือผลรวมของแต่ละหลัก ชื่อภพสีแดงคือภพฝ่ายร้าย
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
