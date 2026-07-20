"use client";

import { useActionState } from "react";
import { createNotebook, type ActionResult } from "../app/desk/actions";

// Заведение тетради с нуля. По умолчанию свёрнуто — Стол молчит, пока его
// не спросили (ТЗ §5.5). Раскрывается по «Новая тетрадь».
export default function NewNotebookForm() {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createNotebook,
    undefined,
  );

  return (
    <details className="new-notebook">
      <summary>Новая тетрадь</summary>
      <form action={formAction} className="lens-form">
        <label>
          Название
          <input
            type="text"
            name="title"
            placeholder="например: Малышка в туфлях"
            autoComplete="off"
            required
          />
        </label>
        <label>
          Первый текст фрагмента
          <textarea
            name="text"
            className="response-input"
            rows={8}
            placeholder="Вставьте или напишите фрагмент, с которого начнётся работа."
            required
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Завожу…" : "Завести тетрадь"}
        </button>
        {state?.error !== undefined && <p className="error-note">{state.error}</p>}
      </form>
    </details>
  );
}
