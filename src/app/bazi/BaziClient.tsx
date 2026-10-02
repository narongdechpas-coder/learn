"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { calculateBazi, interpretBazi, type BaziResult, type Gender } from "@/lib/systems/bazi/calculate";
import { ELEMENT_INFO, TEN_GODS } from "@/lib/systems/bazi/names";
import { ReadingList } from "@/components/ReadingList";
import { ElementBars } from "./ElementBars";

const yinYang = (yang: boolean) => (yang ? "หยาง" : "หยิน");

function compute(date: string | null, time: string | null, gender: string | null): { result?: BaziResult; error?: string } {
  if (!date) return {};
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return { error: "รูปแบบวันที่ไม่ถูกต้อง" };
  const g = gender === "male" || gender === "female" ? (gender as Gender) : undefined;
  try {
    return { result: calculateBazi({ year: +m[1], month: +m[2], day: +m[3], time: time || undefined, gender: g }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function BaziClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qDate = params.get("d");
  const qTime = params.get("t");
  const qGender = params.get("g");
  const [date, setDate] = useState(qDate ?? "");
  const [time, setTime] = useState(qTime ?? "");
  const [gender, setGender] = useState(qGender ?? "");
  const { result, error } = useMemo(() => compute(qDate, qTime, qGender), [qDate, qTime, qGender]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ d: date });
    if (time) q.set("t", time);
    if (gender) q.set("g", gender);
    router.push(`${pathname}?${q}`);
  }

  const input = "rounded-lg border border-[var(--border)] bg-transparent px-3 py-2";

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">ปาจื้อ (Bazi) สี่เสาดวงชะตา</h1>
        <p className="text-[var(--muted)]">
          วางดวงจีนจากปี เดือน วัน และชั่วโมงเกิด ดูธาตุประจำตัว สมดุลธาตุทั้งห้า ธาตุที่ส่งเสริม และวัยจรทุก 10 ปี
          ใส่เวลาเกิดตามนาฬิกาไทย ถ้าไม่รู้เวลาจะไม่มีเสาชั่วโมง ส่วนเพศใช้คำนวณทิศทางของวัยจร
        </p>
      </section>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="flex flex-col gap-1 text-sm">
          วันเกิด
          <input type="date" required min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          เวลาเกิด (ไม่บังคับ)
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          เพศ (สำหรับวัยจร)
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${input} bg-[var(--surface)]`}>
            <option value="">ไม่ระบุ</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-white">
          วางดวง
        </button>
      </form>

      {error && <p className="text-rose-500">{error}</p>}

      {result && (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">สี่เสา</h2>
            <div className={`grid gap-2 ${result.pillars.length === 4 ? "grid-cols-4" : "grid-cols-3"}`} data-testid="pillars">
              {result.pillars.map((p) => (
                <div
                  key={p.key}
                  className={`rounded-xl border bg-[var(--surface)] p-2 text-center sm:p-3 ${
                    p.key === "day" ? "border-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  <div className="text-xs text-[var(--muted)]">เสา{p.label}</div>
                  <div className="mt-1 text-[11px] text-[var(--gold)] sm:text-xs">
                    {p.key === "day" ? "ตัวเรา" : TEN_GODS[p.tenGod].th}
                  </div>
                  <div className="text-3xl font-semibold sm:text-4xl" lang="zh">{p.gan}</div>
                  <div className="text-[11px] text-[var(--muted)] sm:text-xs">
                    {p.stem.th} · {ELEMENT_INFO[p.stem.element].th}{yinYang(p.stem.yang)}
                  </div>
                  <div className="mt-2 text-3xl font-semibold sm:text-4xl" lang="zh">{p.zhi}</div>
                  <div className="text-[11px] text-[var(--muted)] sm:text-xs">
                    {p.branch.animal} · {ELEMENT_INFO[p.branch.element].th}
                  </div>
                  <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)] sm:text-xs">
                    ก้านแฝง{" "}
                    {p.hidden.map((h) => (
                      <span key={h.gan} className="whitespace-nowrap" title={TEN_GODS[h.tenGod].th}>
                        <span lang="zh">{h.gan}</span>
                        {ELEMENT_INFO[h.stem.element].th}{" "}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--muted)] sm:text-xs" lang="zh">{p.nayin}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)]">
              เสาปีและเดือนเปลี่ยนตามสารทจีน (เทียบเวลาปักกิ่ง) ส่วนเสาวันและชั่วโมงใช้เวลาสุริยะของกรุงเทพฯ (ช้ากว่านาฬิกาไทยราว 18 นาที)
              ปีเปลี่ยนที่ลี่ชุน (ราว 4 ก.พ.) ไม่ใช่ตรุษจีน
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="font-semibold">ธาตุทั้งห้าในดวง</h2>
              <ElementBars counts={result.elementCounts} highlight={result.dayMaster.stem.element} />
            </div>
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <h2 className="font-semibold">กำลังของดวง</h2>
              <p>
                ธาตุประจำตัว: <span lang="zh">{result.dayMaster.gan}</span> {ELEMENT_INFO[result.dayMaster.stem.element].th}
                {yinYang(result.dayMaster.stem.yang)} · <b>{result.strong ? "ดวงแข็ง" : "ดวงอ่อน"}</b> (แรงสนับสนุน{" "}
                {Math.round(result.supportRatio * 100)}%)
              </p>
              <p>ธาตุที่ส่งเสริม: {result.favorable.map((e) => ELEMENT_INFO[e].th).join(" · ")}</p>
              <p className="text-[var(--muted)]">ธาตุที่ควรเลี่ยง: {result.unfavorable.map((e) => ELEMENT_INFO[e].th).join(" · ")}</p>
            </div>
          </section>

          {result.luck && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">วัยจร (大运) ทุก 10 ปี</h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {result.luck.map((l) => (
                  <div
                    key={l.startYear}
                    className={`rounded-lg border p-2 text-center ${
                      l.current ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)]"
                    }`}
                  >
                    <div className="text-xl font-semibold" lang="zh">{l.ganZhi}</div>
                    <div className="text-[11px] text-[var(--muted)]">{l.startYear}–{l.endYear}</div>
                    <div className="text-[11px] text-[var(--muted)]">อายุ {l.startAge}+</div>
                    <div className="text-[11px]">
                      {ELEMENT_INFO[l.stemElement].th} {l.favorable ? "✓ ส่งเสริม" : "· ไม่ส่งเสริม"}
                    </div>
                    {l.current && <div className="text-[11px] font-semibold text-[var(--accent)]">ตอนนี้</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">คำทำนาย</h2>
            <ReadingList items={interpretBazi(result)} />
          </section>
        </>
      )}
    </div>
  );
}
