"use client";

import { useActionState, useEffect, useState } from "react";
import { deletePass, markDispatched, submitPassResponse, type ActionResult } from "../app/desk/actions";
import { AI_LINK_KEY, aiLinkLabel, DEFAULT_AI_LINK, normalizeAiLink } from "../lib/aiLink";
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
  const [aiLink, setAiLink] = useState(DEFAULT_AI_LINK);
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  // Адрес своей ИИ — из браузера автора (BYOK: система ИИ не навязывает).
  useEffect(() => {
    const stored = window.localStorage.getItem(AI_LINK_KEY);
    if (stored !== null && normalizeAiLink(stored) !== undefined) setAiLink(stored);
  }, []);

  function saveLink() {
    const normalized = normalizeAiLink(linkDraft);
    if (normalized !== undefined) {
      window.localStorage.setItem(AI_LINK_KEY, normalized);
      setAiLink(normalized);
    }
    setEditingLink(false);
  }
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
      {!editingLink ? (
        <p className="pane-hint">
          Вставьте депешу в{" "}
          <a href={aiLink} target="_blank" rel="noreferrer">
            {aiLinkLabel(aiLink)}
          </a>
          , а полученный ответ — сюда.{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setLinkDraft(aiLink);
              setEditingLink(true);
            }}
          >
            изменить
          </button>
        </p>
      ) : (
        <p className="pane-hint ai-link-edit">
          Адрес вашей ИИ:{" "}
          <input
            type="text"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            placeholder="например: chatgpt.com или gemini.google.com"
            autoComplete="off"
          />{" "}
          <button type="button" className="link-button" onClick={saveLink}>
            сохранить
          </button>{" "}
          <button type="button" className="link-button" onClick={() => setEditingLink(false)}>
            отмена
          </button>
        </p>
      )}
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
