"use client";

import { useState } from "react";
import { commitVersion } from "../app/desk/actions";
import { diffWords } from "../lib/diff";

// Окно текста — святое (ТЗ §5.1, §11.1). Текст в центре, редактируемый;
// во время правки — никаких подсказок и подчёркиваний.

export interface VersionView {
  id: string;
  text: string;
  note?: string;
}

interface FragmentPaneProps {
  notebookId: string;
  versions: VersionView[];
}

export default function FragmentPane({ notebookId, versions }: FragmentPaneProps) {
  const latest = versions[versions.length - 1];
  const [selectedId, setSelectedId] = useState<string | undefined>(latest?.id);
  const selected = versions.find((version) => version.id === selectedId);
  const [draft, setDraft] = useState<string>(selected?.text ?? "");

  const changed = draft !== (latest?.text ?? "") && draft.trim() !== "";

  function selectVersion(version: VersionView) {
    setSelectedId(version.id);
    setDraft(version.text);
  }

  return (
    <section className="fragment-pane">
      {versions.length > 1 && (
        <div className="version-chips">
          {versions.map((version, index) => (
            <button
              key={version.id}
              type="button"
              className="version-chip"
              data-active={version.id === selectedId}
              onClick={() => selectVersion(version)}
            >
              Версия {index + 1}
            </button>
          ))}
        </div>
      )}

      {selected?.note !== undefined && selected.note !== "перенесено из v1" && (
        <p className="version-note">Что изменилось: {selected.note}</p>
      )}

      {selected !== undefined && <WasBecame versions={versions} selectedId={selected.id} />}

      <form action={commitVersion}>
        <input type="hidden" name="notebookId" value={notebookId} />
        <textarea
          className="fragment-text"
          name="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={versions.length === 0 ? "В этой тетради пока нет текста — начните здесь." : undefined}
          spellCheck={false}
        />
        {changed && (
          <div className="commit-bar">
            <input type="text" name="note" placeholder="Что изменилось?" autoComplete="off" />
            <button type="submit">Зафиксировать версию</button>
          </div>
        )}
      </form>

      {!changed && versions.length > 0 && (
        <p className="pane-hint">
          Правьте текст прямо здесь. Как только он изменится, появится кнопка фиксации версии.
        </p>
      )}
    </section>
  );
}

/** «Было → стало»: пословный diff выбранной версии с предыдущей (ТЗ §5.2). */
function WasBecame({ versions, selectedId }: { versions: VersionView[]; selectedId: string }) {
  const index = versions.findIndex((version) => version.id === selectedId);
  if (index < 1) return null;

  const previous = versions[index - 1];
  const current = versions[index];
  if (previous === undefined || current === undefined) return null;

  const parts = diffWords(previous.text, current.text);

  return (
    <details className="diff-block">
      <summary>Было → стало (сравнение с версией {index})</summary>
      {parts === undefined ? (
        <p className="pane-hint">Фрагмент слишком велик для пословного сравнения.</p>
      ) : (
        <p className="diff-text">
          {parts.map((part, partIndex) =>
            part.kind === "same" ? (
              <span key={partIndex}>{part.text}</span>
            ) : part.kind === "removed" ? (
              <del key={partIndex}>{part.text}</del>
            ) : (
              <ins key={partIndex}>{part.text}</ins>
            ),
          )}
        </p>
      )}
    </details>
  );
}
