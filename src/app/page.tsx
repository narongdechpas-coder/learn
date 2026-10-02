import Link from "next/link";
import { ORIGIN_LABELS, SYSTEMS, type Origin } from "@/lib/systems/registry";

const ORIGINS: Origin[] = ["thai", "western", "chinese"];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Horoscope Hub</h1>
        <p className="text-[var(--muted)]">รวมศาสตร์ดูดวงจากไทย ตะวันตก และจีน ไว้ในที่เดียว</p>
      </section>
      {ORIGINS.map((origin) => (
        <section key={origin} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gold)]">{ORIGIN_LABELS[origin]}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SYSTEMS.filter((s) => s.origin === origin).map((s) =>
              s.available ? (
                <Link
                  key={s.id}
                  href={s.href}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]"
                >
                  <div className="font-semibold">{s.name}</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.description}</p>
                </Link>
              ) : (
                <div key={s.id} className="rounded-xl border border-dashed border-[var(--border)] p-4 opacity-60">
                  <div className="flex items-center justify-between font-semibold">
                    {s.name}
                    <span className="rounded-full border border-[var(--border)] px-2 text-xs font-normal">เร็ว ๆ นี้</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.description}</p>
                </div>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
