"use client";

import { useEffect, useState } from "react";
import { newSeed } from "@/lib/random";

export interface FlowSpread {
  id: string;
  name: string;
  description: string;
  positions: string[];
}

export interface DrawResult {
  spreadId: string;
  seed: number;
  picks: number[];
  question: string;
}

interface Props {
  spreads: FlowSpread[];
  deckSize: number;
  /** Tailwind aspect class for a face-down card, e.g. "aspect-[5/7]" */
  cardAspect: string;
  questionPlaceholder: string;
  initialSpread?: string;
  initialQuestion?: string;
  onReveal: (draw: DrawResult) => void;
}

type Phase = "setup" | "shuffling" | "picking";

const SHUFFLE_MS = 1300;

/** ขั้นตอนดูไพ่แบบที่ผู้ใช้ทำเอง: เลือกแบบ → กดสับไพ่ → แตะเลือกไพ่ที่คว่ำอยู่ทีละใบ → เปิดไพ่ */
export function CardDrawFlow({
  spreads, deckSize, cardAspect, questionPlaceholder, initialSpread, initialQuestion = "", onReveal,
}: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [spreadId, setSpreadId] = useState(spreads.some((s) => s.id === initialSpread) ? initialSpread! : spreads[0].id);
  const [question, setQuestion] = useState(initialQuestion);
  const [seed, setSeed] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const spread = spreads.find((s) => s.id === spreadId) ?? spreads[0];
  const need = spread.positions.length;

  useEffect(() => {
    if (phase !== "shuffling") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("picking"), reduce ? 200 : SHUFFLE_MS);
    return () => clearTimeout(t);
  }, [phase, seed]);

  function shuffleDeck() {
    setSeed(newSeed());
    setPicks([]);
    setPhase("shuffling");
  }

  function toggle(i: number) {
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < need ? [...p, i] : p));
  }

  if (phase === "setup") {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-sm font-semibold">1. เลือกรูปแบบการดูไพ่</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {spreads.map((s) => (
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
        <div className="text-sm font-semibold">2. ตั้งคำถามในใจ (พิมพ์ไว้ได้ ไม่บังคับ)</div>
        <input
          type="text"
          placeholder={questionPlaceholder}
          maxLength={120}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
        />
        <button type="button" onClick={shuffleDeck} className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-[var(--on-accent)]">
          🔀 สับไพ่
        </button>
      </div>
    );
  }

  if (phase === "shuffling") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-10" aria-live="polite">
        <div className="relative h-36 w-24">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={`${seed}-${i}`}
              className={`card-back absolute inset-0 rounded-lg ${i % 2 ? "animate-riffle-right" : "animate-riffle-left"}`}
              style={{ top: -i * 2, left: i, animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        <p className="text-[var(--muted)]">กำลังสับไพ่... ตั้งจิตถึงเรื่องที่อยากรู้</p>
      </div>
    );
  }

  const done = picks.length === need;
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="space-y-2">
        <div className="font-semibold">
          3. แตะเลือกไพ่ {need} ใบ ({picks.length}/{need})
        </div>
        <div className="flex flex-wrap gap-2 text-xs" data-testid="pick-slots">
          {spread.positions.map((name, i) => (
            <span
              key={name}
              className={`rounded-full border px-2 py-0.5 ${
                i < picks.length ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {i + 1}. {name}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">ใบแรกที่เลือกจะเป็นตำแหน่งที่ 1 แตะใบที่เลือกแล้วอีกครั้งเพื่อยกเลิก</p>
      </div>

      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-13 sm:gap-2" data-testid="deck">
        {Array.from({ length: deckSize }, (_, i) => {
          const order = picks.indexOf(i);
          const picked = order >= 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={!picked && done}
              aria-label={picked ? `ไพ่ที่เลือกลำดับ ${order + 1}` : `ไพ่ใบที่ ${i + 1}`}
              aria-pressed={picked}
              className={`card-back animate-card-in relative ${cardAspect} rounded-md transition-transform ${
                picked ? "-translate-y-1.5 ring-2 ring-[var(--gold)]" : done ? "opacity-40" : "hover:-translate-y-1"
              }`}
              style={{ animationDelay: `${Math.min(i * 8, 400)}ms` }}
            >
              {picked && (
                <span className="absolute inset-0 m-auto flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-semibold text-[var(--on-accent)]">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!done}
          onClick={() => onReveal({ spreadId, seed, picks, question: question.trim() })}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 font-semibold text-[var(--on-accent)] disabled:opacity-40"
        >
          ✨ เปิดไพ่
        </button>
        <button type="button" onClick={shuffleDeck} className="rounded-lg border border-[var(--border)] px-4 py-2">
          สับใหม่
        </button>
        <button type="button" onClick={() => setPhase("setup")} className="rounded-lg px-4 py-2 text-[var(--muted)]">
          เปลี่ยนรูปแบบ
        </button>
      </div>
    </div>
  );
}
