"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SUITS } from "@/lib/systems/playing-cards/deck";
import { newSeed } from "@/lib/systems/playing-cards/draw";
import { SPREADS, readSpread } from "@/lib/systems/playing-cards/spreads";
import { PlayingCard } from "@/components/PlayingCard";

const TONE_LABEL = { good: "ดี", neutral: "กลาง ๆ", caution: "ระวัง" } as const;

export function PlayingCardsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qSpread = params.get("s");
  const qSeed = params.get("seed");
  const qQuestion = params.get("q") ?? "";
  const [spreadId, setSpreadId] = useState(qSpread ?? SPREADS[0].id);
  const [question, setQuestion] = useState(qQuestion);

  const reading = useMemo(() => {
    const seed = Number(qSeed);
    if (!qSpread || !qSeed || !Number.isInteger(seed) || seed < 0) return null;
    return readSpread(qSpread, seed);
  }, [qSpread, qSeed]);

  function draw(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ s: spreadId, seed: String(newSeed()) });
    if (question.trim()) q.set("q", question.trim());
    router.push(`${pathname}?${q}`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">ไพ่ป๊อก</h1>
        <p className="text-[var(--muted)]">
          ตั้งจิตอธิษฐานถึงเรื่องที่อยากรู้ แล้วกดเปิดไพ่ ไพ่แต่ละดอกมีความหมายต่างกัน:{" "}
          {Object.values(SUITS).map((s) => `${s.symbol} ${s.theme}`).join(" · ")}
        </p>
      </section>

      <form onSubmit={draw} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap gap-2">
          {SPREADS.map((s) => (
            <label
              key={s.id}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                spreadId === s.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              <input type="radio" name="spread" value={s.id} checked={spreadId === s.id} onChange={() => setSpreadId(s.id)} className="sr-only" />
              <span className="font-semibold">{s.name}</span>
              <span className="block text-xs text-[var(--muted)]">{s.description}</span>
            </label>
          ))}
        </div>
        <input
          type="text"
          placeholder="คำถามของคุณ (ไม่บังคับ) เช่น งานใหม่จะเป็นอย่างไร"
          maxLength={120}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-white">
          สับไพ่และเปิดไพ่
        </button>
      </form>

      {reading && (
        <section className="space-y-4">
          {qQuestion && <p className="text-lg">คำถาม: “{qQuestion}”</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {reading.cards.map(({ position, card }) => (
              <div key={card.id} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                <div className="text-sm font-semibold text-[var(--gold)]">{position}</div>
                <PlayingCard card={card} />
                <div className="text-sm">
                  {card.rank} {SUITS[card.suit].name} · <span className="text-[var(--muted)]">{TONE_LABEL[card.tone]}</span>
                </div>
                <p className="text-sm leading-relaxed">{card.meaning}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="font-semibold text-[var(--accent)]">สรุปคำทำนาย</h3>
            <p className="mt-1 leading-relaxed">{reading.summary}</p>
          </div>
          <p className="text-xs text-[var(--muted)]">คัดลอกลิงก์ของหน้านี้ไปแชร์ได้ คนที่เปิดลิงก์จะเห็นไพ่ชุดเดียวกับคุณ</p>
        </section>
      )}
    </div>
  );
}
