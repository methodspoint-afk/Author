import { COMPASS_TITLES, PASS_TYPE_LABELS } from "./passMeta";
import { selectShownAxes } from "./prompts";
import type { AxisAssessment, FragmentVersion, Notebook, Pass } from "./types";

// Экспорт тетради без тяжёлых зависимостей: Word — через RTF (Word открывает
// нативно, кириллица через \u-эскейпы), TXT — простой текст, PDF — печатью
// браузера. Экспортируем чистовик: заголовок + финальная версия фрагмента.

export interface Manuscript {
  title: string;
  body: string;
}

export function buildManuscript(notebook: Notebook, versions: FragmentVersion[]): Manuscript {
  const byId = new Map(versions.map((version) => [version.id, version]));
  const ordered = notebook.versionIds
    .map((id) => byId.get(id))
    .filter((version): version is FragmentVersion => version !== undefined);
  const last = ordered[ordered.length - 1];
  return { title: notebook.title, body: last?.text ?? "" };
}

const reviewDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Одна ось в тексте разбора: заголовок-фокус (состояние), наблюдение, шаг. */
function axisToText(axis: AxisAssessment): string {
  const head = axis.focus !== undefined && axis.focus !== "" ? axis.focus : axis.label.replace(/^\d+\.\s*/u, "");
  const lines = [`${head} (${axis.state})`, axis.seen];
  if (axis.step !== "") lines.push(`Шаг: ${axis.step}`);
  return lines.join("\n");
}

/**
 * Чистовик разбора для скачивания: то, что автор видит в тетради, — в документе.
 * Осевой разбор «Сверить» (Главное, зоны роста, что уже работает, упражнение)
 * или общий случай (parsedResult справки/сводки/линз). Разделы — пустой строкой,
 * строки внутри — переносом; так формат читается и в Word (RTF), и в TXT, и в PDF.
 */
export function buildReviewManuscript(pass: Pass, notebookTitle?: string): Manuscript {
  const blocks =
    pass.parsedResult === undefined
      ? []
      : Array.isArray(pass.parsedResult)
        ? pass.parsedResult
        : [pass.parsedResult];
  const first = blocks[0] ?? {};

  const isInquiry = pass.type === "inquiry";
  const title =
    pass.type === "mentor-compass" && pass.compassId !== undefined
      ? `Разбор «Сверить» — ${COMPASS_TITLES[pass.compassId] ?? pass.compassId}`
      : `${isInquiry ? "Справка" : PASS_TYPE_LABELS[pass.type]}${notebookTitle !== undefined && notebookTitle !== "" ? ` — ${notebookTitle}` : ""}`;

  const meta: string[] = [];
  if (notebookTitle !== undefined && notebookTitle !== "") meta.push(`Тетрадь: ${notebookTitle}`);
  if (pass.targetGenreId !== undefined) meta.push(`Жанр: ${pass.targetGenreId}`);
  if (pass.intention !== undefined) meta.push(`Намерение: ${pass.intention}`);
  if (pass.inquiryTopic !== undefined) meta.push(`Тема: ${pass.inquiryTopic}`);
  if (pass.completedAt !== undefined) meta.push(`Дата: ${reviewDateFormat.format(new Date(pass.completedAt))}`);

  const parts: string[] = [];
  if (meta.length > 0) parts.push(meta.join("\n"));

  if (pass.axisResult !== undefined && pass.axisResult.length > 0) {
    const main = first["точка роста"];
    const exercise = first["упражнение"];
    if (main !== undefined && main !== "") parts.push(`ГЛАВНОЕ\n${main}`);
    const { growth, strengths } = selectShownAxes(pass.axisResult);
    if (growth.length > 0) parts.push(`ЗОНЫ РОСТА\n\n${growth.map(axisToText).join("\n\n")}`);
    if (strengths.length > 0) {
      parts.push(`ЧТО УЖЕ РАБОТАЕТ\n\n${strengths.map(axisToText).join("\n\n")}`);
    }
    if (exercise !== undefined && exercise !== "") parts.push(`УПРАЖНЕНИЕ\n${exercise}`);
  } else {
    for (const block of blocks) {
      for (const [key, value] of Object.entries(block)) {
        if (value.trim() !== "") parts.push(`${key.toUpperCase()}\n${value}`);
      }
    }
  }

  return { title, body: parts.join("\n\n") };
}

/** Плоский текст: заголовок, пустая строка, тело. */
export function toPlainText({ title, body }: Manuscript): string {
  return body.trim() === "" ? `${title}\n` : `${title}\n\n${body}\n`;
}

/** Экранирование одной строки текста в RTF (кириллица — как \uN?). */
function rtfEscape(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const ch = text[i];
    if (ch === "\\") out += "\\\\";
    else if (ch === "{") out += "\\{";
    else if (ch === "}") out += "\\}";
    else if (ch === "\n") out += "\\par\n";
    else if (ch === "\r") continue;
    else if (code > 127) {
      // RTF \u принимает знаковое 16-битное число; ? — ASCII-замена для старых читалок.
      const signed = code > 32767 ? code - 65536 : code;
      out += `\\u${signed}?`;
    } else out += ch;
  }
  return out;
}

/** RTF-документ: заголовок жирным, затем тело абзацами. Шрифт — Georgia. */
export function toRtf({ title, body }: Manuscript): string {
  const head = `{\\b\\fs32 ${rtfEscape(title)}}\\par\\par`;
  const text = body.trim() === "" ? "" : `${rtfEscape(body)}\\par`;
  return `{\\rtf1\\ansi\\ansicpg1251\\deff0{\\fonttbl{\\f0 Georgia;}}\\f0\\fs24\n${head}\n${text}\n}`;
}

/** Безопасное имя файла из заголовка: только буквы/цифры/пробел-дефис. */
export function safeFileName(title: string, ext: string): string {
  const base = title
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 60);
  return `${base === "" ? "тетрадь" : base}.${ext}`;
}
