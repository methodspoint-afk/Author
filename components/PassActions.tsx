"use client";

import { useActionState, useState } from "react";
import { markDispatched, submitPassResponse, type ActionResult } from "../app/desk/actions";
import type { PassStatus } from "../lib/types";

// BYOK-ритуал (ТЗ §6.1): передать депешу — вставить ответ.

interface PassActionsProps {
  passId: string;
  status: PassStatus;
  promptText: string;
  lastParseFailed?: boolean;
}

export default function PassActions({
  passId,
  status,
  promptText,
  lastParseFailed,
}: PassActionsProps) {
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    submitPassResponse,
    undefined,
  );

  if (status === "completed") return null;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      // Буфер недоступен (например, http без https) — текст депеши
      // всё равно виден в свёрнутом блоке выше, можно скопировать руками.
    }
    setCopied(true);
    if (status === "draft") {
      const formData = new FormData();
      formData.set("passId", passId);
      await markDispatched(formData);
    }
  }

  return (
    <div className="pass-actions">
      <button type="button" className="depesha-button primary" onClick={copyPrompt}>
        {copied ? "✓ Промпт скопирован" : status === "draft" ? "Скопировать промпт" : "Скопировать промпт ещё раз"}
      </button>
      {copied && (
        <div className="depesha-instruction">
          <b>Что дальше:</b>
          <ol>
            <li>Откройте ChatGPT или Claude в соседней вкладке.</li>
            <li>Вставьте промпт (уже в буфере) и отправьте.</li>
            <li>Скопируйте ответ наставника и вставьте его сюда, ниже.</li>
          </ol>
          <p className="depesha-note">Ваш текст остаётся у вас — промпт вы отправляете сами.</p>
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="passId" value={passId} />
        <textarea
          name="rawResponse"
          className="response-input"
          placeholder="Вставьте сюда ответ наставника…"
          rows={5}
        />
        <button type="submit" className="depesha-button primary" disabled={pending}>
          {pending ? "Разбираю ответ…" : "Вставить ответ наставника"}
        </button>
      </form>
      {state?.error !== undefined && <p className="error-note">{state.error}</p>}
      {state?.error === undefined && lastParseFailed === true && (
        <p className="error-note">
          Прошлый ответ не разобрался по формату — он сохранён целиком, можно вставить исправленный.
        </p>
      )}
    </div>
  );
}
