"use client";

import { useActionState, useState } from "react";
import { createNotebook, type ActionResult } from "../app/desk/actions";

// Окно текста на Столе (ТЗ «Тетрадь» v1 §6): главный вход в работу.
// Лимит 5000 знаков, мягкое предупреждение с 4500 (§5).

const LIMIT = 5000;
const WARN_AT = 4500;

export default function NewNotebookForm() {
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    createNotebook,
    undefined,
  );

  const count = text.length;
  const status = count === 0 ? "empty" : "draft";

  return (
    <form action={formAction} className="workwin" data-status={status}>
      <div className="win-head">
        <span>Новая тетрадь</span>
        <input
          type="text"
          name="title"
          className="win-title-input"
          placeholder="название — или подберём по первым словам"
          maxLength={60}
        />
      </div>
      <textarea
        name="text"
        className="win-editor"
        placeholder="Бери перо, пиши. Или вставь готовый текст — и начнём Прописи."
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={9}
      />
      <div className="win-foot">
        <span className={count > WARN_AT ? "char-count warn" : "char-count"}>
          {count} / {LIMIT}
          {count > WARN_AT && count <= LIMIT && " — тетрадь почти полна"}
          {count > LIMIT && " — не помещается, сократите или разделите"}
        </span>
        {state?.error !== undefined && <span className="error-note">{state.error}</span>}
        <button type="submit" disabled={pending || count === 0 || count > LIMIT}>
          {pending ? "Кладём в тетрадь…" : "Положить в тетрадь"}
        </button>
      </div>
    </form>
  );
}
