import { GROWTH_MIN_CHECKS } from "./growth";
import type { Notebook, Pass, PassType } from "./types";
import { AUTHOR_VOICE_MIN_TEXTS, fullyCycledNotebooks } from "./voice";

// «Момент близости» (Q6, docs/ДВА-ПРОЦЕССА.md): секретарь мягко замечает, что до
// разблокировки мета-разбора — один шаг. Возможность, не обязанность: чистые
// детекторы, никакой блокировки. Один голос за раз обеспечивают страницы.

function countCompleted(notebook: Notebook, passes: Pass[], type: PassType): number {
  const inNotebook = new Set(notebook.passIds);
  return passes.filter(
    (pass) => inNotebook.has(pass.id) && pass.status === "completed" && pass.type === type,
  ).length;
}

/** «Разбор роста» на подходе: в тетради не хватает ровно одной сверки до порога. */
export function growthNear(notebook: Notebook, passes: Pass[]): boolean {
  return countCompleted(notebook, passes, "mentor-compass") === GROWTH_MIN_CHECKS - 1;
}

export type CycleMissing = "strengthen" | "dry-out" | null;

/**
 * Единственный недостающий шаг до полного цикла (условие входа в «Голос автора»).
 * Смотрим только когда сверок уже ≥2 (иначе про близость цикла говорить рано):
 *  - есть «Не высушить», нет «Усилить» → не хватает «Усилить»;
 *  - есть «Усилить», нет «Не высушить» → не хватает «Не высушить»;
 *  - есть оба (цикл полон) или нет обоих (шага два, не близость) → null.
 */
export function cycleMissingStep(notebook: Notebook, passes: Pass[]): CycleMissing {
  if (countCompleted(notebook, passes, "mentor-compass") < 2) return null;
  const dry = countCompleted(notebook, passes, "dry-out") >= 1;
  const str = countCompleted(notebook, passes, "strengthen") >= 1;
  if (dry && !str) return "strengthen";
  if (str && !dry) return "dry-out";
  return null;
}

/** «Голос автора» на подходе: полный круг прошли ровно на один текст меньше порога. */
export function authorVoiceNear(notebooks: Notebook[], passes: Pass[]): boolean {
  return fullyCycledNotebooks(notebooks, passes).length === AUTHOR_VOICE_MIN_TEXTS - 1;
}
