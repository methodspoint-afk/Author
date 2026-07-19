import { promises as fs } from "node:fs";
import path from "node:path";
import type { FragmentVersion, Notebook } from "./types";

// Аудит корпуса (LEARNING-LOOP, ТЗ §5.4): секретарь собирает пары
// «было ↔ стало» из правок, накопившихся с прошлого аудита, ответ на депешу
// становится файлом learning/audits/AUDIT-*.md. Файлы аудитов — единственный
// источник правды о дате последнего аудита (lib/rituals.ts читает её оттуда),
// поэтому записанный файл сам гасит напоминание на Столе.

export interface AuditPair {
  notebookTitle: string;
  before: string;
  after: string;
  note?: string; // «что изменилось» — формулировка автора при фиксации
}

/**
 * Пары «было ↔ стало»: каждая версия строго после дня аудита в паре со своей
 * предшественницей. Первая версия тетради — не правка, пары не образует.
 */
export function collectAuditPairs(
  notebooks: Notebook[],
  versions: FragmentVersion[],
  sinceDate: string | undefined,
): AuditPair[] {
  const byId = new Map(versions.map((version) => [version.id, version]));
  const pairs: AuditPair[] = [];
  for (const notebook of notebooks) {
    notebook.versionIds.forEach((versionId, index) => {
      if (index === 0) return;
      const version = byId.get(versionId);
      const previous = byId.get(notebook.versionIds[index - 1] ?? "");
      if (version === undefined || previous === undefined) return;
      if (sinceDate !== undefined && version.createdAt.slice(0, 10) <= sinceDate) return;
      pairs.push({
        notebookTitle: notebook.title,
        before: previous.text,
        after: version.text,
        ...(version.note !== undefined && { note: version.note }),
      });
    });
  }
  return pairs;
}

export function auditFileName(date: Date): string {
  return `AUDIT-${date.toISOString().slice(0, 10)}.md`;
}

/** Markdown аудита из распарсенного ответа. Строка «Дата: …» обязательна —
 *  по ней lib/rituals.ts определяет дату последнего аудита. */
export function buildAuditMarkdown(parsed: Record<string, string>, date: Date): string {
  const day = date.toISOString().slice(0, 10);
  const sections = Object.entries(parsed)
    .map(([name, text]) => `## ${name.charAt(0).toUpperCase()}${name.slice(1)}\n\n${text}`)
    .join("\n\n");
  return `# AUDIT-${day} — аудит корпуса

Дата: ${day}. Проведён из Мастерской: ответ секретаря на депешу аудита
(пары «было ↔ стало» с прошлого аудита).

${sections}
`;
}

export const AUDITS_DIR = path.join(process.cwd(), "learning", "audits");

export async function writeAuditFile(
  markdown: string,
  date: Date,
  dir: string = AUDITS_DIR,
): Promise<string> {
  await fs.mkdir(dir, { recursive: true });
  const fileName = auditFileName(date);
  await fs.writeFile(path.join(dir, fileName), markdown, "utf8");
  return `learning/audits/${fileName}`;
}
