// Доменная модель v2 — ТЗ «Стол и Кабинет» (docs/spec-v2.md, §3).

export type PassType =
  | "dry-out" // Не высушивать: за счёт чего фрагмент живёт
  | "strengthen" // Усилить: слабые места
  | "mentor-compass" // Проход по компасу (13 наставников)
  | "growth" // Разбор роста: движение одного текста через версии (≥2 сверки)
  | "author-voice" // Голос автора: разбор голоса по ≥3 текстам, прошедшим полный цикл
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
  label: string; // имя оси (внутреннее — автору НЕ показываем, чтобы не «выдать» ось)
  state: AxisState;
  focus?: string; // нейтральный заголовок наблюдения (про текст, не термин) — его и показываем
  seen: string; // что видно именно в этом фрагменте, с примером
  step: string; // шаг-направление (вопрос); "" если состояние «в норме»
  priority?: boolean; // одна из 2–3 главных зон роста / лучшая сильная сторона под намерение
}

/**
 * «Разбор роста» одного текста (мульти-наставник, нарратив): не по осям одного
 * наставника, а синтез движения через версии — что окрепло, над чем поработать,
 * и следующий шаг. Единица анализа — один текст (docs/ДВА-ПРОЦЕССА.md).
 */
export interface GrowthReport {
  main: string; // Главное: улучшается ли текст в целом + куда дальше
  wins: string[]; // Окрепло: что выросло, на какой правке, за счёт чего
  toWork: string[]; // Над чем поработать: что не двинулось / просело
  nextStep: string; // Следующий шаг: вопрос-направление
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
  growthResult?: GrowthReport; // разбор роста одного текста (только growth)
  voiceResult?: GrowthReport; // голос автора: кросс-текстовый разбор (только author-voice)
  completedAt?: string;
  committedPath?: string;
  lastParseFailed?: boolean;
}
