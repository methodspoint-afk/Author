"use client";

import { useActionState, useState } from "react";
import { deletePass, markDispatched, submitPassResponse, type ActionResult } from "../app/desk/actions";
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
      <button type="button" className="copy-button" onClick={copyPrompt}>
        {copied ? "Депеша скопирована" : status === "draft" ? "Передать депешу" : "Скопировать ещё раз"}
      </button>
      <p className="pane-hint">
        Вставьте депешу в claude.ai, а полученный ответ — сюда.
      </p>
      <form action={formAction}>
        <input type="hidden" name="passId" value={passId} />
        <textarea
          name="rawResponse"
          className="response-input"
          placeholder="Ответ из claude.ai…"
          rows={5}
        />
        <button type="submit" disabled={pending}>
          {pending ? "Разбираю…" : "Вставить ответ"}
        </button>
      </form>
      {state?.error !== undefined && <p className="error-note">{state.error}</p>}
      {state?.error === undefined && lastParseFailed === true && (
        <p className="error-note">
          Прошлый ответ не разобрался по формату — он сохранён целиком, можно вставить исправленный.
        </p>
      )}
      {!confirmingDelete ? (
        <button
          type="button"
          className="delete-button"
          onClick={() => setConfirmingDelete(true)}
        >
          Удалить проход
        </button>
      ) : (
        <form action={deletePass} className="delete-confirm">
          <input type="hidden" name="passId" value={passId} />
          <span>Удалить без следа?</span>
          <button type="submit" className="delete-button">
            Да, удалить
          </button>
          <button type="button" className="delete-button" onClick={() => setConfirmingDelete(false)}>
            Оставить
          </button>
        </form>
      )}
    </div>
  );
}
