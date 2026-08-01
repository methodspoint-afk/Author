"use client";

import { useEffect, useState } from "react";

// Плашка секретаря: заметная подсказка, которую можно убрать крестиком.
// Закрытие запоминается по id (localStorage) — одна и та же подсказка не
// нудит повторно; сменится ситуация → сменится id → плашка вернётся.

interface SecretaryNoteProps {
  id: string;
  children: React.ReactNode;
}

export default function SecretaryNote({ id, children }: SecretaryNoteProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(`secretary-dismissed:${id}`);
    setShown(dismissed === null);
  }, [id]);

  function dismiss() {
    window.localStorage.setItem(`secretary-dismissed:${id}`, "1");
    setShown(false);
  }

  if (!shown) return null;

  return (
    <aside className="secretary-plashka" role="status">
      <span className="secretary-plashka-badge">Секретарь</span>
      <div className="secretary-plashka-body">{children}</div>
      <button
        type="button"
        className="secretary-plashka-close"
        onClick={dismiss}
        aria-label="Убрать подсказку"
      >
        ×
      </button>
    </aside>
  );
}
