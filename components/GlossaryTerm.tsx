"use client";

import { useEffect, useState } from "react";
import { lookupGloss } from "../lib/glossary";

// Подсказка из Азбуки прямо в интерфейсе: наведите на слово — всплывёт
// пояснение. Показывается не больше трёх раз на слово (потом считаем, что
// автор запомнил); счётчик — в браузере. Если слова нет в Азбуке — обычный текст.

const LIMIT = 3;

interface GlossaryTermProps {
  term: string; // ключ в Азбуке (может отличаться от видимого текста)
  children?: React.ReactNode;
}

export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const gloss = lookupGloss(term);
  const [show, setShow] = useState(false);
  const [muted, setMuted] = useState(false);
  const key = `gloss-seen:${term.toLowerCase()}`;

  useEffect(() => {
    if (Number(window.localStorage.getItem(key) ?? "0") >= LIMIT) setMuted(true);
  }, [key]);

  if (gloss === undefined) return <>{children ?? term}</>;

  function reveal() {
    if (muted) return;
    setShow(true);
    const next = Number(window.localStorage.getItem(key) ?? "0") + 1;
    window.localStorage.setItem(key, String(next));
    if (next >= LIMIT) setMuted(true);
  }

  return (
    <span
      className="gloss-term"
      onMouseEnter={reveal}
      onMouseLeave={() => setShow(false)}
    >
      {children ?? term}
      {show && (
        <span className="gloss-pop" role="tooltip">
          {gloss}
        </span>
      )}
    </span>
  );
}
