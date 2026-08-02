import { COMPASS_TITLES } from "./passMeta";
import type { FragmentVersion, Notebook, Pass } from "./types";

// «Разбор роста» одного текста (docs/ДВА-ПРОЦЕССА.md). Мульти-наставник: смотрим
// движение текста через версии, а не оси одного наставника. Собираем цепочку
// версий + советы наставников по пути (точки роста сверок) + что берегли
// (диагностика «Не высушить»). Нужно ≥2 завершённые сверки (любых наставников).

export const GROWTH_MIN_CHECKS = 2;

export interface GrowthAdvice {
  versionLabel: string; // «версия N» — на какой версии была сверка
  mentor: string; // имя наставника (человекочитаемое)
  point: string; // точка роста этой сверки (совет по пути)
}

export interface GrowthChain {
  versions: Array<{ label: string; text: string }>; // по порядку
  advice: GrowthAdvice[]; // советы наставников по пути
  protect?: string; // что берегли — из «Не высушить», если была
  checkCount: number;
}

function parsedField(pass: Pass, key: string): string {
  const block = Array.isArray(pass.parsedResult) ? pass.parsedResult[0] : pass.parsedResult;
  const value = block?.[key];
  return value !== undefined ? value.trim() : "";
}

/** Завершённые «Сверить» этого текста (с разбором по осям), в порядке версий. */
function textChecks(
  notebook: Notebook,
  passes: Pass[],
  indexById: Map<string, number>,
): Pass[] {
  const inNotebook = new Set(notebook.passIds);
  return passes
    .filter(
      (pass) =>
        pass.type === "mentor-compass" &&
        pass.status === "completed" &&
        pass.axisResult !== undefined &&
        pass.axisResult.length > 0 &&
        inNotebook.has(pass.id),
    )
    .sort(
      (a, b) =>
        (indexById.get(a.fragmentVersionId ?? "") ?? 0) -
        (indexById.get(b.fragmentVersionId ?? "") ?? 0),
    );
}

/** Доступен ли «Разбор роста»: ≥2 завершённые сверки (любых наставников) в тексте. */
export function growthEligible(notebook: Notebook, passes: Pass[]): boolean {
  const indexById = new Map(notebook.versionIds.map((id, index) => [id, index]));
  return textChecks(notebook, passes, indexById).length >= GROWTH_MIN_CHECKS;
}

/**
 * Цепочка для «Разбора роста»: версии, на которых были сверки, + финальная
 * версия тетради; советы наставников по пути; что берегли («Не высушить»).
 * undefined, если сверок меньше двух или версий меньше двух.
 */
export function growthChain(
  notebook: Notebook,
  versions: FragmentVersion[],
  passes: Pass[],
): GrowthChain | undefined {
  const versionById = new Map(versions.map((v) => [v.id, v]));
  const indexById = new Map(notebook.versionIds.map((id, index) => [id, index]));
  const label = (id: string): string => `версия ${(indexById.get(id) ?? 0) + 1}`;

  const checks = textChecks(notebook, passes, indexById);
  if (checks.length < GROWTH_MIN_CHECKS) return undefined;

  // версии сверок + финальная версия тетради
  const indices = new Set<number>();
  for (const check of checks) {
    const vid = check.fragmentVersionId;
    if (vid !== undefined && indexById.has(vid)) indices.add(indexById.get(vid) as number);
  }
  if (notebook.versionIds.length > 0) indices.add(notebook.versionIds.length - 1);

  const chainVersions: Array<{ label: string; text: string }> = [];
  for (const index of [...indices].sort((a, b) => a - b)) {
    const id = notebook.versionIds[index];
    const version = id !== undefined ? versionById.get(id) : undefined;
    if (version !== undefined) chainVersions.push({ label: `версия ${index + 1}`, text: version.text });
  }
  if (chainVersions.length < 2) return undefined;

  const advice: GrowthAdvice[] = [];
  for (const check of checks) {
    const point = parsedField(check, "точка роста") || parsedField(check, "разбор");
    const vid = check.fragmentVersionId;
    advice.push({
      versionLabel: vid !== undefined && indexById.has(vid) ? label(vid) : "версия ?",
      mentor: check.compassId !== undefined ? (COMPASS_TITLES[check.compassId] ?? check.compassId) : "наставник",
      point,
    });
  }

  // что берегли — последняя завершённая «Не высушить»
  const dryOut = passes
    .filter((p) => p.type === "dry-out" && p.status === "completed" && notebook.passIds.includes(p.id))
    .pop();
  const protect = dryOut !== undefined ? parsedField(dryOut, "разбор") || parsedField(dryOut, "точка роста") : "";

  return {
    versions: chainVersions,
    advice,
    ...(protect !== "" && { protect }),
    checkCount: checks.length,
  };
}
