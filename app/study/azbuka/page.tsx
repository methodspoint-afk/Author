import Link from "next/link";
import { GLOSSARY } from "../../../lib/glossary";

// Азбука мастерской — глоссарий для автора. Источник слов — lib/glossary.ts
// (тот же, что и всплывающие подсказки в интерфейсе): один источник правды.

export default function AzbukaPage() {
  return (
    <>
      <p className="back-link">
        <Link href="/study">← Кабинет</Link>
      </p>
      <h1>Азбука мастерской</h1>
      <p className="empty-note">
        Короткий словарь слов, которыми говорит мастерская. Если встретили незнакомое —
        загляните сюда. А ещё эти пояснения всплывают прямо в интерфейсе — при наведении на слово.
      </p>

      {GLOSSARY.map((group) => (
        <section key={group.title} className="glossary-group">
          <h2>{group.title}</h2>
          <dl className="glossary">
            {group.terms.map((term) => (
              <div key={term.word}>
                <dt>{term.word}</dt>
                <dd>{term.gloss}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}
