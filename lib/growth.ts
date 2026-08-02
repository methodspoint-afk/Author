import type { FragmentVersion, Notebook, Pass } from "./types";

// «Разбор роста»: движение одного текста через версии глазами одного наставника.
// Собираем цепочку версий, на которые этот наставник делал «Сверить», плюс
// финальную версию, — чтобы наставник увидел, как автор двигал текст правками.
// Нужно ≥2 завершённые сверки (с осями) одного наставника в одной тетради.

export interface GrowthVersion {
  label: string; // «версия N» — по позиции в тетради
  text: string;
}

export interface GrowthChain {
  compassId: string;
  versions: GrowthVersion[]; // в порядке появления
  checkCount: number; // сколько сверок этого наставника в основе
}

const GROWTH_MIN_CHECKS = 2;

/** Завершённые «Сверить» одного наставника в тетради (с разбором по осям). */
function mentorChecks(notebook: Notebook, passes: Pass[], compassId: string): Pass[] {
  const inNotebook = new Set(notebook.passIds);
  return passes.filter(
    (pass) =>
      pass.type === "mentor-compass" &&
      pass.compassId === compassId &&
      pass.status === "completed" &&
      pass.axisResult !== undefined &&
      pass.axisResult.length > 0 &&
      inNotebook.has(pass.id),
  );
}

/** Наставники, по которым в этой тетради набралось ≥2 сверки — для них доступен разбор роста. */
export function eligibleGrowthMentors(notebook: Notebook, passes: Pass[]): string[] {
  const counts = new Map<string, number>();
  for (const pass of passes) {
    if (
      pass.type === "mentor-compass" &&
      pass.status === "completed" &&
      pass.axisResult !== undefined &&
      pass.axisResult.length > 0 &&
      pass.compassId !== undefined &&
      notebook.passIds.includes(pass.id)
    ) {
      counts.set(pass.compassId, (counts.get(pass.compassId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= GROWTH_MIN_CHECKS).map(([id]) => id);
}

/**
 * Цепочка версий для разбора роста: версии, на которых наставник делал сверки,
 * плюс последняя версия тетради (результат последней правки). Возвращает
 * undefined, если сверок этого наставника меньше двух или версий меньше двух.
 */
export function growthChain(
  notebook: Notebook,
  versions: FragmentVersion[],
  passes: Pass[],
  compassId: string,
): GrowthChain | undefined {
  const checks = mentorChecks(notebook, passes, compassId);
  if (checks.length < GROWTH_MIN_CHECKS) return undefined;

  const versionById = new Map(versions.map((version) => [version.id, version]));
  const indexById = new Map(notebook.versionIds.map((id, index) => [id, index]));

  // индексы версий, на которых были сверки этого наставника
  const indices = new Set<number>();
  for (const check of checks) {
    const vid = check.fragmentVersionId;
    if (vid !== undefined && indexById.has(vid)) indices.add(indexById.get(vid) as number);
  }
  // плюс финальная версия тетради — куда пришёл текст после последней правки
  if (notebook.versionIds.length > 0) indices.add(notebook.versionIds.length - 1);

  const ordered = [...indices].sort((a, b) => a - b);
  const chainVersions: GrowthVersion[] = [];
  for (const index of ordered) {
    const id = notebook.versionIds[index];
    const version = id !== undefined ? versionById.get(id) : undefined;
    if (version !== undefined) {
      chainVersions.push({ label: `версия ${index + 1}`, text: version.text });
    }
  }

  if (chainVersions.length < 2) return undefined;
  return { compassId, versions: chainVersions, checkCount: checks.length };
}
