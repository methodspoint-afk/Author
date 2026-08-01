"use client";

import { useEffect, useRef, useState } from "react";
import { lookupGloss } from "../lib/glossary";

// Подсказка из Азбуки прямо в интерфейсе: наведите на слово — всплывёт
// пояснение НАД словом (чтобы не перекрывать карточку), чуть правее, не
// вылезая за край экрана. Показывается не больше трёх раз на слово (счётчик в
// браузере), потом молчит — считаем, что автор запомнил.

const LIMIT = 3;

interface GlossaryTermProps {
  term: string; // ключ в Азбуке (может отличаться от видимого текста)
  children?: React.ReactNode;
}

export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const gloss = lookupGloss(term);
  const [show, setShow] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const key = `gloss-seen:${term.toLowerCase()}`;

  useEffect(() => {
    if (Number(window.localStorage.getItem(key) ?? "0") >= LIMIT) setMuted(true);
  }, [key]);

  // Позиционируем после показа: над словом, чуть правее, в пределах экрана.
  useEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (trigger === null || pop === null) return;
    const t = trigger.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    const gap = 8;
    const pad = 8;
    let top = t.top - p.height - gap; // над словом
    if (top < pad) top = t.bottom + gap; // не влезло сверху — покажем снизу
    let left = t.left + gap; // немного вправо
    const maxLeft = window.innerWidth - pad - p.width;
    if (left > maxLeft) left = maxLeft;
    if (left < pad) left = pad;
    setPos({ top, left });
  }, [show]);

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
      ref={triggerRef}
      className="gloss-term"
      onMouseEnter={reveal}
      onMouseLeave={() => setShow(false)}
    >
      {children ?? term}
      {show && (
        <span
          ref={popRef}
          className="gloss-pop"
          role="tooltip"
          style={{
            position: "fixed",
            top: pos !== null ? pos.top : -9999,
            left: pos !== null ? pos.left : -9999,
            visibility: pos !== null ? "visible" : "hidden",
          }}
        >
          {gloss}
        </span>
      )}
    </span>
  );
}
