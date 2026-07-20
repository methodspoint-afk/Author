import { textStats } from "./textStats";

// «Путь фрагмента» (ТЗ §5.2, §13.5) — пэйофф итераций: увидеть весь
// пройденный путь текста, а не только соседний шаг. Считается из версий
// тетради; никакой новой сущности в хранилище не появляется.

export interface PathVersion {
  text: string;
  createdAt?: string;
  note?: string;
}

export interface PathSummary {
  versions: number;
  firstWords: number;
  lastWords: number;
}

export function pathSummary(versions: PathVersion[]): PathSummary {
  const first = versions[0];
  const last = versions[versions.length - 1];
  return {
    versions: versions.length,
    firstWords: first === undefined ? 0 : textStats(first.text).words,
    lastWords: last === undefined ? 0 : textStats(last.text).words,
  };
}

export interface PathMilestone {
  index: number; // номер версии, с 1
  createdAt?: string;
  note?: string;
  words: number;
  deltaWords: number; // к предыдущей версии; у первой 0
}

export function pathMilestones(versions: PathVersion[]): PathMilestone[] {
  let previousWords = 0;
  return versions.map((version, i) => {
    const words = textStats(version.text).words;
    const milestone: PathMilestone = {
      index: i + 1,
      words,
      deltaWords: i === 0 ? 0 : words - previousWords,
      ...(version.createdAt !== undefined && { createdAt: version.createdAt }),
      ...(version.note !== undefined && { note: version.note }),
    };
    previousWords = words;
    return milestone;
  });
}

/** «+12» / «−8» / «±0» — дельта слов для ленты вех. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}
