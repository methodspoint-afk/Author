import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "IrinaOS — Мастерская",
  description: "Стол и Кабинет: рабочее место автора, который пишет сам",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="topbar">
          <Link href="/desk" className="brand">
            IrinaOS
          </Link>
          <nav className="nav">
            <Link href="/desk">Стол</Link>
            <span className="nav-soon" title="Появится на шаге 5 дорожной карты">
              Кабинет
            </span>
          </nav>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
