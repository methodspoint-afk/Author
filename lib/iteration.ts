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

  // Незакрытый проход: депеша ушла или черновик — сначала доведите его.
  if (lastLens.status !== "completed") {
    return {
      allowed: false,
      reason:
        lastLens.status === "dispatched"
          ? "Депеша последнего прохода ещё ждёт ответа — сначала вставьте ответ."
          : "Последний проход остался черновиком — отправьте депешу или удалите его.",
    };
  }

  const closedByVersion = versions.some(
    (version) => version.notebookId === notebook.id && version.basedOnPassId === lastLens.id,
  );

  if (!closedByVersion) {
    return {
      allowed: false,
      reason:
        "Итерация не закрыта: после диагноза нужно поработать с текстом и зафиксировать новую версию — только потом следующий проход.",
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
