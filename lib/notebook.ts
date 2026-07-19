import type { FragmentVersion, Notebook } from "./types";

// Заведение новой тетради (ТЗ §3.2): чистая часть — валидация и сборка
// записей. Побочные эффекты (запись, редирект) остаются в server action,
// поэтому эту логику можно проверить без Next.

export interface NewNotebookInput {
  title: string;
  text: string;
}

export type NewNotebookResult =
  | { ok: true; notebook: Notebook; version: FragmentVersion }
  | { ok: false; error: string };

/**
 * Собирает тетрадь и её первую версию фрагмента. Тетрадь рождается сразу с
 * текстом — иначе закон итерации не даст создать ни одного прохода (§3.4).
 */
export function buildNewNotebook(
  input: NewNotebookInput,
  now: string,
  newId: () => string,
): NewNotebookResult {
  const title = input.title.trim();
  const text = input.text.trim();
  if (title === "") return { ok: false, error: "Дайте тетради название." };
  if (text === "") return { ok: false, error: "Вставьте первый текст фрагмента." };

  const notebook: Notebook = {
    id: newId(),
    title,
    createdAt: now,
    updatedAt: now,
    versionIds: [],
    passIds: [],
  };
  const version: FragmentVersion = {
    id: newId(),
    notebookId: notebook.id,
    text,
    createdAt: now,
  };
  notebook.versionIds.push(version.id);
  return { ok: true, notebook, version };
}
