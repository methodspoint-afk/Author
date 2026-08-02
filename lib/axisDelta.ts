import { COMPASSES, type CompassMeta } from "./compasses";
import type { AxisAssessment, Pass } from "./types";

// Осевая дельта роста (Фаза 2): «как растёт ваш голос» — уже не из
// рукописных md-таблиц, а из накопленных разборов по осям (Pass.axisResult).
// Показываем «спрятанно, с базой»: под каждым наставником — на чём основано
// (сколько сверок, по скольким текстам), затем что окрепло и что в работе.
// Оси наружу не называем сухими ярлыками — показываем живое наблюдение.

export interface AxisTrend {
  key: string;
  focus: string; // нейтральный заголовок последнего наблюдения (имя оси не выдаём); "" если нет
  grew: boolean; // была зоной роста, стала сильной стороной — реальный рост
  seen: string; // последнее наблюдение по оси (живой текст, не ярлык)
}

export interface MentorGrowth {
  compass: CompassMeta;
  passCount: number; // на скольких сверках (с осями) основано
  notebookCount: number; // по скольким текстам
  strengthened: AxisTrend[]; // окрепло / держится
  toWork: AxisTrend[]; // над чем поработать
}

/** Хронология оценок одной оси: все записи по key в порядке завершения сверок. */
interface AxisHistory {
  entries: AxisAssessment[]; // в порядке возрастания даты
}

/**
 * Дельта роста по одному наставнику: собираем axisResult из завершённых сверок,
 * по каждой оси смотрим последнюю оценку и движение. Оси «в норме» не
 * показываем (менеджер внимания, не отчёт). Лимит на бакет — 3.
 */
export function mentorGrowth(compass: CompassMeta, passes: Pass[]): MentorGrowth | undefined {
  const relevant = passes
    .filter(
      (pass) =>
        pass.type === "mentor-compass" &&
        pass.compassId === compass.id &&
        pass.status === "completed" &&
        pass.axisResult !== undefined &&
        pass.axisResult.length > 0,
    )
    .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));

  if (relevant.length === 0) return undefined;

  const notebookCount = new Set(relevant.map((pass) => pass.notebookId)).size;

  const history = new Map<string, AxisHistory>();
  for (const pass of relevant) {
    for (const axis of pass.axisResult ?? []) {
      const h = history.get(axis.key) ?? { entries: [] };
      h.entries.push(axis);
      history.set(axis.key, h);
    }
  }

  const strengthened: AxisTrend[] = [];
  const toWork: AxisTrend[] = [];
  for (const [key, h] of history) {
    const latest = h.entries[h.entries.length - 1];
    if (latest === undefined || latest.state === "в норме") continue;
    const everGrowthZone = h.entries.some((entry) => entry.state === "зона роста");
    const trend: AxisTrend = {
      key,
      focus: latest.focus ?? "",
      grew: latest.state === "сильная сторона" && everGrowthZone,
      seen: latest.seen.trim(), // показываем наблюдение целиком (не обрезаем)
    };
    if (latest.state === "сильная сторона") strengthened.push(trend);
    else toWork.push(trend);
  }

  // Внутри «окрепло» — сначала те, что реально выросли из зоны роста.
  strengthened.sort((a, b) => Number(b.grew) - Number(a.grew));

  return {
    compass,
    passCount: relevant.length,
    notebookCount,
    strengthened: strengthened.slice(0, 3),
    toWork: toWork.slice(0, 3),
  };
}

/** Дельта роста по всем наставникам, у которых есть осевые сверки. */
export function allMentorGrowth(passes: Pass[]): MentorGrowth[] {
  const result: MentorGrowth[] = [];
  for (const compass of COMPASSES) {
    const growth = mentorGrowth(compass, passes);
    if (growth !== undefined) result.push(growth);
  }
  return result;
}
