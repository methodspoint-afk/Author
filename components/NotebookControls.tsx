"use client";

import { useActionState, useState } from "react";
import { deleteNotebook, renameNotebook, type ActionResult } from "../app/desk/actions";

// Гигиена тетради: поправить название, убрать ошибочную. Тихо, без модалов —
// переименование инлайн, удаление в два шага (как у прохода).
export default function NotebookControls({
  notebookId,
  title,
}: {
  notebookId: string;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, formData) => {
      const result = await renameNotebook(prev, formData);
      if (result.error === undefined) setEditing(false);
      return result;
    },
    undefined,
  );

  return (
    <div className="notebook-controls">
      {editing ? (
        <form action={formAction} className="rename-form">
          <input type="hidden" name="notebookId" value={notebookId} />
          <input
            type="text"
            name="title"
            defaultValue={title}
            autoComplete="off"
            aria-label="Название тетради"
            required
          />
          <button type="submit" className="toolbar-button" disabled={pending}>
            {pending ? "Сохраняю…" : "Сохранить"}
          </button>
          <button type="button" className="delete-button" onClick={() => setEditing(false)}>
            отмена
          </button>
          {state?.error !== undefined && <span className="error-note">{state.error}</span>}
        </form>
      ) : (
        <button type="button" className="toolbar-button" onClick={() => setEditing(true)}>
          Переименовать
        </button>
      )}

      {!confirmingDelete ? (
        <button type="button" className="delete-button" onClick={() => setConfirmingDelete(true)}>
          Удалить тетрадь
        </button>
      ) : (
        <form action={deleteNotebook} className="delete-confirm">
          <input type="hidden" name="notebookId" value={notebookId} />
          <span>Удалить тетрадь со всеми версиями и проходами?</span>
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
