"use client";

import { useActionState, useEffect, useState } from "react";
import type { ToolbarResult } from "../app/desk/actions";

// Кнопка-действие в панели тетради с видимым откликом: пока действие идёт —
// «работаю…», после — короткая галочка-подтверждение, что нажатие сработало.

interface ToolbarActionButtonProps {
  action: (prev: ToolbarResult | undefined, formData: FormData) => Promise<ToolbarResult>;
  notebookId: string;
  label: string;
  pendingLabel: string;
}

export default function ToolbarActionButton({
  action,
  notebookId,
  label,
  pendingLabel,
}: ToolbarActionButtonProps) {
  const [state, formAction, pending] = useActionState<ToolbarResult | undefined, FormData>(
    action,
    undefined,
  );
  const [flash, setFlash] = useState<ToolbarResult | undefined>(undefined);

  // Отклик не убегает сам — держится, пока автор не уберёт его крестиком
  // (раньше гас за 3–4 сек и его не успевали прочитать).
  useEffect(() => {
    if (state === undefined) return;
    setFlash(state);
  }, [state]);

  return (
    <form action={formAction} className="toolbar-action">
      <input type="hidden" name="notebookId" value={notebookId} />
      <button type="submit" className="toolbar-button" disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
      {flash !== undefined && (
        <span className="toolbar-flash" data-ok={flash.ok} role="status" aria-live="polite">
          {flash.ok ? `✓ ${flash.message}` : flash.message}
          <button
            type="button"
            className="toolbar-flash-close"
            onClick={() => setFlash(undefined)}
            aria-label="Убрать"
          >
            ×
          </button>
        </span>
      )}
    </form>
  );
}
