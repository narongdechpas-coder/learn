"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DECK, SUITS } from "@/lib/systems/playing-cards/deck";
import { SPREADS, getSpread, readSpread } from "@/lib/systems/playing-cards/spreads";
import { parsePicks } from "@/lib/random";
import { CardDrawFlow, type DrawResult } from "@/components/CardDrawFlow";
import { PlayingCard } from "@/components/PlayingCard";

const FLOW_SPREADS = SPREADS.map((s) => ({ id: s.id, name: s.name, description: s.description, positions: s.positions }));

const TONE_LABEL = { good: "ดี", neutral: "กลาง ๆ", caution: "ระวัง" } as const;

export function PlayingCardsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qSpread = params.get("s");
  const qSeed = params.get("seed");
  const qPick = params.get("pick");
  const qQuestion = params.get("q") ?? "";

  const reading = useMemo(() => {
    const seed = Number(qSeed);
    if (!qSpread || !qSeed || !Number.isInteger(seed) || seed < 0) return null;
    const picks = parsePicks(qPick, DECK.length, getSpread(qSpread).positions.length);
    return readSpread(qSpread, seed, picks);
  }, [qSpread, qSeed, qPick]);

  function reveal({ spreadId, seed, picks, question }: DrawResult) {
    const q = new URLSearchParams({ s: spreadId, seed: String(seed), pick: picks.join(",") });
    if (question) q.set("q", question);
    router.push(`${pathname}?${q}`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">ไพ่ป๊อก</h1>
        <p className="text-[var(--muted)]">
          ตั้งจิตถึงเรื่องที่อยากรู้ กดสับไพ่ แล้วเลือกไพ่ด้วยตัวเอง ไพ่แต่ละดอกมีความหมายต่างกัน:{" "}
          {Object.values(SUITS).map((s) => `${s.symbol} ${s.theme}`).join(" · ")}
        </p>
      </section>

      {!reading && (
        <CardDrawFlow
          spreads={FLOW_SPREADS}
          deckSize={DECK.length}
          cardAspect="aspect-[5/7]"
          questionPlaceholder="เช่น งานใหม่จะเป็นอย่างไร"
          onReveal={reveal}
        />
      )}

      {reading && (
        <section className="space-y-4">
          {qQuestion && <p className="text-lg">คำถาม: “{qQuestion}”</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {reading.cards.map(({ position, card }, i) => (
              <div
                key={card.id}
                className="animate-card-in flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
                style={{ animationDelay: `${i * 150}ms` }}
              >
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
          <button type="button" onClick={() => router.push(pathname)} className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-white">
            🔀 ดูดวงใหม่
          </button>
        </section>
      )}
    </div>
  );
}
