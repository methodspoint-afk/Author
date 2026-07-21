import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Стол и Кабинет",
  description: "Рабочее место автора, который пишет сам и растит свой голос",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="topbar">
          <Link href="/desk" className="brand">
            Стол и Кабинет
          </Link>
          <nav className="nav">
            <Link href="/desk">Стол</Link>
            <Link href="/study">Кабинет</Link>
          </nav>
        </header>
        <main className="page">{children}</main>
        <footer className="bottombar">
          <a href="mailto:methodspoint@gmail.com?subject=Стол%20и%20Кабинет">✉ Письмо мастеру</a>
        </footer>
      </body>
    </html>
  );
}
