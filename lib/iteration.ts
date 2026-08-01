import type { FragmentVersion, Notebook, Pass, PassType } from "./types";

// Закон итерации (ТЗ §3.4): следующий проход-линза по тетради возможен
// только после того, как последний завершённый проход-линза «закрыт»
// зафиксированной версией. Изыскания и сводки закону не подчиняются.

const LENS_TYPES: PassType[] = ["dry-out", "strengthen", "mentor-compass", "chekhov"];

export function isLensPass(type: PassType): boolean {
  return LENS_TYPES.includes(type);
}

export interface IterationCheck {
  allowed: boolean;
  reason?: string;
  /** Последний завершённый проход-линза — кандидат в basedOnPassId новой версии. */
  lastCompletedLensPassId?: string;
}

export function checkIterationLaw(
  notebook: Notebook,
  passes: Pass[],
  versions: FragmentVersion[],
): IterationCheck {
  const notebookPasses = notebook.passIds
    .map((id) => passes.find((pass) => pass.id === id))
    .filter((pass): pass is Pass => pass !== undefined);

  const lensPasses = notebookPasses.filter((pass) => isLensPass(pass.type));
  const lastLens = lensPasses[lensPasses.length - 1];

  // Пустая тетрадь или ещё ни одного прохода-линзы — начинать можно.
  if (lastLens === undefined) return { allowed: true };

  // Незакрытый разбор: депеша ушла или черновик — сначала доведите его.
  if (lastLens.status !== "completed") {
    return {
      allowed: false,
      reason:
        lastLens.status === "dispatched"
          ? "Сейчас ваш ход: депеша ушла наставнику — вставьте его ответ, и появится разбор."
          : "Сейчас ваш ход: передайте депешу наставнику (кнопка в последнем разборе) — или удалите черновик.",
    };
  }

  const closedByVersion = versions.some(
    (version) => version.notebookId === notebook.id && version.basedOnPassId === lastLens.id,
  );

  if (!closedByVersion) {
    return {
      allowed: false,
      reason:
        "Сейчас ваш ход: поправьте текст под последний разбор и сохраните новую версию — тогда откроется следующая линза.",
      lastCompletedLensPassId: lastLens.id,
    };
  }

  return { allowed: true, lastCompletedLensPassId: lastLens.id };
}

/**
 * Какой проход закрывает фиксируемая сейчас версия: последний завершённый
 * проход-линза, ещё не закрытый другой версией.
 */
export function findPassToClose(
  notebook: Notebook,
  passes: Pass[],
  versions: FragmentVersion[],
): string | undefined {
  const notebookPasses = notebook.passIds
    .map((id) => passes.find((pass) => pass.id === id))
    .filter((pass): pass is Pass => pass !== undefined);

  const lastCompletedLens = [...notebookPasses]
    .reverse()
    .find((pass) => isLensPass(pass.type) && pass.status === "completed");
  if (lastCompletedLens === undefined) return undefined;

  const alreadyClosed = versions.some(
    (version) =>
      version.notebookId === notebook.id && version.basedOnPassId === lastCompletedLens.id,
  );
  return alreadyClosed ? undefined : lastCompletedLens.id;
}
