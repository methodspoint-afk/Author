// Сущности v1 («Мастерская», ТЗ июль 2026) — только для миграционного скрипта.
// Формат заморожен: эти типы описывают данные, какими их писало приложение v1.

export type V1PassType =
  | "dry-out"
  | "chekhov"
  | "strengthen"
  | "mentor-compass"
  | "research"
  | "thread-synthesis"
  | (string & {}); // v1 допускал расширение списка

export type V1PromptRunStatus = "draft" | "waiting" | "completed";

export interface V1PromptRun {
  id: string;
  type: V1PassType;
  label: string;
  projectId?: string;
  sourceText?: string; // для всех, кроме research
  researchTopic?: string; // только research
  sourceRunId?: string; // research указывает на исходный разбор
  threadId?: string; // если раунд в цепочке
  compassId?: string;
  targetGenreId?: string;
  promptText: string;
  status: V1PromptRunStatus;
  rawResponse?: string;
  parsedResult?: Record<string, string> | Record<string, string>[];
  completedAt?: string;
  committedPath?: string;
  finishedAt?: string; // архивный флаг
  lastParseFailed?: boolean;
}

export interface V1TextThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  roundIds: string[]; // V1PromptRun.id, в порядке добавления
  committedPath?: string;
  finishedAt?: string;
}
