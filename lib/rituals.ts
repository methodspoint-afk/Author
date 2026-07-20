import { promises as fs } from "node:fs";
import path from "node:path";
import type { FragmentVersion } from "./types";

// Напоминание об аудите (ТЗ §5.4): дисциплина LEARNING-LOOP поручена
// секретарю. После N зафиксированных версий с момента последнего аудита
// на Столе появляется тихая строка — строка, не модал, не бадж.

export const DEFAULT_AUDIT_THRESHOLD = 10;

export function auditThreshold(): number {
  const raw = process.env.IRINAOS_AUDIT_THRESHOLD;
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUDIT_THRESHOLD;
}

/**
 * Дата последнего аудита: максимум по строкам «Дата: YYYY-MM-DD» всех файлов
 * learning/audits/AUDIT-*.md (фолбэк — месяц из имени файла). Именно максимум
 * по дате, не по имени: лексикографически «AUDIT-2026-07.md» больше
 * «AUDIT-2026-07-19.md», и сортировка имён выбрала бы старый месячный файл.
 */
export async function readLastAuditDate(rootDir: string = process.cwd()): Promise<string | undefined> {
  const dir = path.join(rootDir, "learning", "audits");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return undefined;
  }

  let latest: string | undefined;
  for (const file of files.filter((name) => /^AUDIT-.*\.md$/u.test(name))) {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const dateLine = /Дата:\s*(\d{4}-\d{2}-\d{2})/u.exec(content);
    let date = dateLine?.[1];
    if (date === undefined) {
      const fromName = /AUDIT-(\d{4})-(\d{2})/u.exec(file);
      date = fromName === null ? undefined : `${fromName[1]}-${fromName[2]}-01`;
    }
    if (date !== undefined && (latest === undefined || date > latest)) latest = date;
  }
  return latest;
}

/** Версии, зафиксированные строго после дня аудита (день аудита уже сверен). */
export function countVersionsSince(
  versions: FragmentVersion[],
  sinceDate: string | undefined,
): number {
  if (sinceDate === undefined) return versions.length;
  return versions.filter((version) => version.createdAt.slice(0, 10) > sinceDate).length;
}

export interface AuditReminder {
  due: boolean;
  count: number;
  threshold: number;
}

export function auditReminder(
  versions: FragmentVersion[],
  sinceDate: string | undefined,
  threshold: number = auditThreshold(),
): AuditReminder {
  const count = countVersionsSince(versions, sinceDate);
  return { due: count >= threshold, count, threshold };
}
