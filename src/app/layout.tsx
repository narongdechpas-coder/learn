import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horoscope Hub",
  description: "รวมศาสตร์ดูดวง ไทย ตะวันตก และจีน ไว้ในที่เดียว",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-[var(--border)]">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/" className="whitespace-nowrap text-lg font-semibold text-[var(--accent)]">
              ✦ Horoscope Hub
            </Link>
            <div className="flex flex-wrap gap-x-4 gap-y-1 whitespace-nowrap text-sm text-[var(--muted)]">
              <Link href="/thai-seven" className="hover:text-[var(--text)]">เลข 7 ตัว</Link>
              <Link href="/playing-cards" className="hover:text-[var(--text)]">ไพ่ป๊อก</Link>
              <Link href="/tarot" className="hover:text-[var(--text)]">ไพ่ยิปซี</Link>
              <Link href="/bazi" className="hover:text-[var(--text)]">ปาจื้อ</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-8 text-center text-xs text-[var(--muted)]">
          คำทำนายทั้งหมดเพื่อความบันเทิง โปรดใช้วิจารณญาณในการตัดสินใจเรื่องสำคัญ
        </footer>
      </body>
    </html>
  );
}
