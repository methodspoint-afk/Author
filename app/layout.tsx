import type { Metadata } from "next";
import { PT_Mono, PT_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Дизайн-паспорт (ТЗ «Тетрадь» v1 §10): текст — PT Serif, служебное — PT Mono.
// next/font скачивает файлы при сборке и раздаёт сам, без CDN.
const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-serif",
});
const ptMono = PT_Mono({
  weight: "400",
  subsets: ["cyrillic", "latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Стол и Кабинет",
  description: "Рабочее место автора, который пишет сам",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${ptSerif.variable} ${ptMono.variable}`}>
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
          <a href="#top">↑ Наверх</a>
          <Link href="/desk">Стол</Link>
          <Link href="/study">Кабинет</Link>
          <a href="mailto:methodspoint@gmail.com?subject=Письмо мастеру" className="letter">
            ✉ Письмо мастеру
          </a>
        </footer>
      </body>
    </html>
  );
}
