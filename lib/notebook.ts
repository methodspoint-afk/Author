import type { FragmentVersion, Notebook, Pass } from "./types";

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

// --- Удаление прохода ---
// Закон итерации прямо предлагает «отправьте депешу или удалите его» (§3.4);
// удаление — выход из тупика ошибочного черновика. Завершённые проходы
// не удаляются: диагноз получен, он часть истории тетради.

export type RemovePassResult =
  | { ok: true; notebooks: Notebook[]; passes: Pass[]; notebookId: string }
  | { ok: false; error: string };

export function removePass(
  notebooks: Notebook[],
  passes: Pass[],
  passId: string,
  now: string,
): RemovePassResult {
  const pass = passes.find((entry) => entry.id === passId);
  if (pass === undefined) return { ok: false, error: "Проход не найден." };
  if (pass.status === "completed") {
    return { ok: false, error: "Диагноз уже получен — такой проход не удаляется." };
  }

  const nextPasses = passes.filter((entry) => entry.id !== passId);
  const nextNotebooks = notebooks.flatMap((notebook) => {
    if (notebook.id !== pass.notebookId) return [notebook];
    const passIds = notebook.passIds.filter((id) => id !== passId);
    // Тетрадь-призрак (изыскание/аудит без версий), оставшаяся пустой,
    // уходит вместе с проходом.
    if (notebook.versionIds.length === 0 && passIds.length === 0) return [];
    return [{ ...notebook, passIds, updatedAt: now }];
  });

  return { ok: true, notebooks: nextNotebooks, passes: nextPasses, notebookId: pass.notebookId };
}

// --- Переименование и удаление тетради ---

/** Чистое имя тетради: обрезанное и непустое, иначе undefined. */
export function cleanTitle(raw: string): string | undefined {
  const title = raw.trim();
  return title === "" ? undefined : title;
}

export interface RemoveNotebookResult {
  notebooks: Notebook[];
  versions: FragmentVersion[];
  passes: Pass[];
}

/**
 * Удаление тетради вместе с её версиями и проходами. Файл кейса в картотеке
 * (learning/corpus/) — отдельный зафиксированный артефакт, его не трогаем.
 */
export function removeNotebook(
  notebooks: Notebook[],
  versions: FragmentVersion[],
  passes: Pass[],
  notebookId: string,
): RemoveNotebookResult {
  return {
    notebooks: notebooks.filter((notebook) => notebook.id !== notebookId),
    versions: versions.filter((version) => version.notebookId !== notebookId),
    passes: passes.filter((pass) => pass.notebookId !== notebookId),
  };
}
