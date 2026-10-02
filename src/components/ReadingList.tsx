export function ReadingList({ items }: { items: { heading: string; body: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.heading} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="font-semibold text-[var(--accent)]">{r.heading}</h3>
          <p className="mt-1 leading-relaxed">{r.body}</p>
        </div>
      ))}
    </div>
  );
}
