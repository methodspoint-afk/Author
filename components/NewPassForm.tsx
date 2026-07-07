"use client";

import { useActionState, useState } from "react";
import { createPass, type ActionResult } from "../app/desk/actions";

// Линзы (ТЗ §11.4) — действия над открытым фрагментом, не отдельные страницы.

interface CompassOption {
  id: string;
  title: string;
  nativeGenre: string;
  axes: Array<{ key: string; label: string }>;
}

interface NewPassFormProps {
  notebookId: string;
  compasses: CompassOption[];
  allowed: boolean;
  reason?: string;
}

const LENSES = [
  { type: "dry-out", label: "Не высушивать", hint: "за счёт чего фрагмент живёт" },
  { type: "mentor-compass", label: "Проход по компасу", hint: "наставник + жанр" },
  { type: "strengthen", label: "Усилить", hint: "слабые места" },
] as const;

export default function NewPassForm({ notebookId, compasses, allowed, reason }: NewPassFormProps) {
  const [lens, setLens] = useState<(typeof LENSES)[number]["type"] | null>(null);
  const [compassId, setCompassId] = useState("");
  const selectedCompass = compasses.find((compass) => compass.id === compassId);
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, formData) => {
      const result = await createPass(prev, formData);
      if (result.error === undefined) setLens(null);
      return result;
    },
    undefined,
  );

  if (!allowed) {
    return (
      <div className="lens-block">
        <h2>Линзы</h2>
        <p className="law-note">{reason}</p>
      </div>
    );
  }

  return (
    <div className="lens-block">
      <h2>Линзы</h2>
      <div className="lens-buttons">
        {LENSES.map((entry) => (
          <button
            key={entry.type}
            type="button"
            className="lens-button"
            data-active={lens === entry.type}
            onClick={() => setLens(lens === entry.type ? null : entry.type)}
          >
            {entry.label}
            <span>{entry.hint}</span>
          </button>
        ))}
      </div>

      {lens !== null && (
        <form action={formAction} className="lens-form">
          <input type="hidden" name="notebookId" value={notebookId} />
          <input type="hidden" name="type" value={lens} />

          {lens === "mentor-compass" && (
            <>
              <label>
                Наставник
                <select
                  name="compassId"
                  value={compassId}
                  onChange={(event) => setCompassId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    — выберите компас —
                  </option>
                  {compasses.map((compass) => (
                    <option key={compass.id} value={compass.id}>
                      {compass.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedCompass !== undefined && (
                <div className="compass-axes">
                  <p>Семь осей компаса (родной жанр: {selectedCompass.nativeGenre}):</p>
                  <ul>
                    {selectedCompass.axes.map((axis) => (
                      <li key={axis.key}>{axis.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label>
                Жанр текста (если отличается от родного жанра компаса)
                <input type="text" name="targetGenre" placeholder="например: иронический детектив" />
              </label>
            </>
          )}

          <label>
            Намерение — чего вы хотите от этого фрагмента?
            <input
              type="text"
              name="intention"
              placeholder="например: чтобы финал не объяснял, а бил"
              autoComplete="off"
            />
          </label>

          <button type="submit" disabled={pending}>
            {pending ? "Собираю депешу…" : "Собрать депешу"}
          </button>
          {state?.error !== undefined && <p className="error-note">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
