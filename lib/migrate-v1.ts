import { randomUUID } from "node:crypto";
import type { FragmentVersion, Notebook, Pass, PassStatus, PassType } from "./types";
import type { V1PromptRun, V1TextThread } from "./v1-types";

// Миграция v1 → v2 (ТЗ §8.2):
// - standalone-раунд → тетрадь длины один; sourceText — версия №1
// - цепочка → тетрадь; sourceText раундов → версии (последовательные дубли схлопываются)
// - finishedAt → shelvedAt; research → inquiry; thread-synthesis → digest;
//   waiting → dispatched; "chekhov" переносится как есть (тип заморожен)

export interface MigrationResult {
  notebooks: Notebook[];
  passes: Pass[];
  versions: FragmentVersion[];
  warnings: string[];
}

const MIGRATION_NOTE = "перенесено из v1";

function mapStatus(status: V1PromptRun["status"]): PassStatus {
  return status === "waiting" ? "dispatched" : status;
}

function mapType(type: V1PromptRun["type"], warnings: string[], runId: string): PassType {
  switch (type) {
    case "research":
      return "inquiry";
    case "thread-synthesis":
      return "digest";
    case "dry-out":
      return "dry-out";
    case "strengthen":
      return "strengthen";
    case "mentor-compass":
      return "mentor-compass";
    case "chekhov":
      return "chekhov";
    default:
      warnings.push(`Раунд ${runId}: неизвестный тип v1 «${type}», перенесён без изменения`);
      return type as PassType;
  }
}

function convertRun(run: V1PromptRun, notebookId: string, warnings: string[]): Pass {
  if (run.projectId) {
    warnings.push(`Раунд ${run.id}: поле projectId («${run.projectId}») в v2 не переносится`);
  }
  const pass: Pass = {
    id: run.id,
    type: mapType(run.type, warnings, run.id),
    label: run.label,
    notebookId,
    promptText: run.promptText,
    status: mapStatus(run.status),
  };
  if (run.researchTopic !== undefined) pass.inquiryTopic = run.researchTopic;
  if (run.sourceRunId !== undefined) pass.sourcePassId = run.sourceRunId;
  if (run.compassId !== undefined) pass.compassId = run.compassId;
  if (run.targetGenreId !== undefined) pass.targetGenreId = run.targetGenreId;
  if (run.rawResponse !== undefined) pass.rawResponse = run.rawResponse;
  if (run.parsedResult !== undefined) pass.parsedResult = run.parsedResult;
  if (run.completedAt !== undefined) pass.completedAt = run.completedAt;
  if (run.committedPath !== undefined) pass.committedPath = run.committedPath;
  if (run.lastParseFailed !== undefined) pass.lastParseFailed = run.lastParseFailed;
  return pass;
}

/** Типы, чей sourceText — состояние фрагмента (inquiry/digest текста не несут). */
function carriesFragment(type: PassType): boolean {
  return type !== "inquiry" && type !== "digest";
}

interface NotebookBuilder {
  notebook: Notebook;
  lastVersion?: FragmentVersion;
  lastFragmentPassId?: string; // последний проход, работавший с текстом
}

function addRunToNotebook(
  run: V1PromptRun,
  builder: NotebookBuilder,
  out: MigrationResult,
  fallbackTime: string,
): void {
  const pass = convertRun(run, builder.notebook.id, out.warnings);

  if (carriesFragment(pass.type) && run.sourceText !== undefined) {
    // Новая версия — только если текст реально изменился с прошлого раунда.
    if (builder.lastVersion === undefined || builder.lastVersion.text !== run.sourceText) {
      const version: FragmentVersion = {
        id: randomUUID(),
        notebookId: builder.notebook.id,
        text: run.sourceText,
        createdAt: run.completedAt ?? fallbackTime,
        note: MIGRATION_NOTE,
      };
      // Версия родилась из правки после предыдущего «текстового» прохода.
      if (builder.lastFragmentPassId !== undefined) {
        version.basedOnPassId = builder.lastFragmentPassId;
      }
      out.versions.push(version);
      builder.notebook.versionIds.push(version.id);
      builder.lastVersion = version;
    }
    pass.fragmentVersionId = builder.lastVersion.id;
    builder.lastFragmentPassId = pass.id;
  }

  out.passes.push(pass);
  builder.notebook.passIds.push(pass.id);
}

export function migrateV1(
  runs: V1PromptRun[],
  threads: V1TextThread[],
  now: string = new Date().toISOString(),
): MigrationResult {
  const out: MigrationResult = { notebooks: [], passes: [], versions: [], warnings: [] };
  const runById = new Map(runs.map((run) => [run.id, run]));
  const migratedRunIds = new Set<string>();

  // 1. Цепочки → тетради.
  for (const thread of threads) {
    const builder: NotebookBuilder = {
      notebook: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        versionIds: [],
        passIds: [],
        ...(thread.committedPath !== undefined && { committedPath: thread.committedPath }),
        ...(thread.finishedAt !== undefined && { shelvedAt: thread.finishedAt }),
      },
    };

    // roundIds — авторитетный порядок; раунды с threadId вне списка доклеиваются в конец.
    const memberIds = [...thread.roundIds];
    for (const run of runs) {
      if (run.threadId === thread.id && !thread.roundIds.includes(run.id)) {
        memberIds.push(run.id);
        out.warnings.push(
          `Раунд ${run.id} ссылается на цепочку ${thread.id}, но отсутствует в roundIds — доклеен в конец`,
        );
      }
    }

    for (const runId of memberIds) {
      const run = runById.get(runId);
      if (run === undefined) {
        out.warnings.push(`Цепочка ${thread.id}: раунд ${runId} не найден, пропущен`);
        continue;
      }
      if (migratedRunIds.has(runId)) {
        out.warnings.push(`Раунд ${runId} встречается в нескольких цепочках, второе вхождение пропущено`);
        continue;
      }
      addRunToNotebook(run, builder, out, thread.updatedAt);
      migratedRunIds.add(runId);
    }

    out.notebooks.push(builder.notebook);
  }

  // 2. Оставшиеся раунды → тетради длины один.
  for (const run of runs) {
    if (migratedRunIds.has(run.id)) continue;
    if (run.threadId !== undefined) {
      out.warnings.push(
        `Раунд ${run.id}: цепочка ${run.threadId} не найдена, раунд перенесён как отдельная тетрадь`,
      );
    }
    const createdAt = run.completedAt ?? now;
    const builder: NotebookBuilder = {
      notebook: {
        id: `nb-${run.id}`,
        title: run.label,
        createdAt,
        updatedAt: run.finishedAt ?? createdAt,
        versionIds: [],
        passIds: [],
        ...(run.committedPath !== undefined && { committedPath: run.committedPath }),
        ...(run.finishedAt !== undefined && { shelvedAt: run.finishedAt }),
      },
    };
    addRunToNotebook(run, builder, out, createdAt);
    migratedRunIds.add(run.id);
    out.notebooks.push(builder.notebook);
  }

  return out;
}
