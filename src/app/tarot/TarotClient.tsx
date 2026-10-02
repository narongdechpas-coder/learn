"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePicks } from "@/lib/random";
import { TAROT_DECK, TAROT_SUITS } from "@/lib/systems/tarot/deck";
import { TAROT_SPREADS, getTarotSpread, readTarot } from "@/lib/systems/tarot/spreads";
import { CardDrawFlow, type DrawResult } from "@/components/CardDrawFlow";
import { TarotCard } from "@/components/TarotCard";
import { CelticCross } from "./CelticCross";

const FLOW_SPREADS = TAROT_SPREADS.map((s) => ({
  id: s.id, name: s.name, description: s.description, positions: s.positions.map((p) => p.name),
}));

export function TarotClient() {
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
    const picks = parsePicks(qPick, TAROT_DECK.length, getTarotSpread(qSpread).positions.length);
    return readTarot(qSpread, seed, picks);
  }, [qSpread, qSeed, qPick]);

  function reveal({ spreadId, seed, picks, question }: DrawResult) {
    const q = new URLSearchParams({ s: spreadId, seed: String(seed), pick: picks.join(",") });
    if (question) q.set("q", question);
    router.push(`${pathname}?${q}`);
  }

  const isCeltic = reading?.spread.id === "celtic";

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">ไพ่ยิปซี (Tarot)</h1>
        <p className="text-[var(--muted)]">
          สำรับ Rider-Waite 78 ใบ ทำสมาธิถึงเรื่องที่อยากรู้ กดสับไพ่ แล้วเลือกไพ่ที่คว่ำอยู่ด้วยตัวเอง ไพ่กลับหัวจะมีความหมายต่างจากไพ่ตั้ง
        </p>
      </section>

      {!reading && (
        <CardDrawFlow
          spreads={FLOW_SPREADS}
          deckSize={TAROT_DECK.length}
          cardAspect="aspect-[3/5]"
          questionPlaceholder="เช่น ความสัมพันธ์นี้จะไปทางไหน"
          onReveal={reveal}
        />
      )}

      {reading && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{reading.spread.name}</h2>
          {qQuestion && <p className="text-lg">คำถาม: “{qQuestion}”</p>}

          {isCeltic && <CelticCross cards={reading.cards} />}

          <div className={`grid gap-4 ${reading.cards.length === 1 ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`} data-testid="tarot-cards">
            {reading.cards.map(({ position, card, reversed }, i) => (
              <div
                key={card.id}
                style={{ animationDelay: `${i * 120}ms` }}
                className={`animate-card-in flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 ${
                  reading.cards.length === 1 ? "flex-col items-center text-center sm:flex-row sm:items-start sm:text-left" : ""
                }`}
              >
                <div className="shrink-0">
                  <TarotCard
                    card={card}
                    reversed={reversed}
                    width={reading.cards.length === 1 ? "w-40" : "w-20"}
                    label={isCeltic ? String(i + 1) : undefined}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-semibold text-[var(--gold)]">{position.name}</div>
                  <div className="text-xs text-[var(--muted)]">{position.hint}</div>
                  <div className="font-semibold">
                    {card.nameTh}
                    {reversed && <span className="ml-1 text-xs font-normal text-rose-500">กลับหัว</span>}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {card.nameEn}
                    {card.suit && ` · ธาตุ${TAROT_SUITS[card.suit].element}`} · {card.keyword}
                  </div>
                  <p className="text-sm leading-relaxed">{reversed ? card.reversed : card.upright}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="font-semibold text-[var(--accent)]">สรุปคำทำนาย</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed">
              {reading.summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
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
