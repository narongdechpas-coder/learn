export interface ReadingItem {
  heading: string;
  body: string;
  advice?: string;
}

export function ReadingList({ items }: { items: ReadingItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.heading} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="font-semibold text-[var(--accent)]">{r.heading}</h3>
          <p className="mt-1 leading-relaxed">{r.body}</p>
          {r.advice && (
            <p className="mt-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed">
              <span className="font-semibold">💡 สิ่งที่ควรทำ: </span>
              {r.advice}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
