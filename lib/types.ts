// Доменная модель v2 — ТЗ «Стол и Кабинет» (docs/spec-v2.md, §3).

export type PassType =
  | "dry-out" // Не высушивать: за счёт чего фрагмент живёт
  | "strengthen" // Усилить: слабые места
  | "mentor-compass" // Проход по компасу (13 наставников)
  | "inquiry" // Изыскания
  | "digest" // Сводка
  | "audit" // Аудит корпуса (LEARNING-LOOP)
  | "chekhov"; // legacy v1, заморожен (clean cutover)

export type PassStatus = "draft" | "dispatched" | "completed";
// draft      — черновик, промпт ещё не ушёл
// dispatched — депеша отправлена, ждём ответа
// completed  — диагноз получен и распарсен

/**
 * Версия фрагмента — атом системы.
 * Пара соседних версий = пара «исходник ↔ финал» для аудита.
 */
export interface FragmentVersion {
  id: string;
  notebookId: string;
  text: string; // полный текст фрагмента на этот момент
  createdAt: string;
  note?: string; // «что изменилось» — формулирует автор при фиксации
  basedOnPassId?: string; // по итогам какого прохода родилась версия
}

/** Тетрадь — работа над одним фрагментом. Одиночный проход = тетрадь длины один. */
export interface Notebook {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  versionIds: string[]; // FragmentVersion.id, в порядке появления
  passIds: string[]; // Pass.id, в порядке добавления
  committedPath?: string; // внесена в картотеку
  shelvedAt?: string; // на полке
}

/**
 * Оценка одной оси наставника (линза «Сверить», ТЗ §5.3).
 * Оси — грани мастерства; по каждой наставник называет состояние фрагмента,
 * что видно (с примером) и шаг-направление (вопрос автору, не переписывание).
 */
export type AxisState = "сильная сторона" | "зона роста" | "в норме";

export interface AxisAssessment {
  key: string; // CompassAxis.key — привязка к оси наставника (для дельты)
  label: string; // человекочитаемое имя оси
  state: AxisState;
  seen: string; // что видно именно в этом фрагменте, с примером
  step: string; // шаг-направление (вопрос); "" если состояние «в норме»
}

/** Проход — одна сессия диагностики. Всегда живёт в тетради. */
export interface Pass {
  id: string;
  type: PassType;
  label: string;
  notebookId: string;
  fragmentVersionId?: string; // над какой версией (кроме inquiry/digest)
  intention?: string; // «чего вы хотите от этого фрагмента» — уходит в промпт
  inquiryTopic?: string; // только inquiry
  sourcePassId?: string; // inquiry: от какого диагноза отправлен секретарь
  compassId?: string; // mentor-compass
  targetGenreId?: string; // cross-genre transfer
  promptText: string;
  status: PassStatus;
  rawResponse?: string;
  parsedResult?: Record<string, string> | Record<string, string>[];
  axisResult?: AxisAssessment[]; // разбор по осям (только mentor-compass)
  completedAt?: string;
  committedPath?: string;
  lastParseFailed?: boolean;
}
