import type { FragmentVersion, Notebook, Pass } from "./types";

// «Голос автора» (Процесс 2, docs/ДВА-ПРОЦЕССА.md). Единица анализа — АВТОР:
// кросс-текстовый разбор голоса поверх корпуса. Вход открывается не от одной
// сверки (это была ошибка старой «Как растёт голос»), а только когда накопились
// РАЗНЫЕ тексты, прошедшие ПОЛНЫЙ цикл. Тогда есть что сравнивать между собой.

export const AUTHOR_VOICE_MIN_TEXTS = 3;

/**
 * Прошёл ли текст полный цикл (docs/ДВА-ПРОЦЕССА.md, Процесс 1):
 * «Не высушить» (≥1) + «Сверить» (≥2) + «Усилить» (≥1) — все завершённые.
 * «Не высушить» здесь — обязательное условие входа в корпус (притяжение, не
 * запрет на Столе): кто хочет, чтобы текст зачёлся в голос, начнёт с диагностики.
 */
export function textCompletedCycle(notebook: Notebook, passes: Pass[]): boolean {
  const inNotebook = new Set(notebook.passIds);
  let dryOut = 0;
  let checks = 0;
  let strengthen = 0;
  for (const pass of passes) {
    if (!inNotebook.has(pass.id) || pass.status !== "completed") continue;
    if (pass.type === "dry-out") dryOut += 1;
    else if (pass.type === "mentor-compass") checks += 1;
    else if (pass.type === "strengthen") strengthen += 1;
  }
  return dryOut >= 1 && checks >= 2 && strengthen >= 1;
}

/** Тетради, прошедшие полный цикл, в порядке появления. */
export function fullyCycledNotebooks(notebooks: Notebook[], passes: Pass[]): Notebook[] {
  return notebooks.filter((notebook) => textCompletedCycle(notebook, passes));
}

/** Доступен ли «Голос автора»: ≥3 разных текста прошли полный цикл. */
export function authorVoiceEligible(notebooks: Notebook[], passes: Pass[]): boolean {
  return fullyCycledNotebooks(notebooks, passes).length >= AUTHOR_VOICE_MIN_TEXTS;
}

export interface AuthorVoiceText {
  title: string;
  text: string; // финальная версия текста
  intention?: string; // намерение автора, если называл в проходах
}

/**
 * Материал для депеши «Голос автора»: по каждому тексту, прошедшему полный цикл,
 * — финальная версия + намерение (из последнего прохода-линзы, если было).
 * Именно ФИНАЛЬНЫЕ версии: голос сравниваем на том, к чему текст пришёл.
 */
export function authorVoiceInput(
  notebooks: Notebook[],
  versions: FragmentVersion[],
  passes: Pass[],
): AuthorVoiceText[] {
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const result: AuthorVoiceText[] = [];

  for (const notebook of fullyCycledNotebooks(notebooks, passes)) {
    const lastVersionId = notebook.versionIds[notebook.versionIds.length - 1];
    const finalVersion = lastVersionId !== undefined ? versionById.get(lastVersionId) : undefined;
    if (finalVersion === undefined || finalVersion.text.trim() === "") continue;

    // Намерение — из последнего завершённого прохода-линзы, где автор его называл.
    const inNotebook = new Set(notebook.passIds);
    let intention: string | undefined;
    for (const pass of passes) {
      if (!inNotebook.has(pass.id)) continue;
      if (pass.intention !== undefined && pass.intention.trim() !== "") {
        intention = pass.intention.trim();
      }
    }

    result.push({
      title: notebook.title,
      text: finalVersion.text,
      ...(intention !== undefined && { intention }),
    });
  }

  return result;
}
