"use server";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAuditMarkdown, collectAuditPairs, writeAuditFile } from "../../lib/audit";
import { getCompass } from "../../lib/compasses";
import { checkIterationLaw, findPassToClose } from "../../lib/iteration";
import { buildNewNotebook, removePass } from "../../lib/notebook";
import { readLastAuditDate } from "../../lib/rituals";
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
 * Завести новую тетрадь: название + первый текст фрагмента (ТЗ §3.2).
 * Тетрадь рождается сразу с первой версией и уводит автора на свою страницу.
 */
export async function createNotebook(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const built = buildNewNotebook(
    {
      title: String(formData.get("title") ?? ""),
      text: String(formData.get("text") ?? ""),
    },
    new Date().toISOString(),
    randomUUID,
  );
  if (!built.ok) return { error: built.error };

  const { notebooks, versions } = await loadAll();
  versions.push(built.version);
  notebooks.push(built.notebook);
  await writeCollection("fragment-versions.json", versions);
  await writeCollection("notebooks.json", notebooks);
  revalidatePath("/desk");
  redirect(`/desk/${built.notebook.id}`);
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

/**
 * Удалить незавершённый проход — выход из тупика ошибочного черновика
 * или депеши, которую некому отвечать. Завершённые не удаляются.
 */
export async function deletePass(formData: FormData): Promise<void> {
  const passId = String(formData.get("passId") ?? "");
  const { notebooks, passes } = await loadAll();
  const result = removePass(notebooks, passes, passId, new Date().toISOString());
  if (!result.ok) return;

  await writeCollection("passes.json", result.passes);
  await writeCollection("notebooks.json", result.notebooks);
  refresh(result.notebookId);
  revalidatePath("/study/inquiries");
  revalidatePath("/study/voice");
  revalidatePath("/study");
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

  // Завершённый аудит становится файлом в learning/audits/ — он и есть
  // новая «дата последнего аудита», напоминание на Столе гаснет само.
  if (pass.type === "audit") {
    const date = new Date(pass.completedAt);
    pass.committedPath = await writeAuditFile(buildAuditMarkdown(parsed, date), date);
    revalidatePath("/study/voice");
    revalidatePath("/study");
  }

  await writeCollection("passes.json", passes);
  refresh(pass.notebookId);
  return {};
}

/**
 * Провести аудит корпуса (ТЗ §5.4): секретарь собирает депешу из пар
 * «было ↔ стало», накопившихся с прошлого аудита. Один аудит за раз.
 */
export async function startAudit(): Promise<void> {
  const { notebooks, passes, versions } = await loadAll();
  if (passes.some((pass) => pass.type === "audit" && pass.status !== "completed")) return;

  const lastAuditDate = await readLastAuditDate();
  const pairs = collectAuditPairs(notebooks, versions, lastAuditDate);
  if (pairs.length === 0) return;

  let voiceCore: string | undefined;
  try {
    voiceCore = await fs.readFile(
      path.join(process.cwd(), "learning", "AUTHOR-VOICE-CORE.md"),
      "utf8",
    );
  } catch {
    voiceCore = undefined;
  }

  const { buildAuditPrompt } = await import("../../lib/prompts");
  const now = new Date().toISOString();
  const title = `Аудит корпуса — ${now.slice(0, 10)}`;
  const notebook: Notebook = {
    id: `audit-${randomUUID().slice(0, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
    versionIds: [],
    passIds: [],
  };
  const pass: Pass = {
    id: randomUUID(),
    type: "audit",
    label: title,
    notebookId: notebook.id,
    promptText: buildAuditPrompt(pairs, voiceCore),
    status: "draft",
  };
  notebook.passIds.push(pass.id);

  notebooks.push(notebook);
  passes.push(pass);
  await writeCollection("notebooks.json", notebooks);
  await writeCollection("passes.json", passes);
  revalidatePath("/study/voice");
  revalidatePath("/study");
}

// --- Действия Секретаря (Кабинет, ТЗ §5.3) ---

/** Отправить секретаря за справкой от точки роста завершённого прохода. */
export async function createInquiryFromPass(formData: FormData): Promise<void> {
  const passId = String(formData.get("passId") ?? "");
  const { notebooks, passes } = await loadAll();
  const sourcePass = passes.find((entry) => entry.id === passId);
  if (sourcePass === undefined || sourcePass.parsedResult === undefined) return;

  const parsed = Array.isArray(sourcePass.parsedResult)
    ? sourcePass.parsedResult[0]
    : sourcePass.parsedResult;
  if (parsed === undefined) return;
  const { extractGrowthPoint } = await import("../../lib/prompts");
  const growthPoint = extractGrowthPoint(parsed);
  if (growthPoint === undefined) return;

  const notebook = notebooks.find((entry) => entry.id === sourcePass.notebookId);
  if (notebook === undefined) return;

  const { buildInquiryPrompt } = await import("../../lib/prompts");
  const topic = growthPoint.length > 120 ? `${growthPoint.slice(0, 117)}…` : growthPoint;
  const pass: Pass = {
    id: randomUUID(),
    type: "inquiry",
    label: `Изыскание: ${topic}`,
    notebookId: notebook.id,
    inquiryTopic: topic,
    sourcePassId: sourcePass.id,
    promptText: buildInquiryPrompt({ topic, sourceGrowthPoint: growthPoint }),
    status: "draft",
  };

  passes.push(pass);
  notebook.passIds.push(pass.id);
  notebook.updatedAt = new Date().toISOString();

  await writeCollection("passes.json", passes);
  await writeCollection("notebooks.json", notebooks);
  refresh(notebook.id);
  revalidatePath("/study/inquiries");
}

/** Изыскание по собственному запросу — из Кабинета. */
export async function createInquiry(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const topic = String(formData.get("topic") ?? "").trim();
  if (topic === "") return { error: "Назовите тему изыскания." };

  const { notebooks, passes } = await loadAll();
  const { buildInquiryPrompt } = await import("../../lib/prompts");
  const now = new Date().toISOString();

  const notebook: Notebook = {
    id: `inq-${randomUUID().slice(0, 8)}`,
    title: `Изыскание: ${topic}`,
    createdAt: now,
    updatedAt: now,
    versionIds: [],
    passIds: [],
  };
  const pass: Pass = {
    id: randomUUID(),
    type: "inquiry",
    label: `Изыскание: ${topic}`,
    notebookId: notebook.id,
    inquiryTopic: topic,
    promptText: buildInquiryPrompt({ topic }),
    status: "draft",
  };
  notebook.passIds.push(pass.id);

  notebooks.push(notebook);
  passes.push(pass);
  await writeCollection("notebooks.json", notebooks);
  await writeCollection("passes.json", passes);
  revalidatePath("/study/inquiries");
  revalidatePath("/study");
  return {};
}

/** Сводка по тетради: секретарь сводит несколько итераций (ТЗ §9). */
export async function createDigest(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const { notebooks, passes, versions } = await loadAll();
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  const notebookPasses = notebook.passIds
    .map((id) => passes.find((pass) => pass.id === id))
    .filter((pass): pass is Pass => pass !== undefined);
  const { isLensPass } = await import("../../lib/iteration");
  const completedLens = notebookPasses.filter(
    (pass) => isLensPass(pass.type) && pass.status === "completed",
  );
  if (completedLens.length < 2) return; // сводка имеет смысл от двух итераций

  const notebookVersions = notebook.versionIds
    .map((id) => versions.find((version) => version.id === id))
    .filter((version): version is FragmentVersion => version !== undefined);
  const first = notebookVersions[0];
  const last = notebookVersions[notebookVersions.length - 1];
  if (first === undefined || last === undefined) return;

  const { buildDigestPrompt } = await import("../../lib/prompts");
  const versionByBasedOn = new Map(
    notebookVersions
      .filter((version) => version.basedOnPassId !== undefined)
      .map((version) => [version.basedOnPassId as string, version]),
  );

  const prompt = buildDigestPrompt({
    notebookTitle: notebook.title,
    firstVersionText: first.text,
    lastVersionText: last.text,
    rounds: completedLens.map((pass) => {
      const parsed = Array.isArray(pass.parsedResult) ? pass.parsedResult[0] : pass.parsedResult;
      const closingVersion = versionByBasedOn.get(pass.id);
      return {
        label: pass.label,
        ...(pass.intention !== undefined && { intention: pass.intention }),
        ...(parsed?.["диагноз"] !== undefined && { diagnosis: parsed["диагноз"] }),
        ...(parsed?.["точка роста"] !== undefined && { growthPoint: parsed["точка роста"] }),
        ...(closingVersion?.note !== undefined && { versionNote: closingVersion.note }),
      };
    }),
  });

  const pass: Pass = {
    id: randomUUID(),
    type: "digest",
    label: "Сводка секретаря",
    notebookId,
    promptText: prompt,
    status: "draft",
  };
  passes.push(pass);
  notebook.passIds.push(pass.id);
  notebook.updatedAt = new Date().toISOString();

  await writeCollection("passes.json", passes);
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
}

/** Внести тетрадь в картотеку: markdown-кейс в learning/corpus/. */
export async function commitToCorpus(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const { notebooks, passes, versions } = await loadAll();
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  const notebookVersions = notebook.versionIds
    .map((id) => versions.find((version) => version.id === id))
    .filter((version): version is FragmentVersion => version !== undefined);
  const notebookPasses = notebook.passIds
    .map((id) => passes.find((pass) => pass.id === id))
    .filter((pass): pass is Pass => pass !== undefined);

  const { buildCaseMarkdown, corpusFileName, CORPUS_DIR } = await import("../../lib/corpus");
  const fileName = corpusFileName(notebook, new Date());
  await fs.mkdir(CORPUS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(CORPUS_DIR, fileName),
    buildCaseMarkdown(notebook, notebookVersions, notebookPasses),
    "utf8",
  );

  notebook.committedPath = `learning/corpus/${fileName}`;
  notebook.updatedAt = new Date().toISOString();
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
  revalidatePath("/study/card-index");
  revalidatePath("/study");
}

/** На полку: снять со стола, не публикуя (полка ≠ картотека, ТЗ §7.5). */
export async function shelveNotebook(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const notebooks = await readCollection<Notebook>("notebooks.json");
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  notebook.shelvedAt = new Date().toISOString();
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
  revalidatePath("/study/shelf");
  revalidatePath("/study");
}

/** Вернуть тетрадь с полки на стол. */
export async function reopenNotebook(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const notebooks = await readCollection<Notebook>("notebooks.json");
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  delete notebook.shelvedAt;
  notebook.updatedAt = new Date().toISOString();
  await writeCollection("notebooks.json", notebooks);
  refresh(notebookId);
  revalidatePath("/study/shelf");
  revalidatePath("/study");
}
