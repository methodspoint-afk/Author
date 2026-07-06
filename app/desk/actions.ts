"use server";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getCompass } from "../../lib/compasses";
import { checkIterationLaw, findPassToClose } from "../../lib/iteration";
import {
  buildCompassPrompt,
  buildDryOutPrompt,
  buildStrengthenPrompt,
  parsePromptResponse,
} from "../../lib/prompts";
import { readCollection, writeCollection } from "../../lib/storage";
import type { FragmentVersion, Notebook, Pass } from "../../lib/types";

export interface ActionResult {
  error?: string;
}

async function loadAll() {
  const [notebooks, passes, versions] = await Promise.all([
    readCollection<Notebook>("notebooks.json"),
    readCollection<Pass>("passes.json"),
    readCollection<FragmentVersion>("fragment-versions.json"),
  ]);
  return { notebooks, passes, versions };
}

function refresh(notebookId: string): void {
  revalidatePath("/desk");
  revalidatePath(`/desk/${notebookId}`);
}

/**
 * Фиксация новой версии фрагмента — развязка итерации (ТЗ §5.2, шаг 5).
 * Версия закрывает последний завершённый проход-линзу (basedOnPassId).
 */
export async function commitVersion(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const text = String(formData.get("text") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (notebookId === "" || text.trim() === "") return;

  const { notebooks, passes, versions } = await loadAll();
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  const lastVersionId = notebook.versionIds[notebook.versionIds.length - 1];
  const lastVersion = versions.find((version) => version.id === lastVersionId);
  if (lastVersion !== undefined && lastVersion.text === text) return; // текст не изменился

  const closesPassId = findPassToClose(notebook, passes, versions);
  const now = new Date().toISOString();
  const version: FragmentVersion = {
    id: randomUUID(),
    notebookId,
    text,
    createdAt: now,
    ...(note !== "" && { note }),
    ...(closesPassId !== undefined && { basedOnPassId: closesPassId }),
  };

  versions.push(version);
  notebook.versionIds.push(version.id);
  notebook.updatedAt = now;

  await writeCollection("fragment-versions.json", versions);
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
}

/** Создание прохода-линзы (ТЗ §5.2, шаги 1–2). Проверяет закон итерации. */
export async function createPass(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const type = String(formData.get("type") ?? "");
  const intention = String(formData.get("intention") ?? "").trim();
  const compassId = String(formData.get("compassId") ?? "");
  const targetGenre = String(formData.get("targetGenre") ?? "").trim();

  const { notebooks, passes, versions } = await loadAll();
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return { error: "Тетрадь не найдена." };

  const check = checkIterationLaw(notebook, passes, versions);
  if (!check.allowed) return { error: check.reason ?? "Закон итерации не позволяет." };

  const lastVersionId = notebook.versionIds[notebook.versionIds.length - 1];
  const lastVersion = versions.find((version) => version.id === lastVersionId);
  if (lastVersion === undefined) {
    return { error: "В тетради нет текста — сначала зафиксируйте первую версию." };
  }

  const base = {
    text: lastVersion.text,
    ...(intention !== "" && { intention }),
  };

  let promptText: string;
  let label: string;
  const passExtras: Partial<Pass> = {};

  if (type === "dry-out") {
    promptText = buildDryOutPrompt(base);
    label = "Не высушивать";
  } else if (type === "strengthen") {
    promptText = buildStrengthenPrompt(base);
    label = "Усилить";
  } else if (type === "mentor-compass") {
    const compass = getCompass(compassId);
    if (compass === undefined) return { error: "Выберите компас-наставник." };
    let compassKnowledge: string;
    try {
      compassKnowledge = await fs.readFile(
        path.join(process.cwd(), compass.knowledgePath),
        "utf8",
      );
    } catch {
      return { error: `Файл компаса не найден: ${compass.knowledgePath}` };
    }
    promptText = buildCompassPrompt({
      ...base,
      compassTitle: compass.title,
      compassKnowledge,
      nativeGenre: compass.nativeGenre,
      ...(targetGenre !== "" && { targetGenre }),
    });
    label = `Компас: ${compass.title}`;
    passExtras.compassId = compass.id;
    if (targetGenre !== "") passExtras.targetGenreId = targetGenre;
  } else {
    return { error: "Неизвестный тип прохода." };
  }

  const pass: Pass = {
    id: randomUUID(),
    type: type as Pass["type"],
    label,
    notebookId,
    fragmentVersionId: lastVersion.id,
    ...(intention !== "" && { intention }),
    ...passExtras,
    promptText,
    status: "draft",
  };

  passes.push(pass);
  notebook.passIds.push(pass.id);
  notebook.updatedAt = new Date().toISOString();

  await writeCollection("passes.json", passes);
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
  return {};
}

/** Депеша скопирована и понесена в ИИ — переводим проход в «отправлена». */
export async function markDispatched(formData: FormData): Promise<void> {
  const passId = String(formData.get("passId") ?? "");
  const passes = await readCollection<Pass>("passes.json");
  const pass = passes.find((entry) => entry.id === passId);
  if (pass === undefined || pass.status === "completed") return;

  pass.status = "dispatched";
  await writeCollection("passes.json", passes);
  refresh(pass.notebookId);
}

/** Приём ответа: парсинг по контракту формата (§6.2). */
export async function submitPassResponse(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const passId = String(formData.get("passId") ?? "");
  const raw = String(formData.get("rawResponse") ?? "").trim();
  if (raw === "") return { error: "Ответ пуст." };

  const passes = await readCollection<Pass>("passes.json");
  const pass = passes.find((entry) => entry.id === passId);
  if (pass === undefined) return { error: "Проход не найден." };

  pass.rawResponse = raw;
  const parsed = parsePromptResponse(raw);

  if (parsed === undefined) {
    pass.lastParseFailed = true;
    await writeCollection("passes.json", passes);
    refresh(pass.notebookId);
    return {
      error:
        "Не удалось разобрать ответ: не найден блок ===IRINAOS===…===КОНЕЦ=== с секциями. Ответ сохранён целиком — поправьте разметку и вставьте ещё раз.",
    };
  }

  pass.parsedResult = parsed;
  pass.status = "completed";
  pass.completedAt = new Date().toISOString();
  pass.lastParseFailed = false;

  await writeCollection("passes.json", passes);
  refresh(pass.notebookId);
  return {};
}
