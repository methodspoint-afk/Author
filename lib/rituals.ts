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
 * Дата последнего аудита: из строки «Дата: YYYY-MM-DD» самого свежего
 * файла learning/audits/AUDIT-*.md, с фолбэком на месяц из имени файла.
 */
export async function readLastAuditDate(rootDir: string = process.cwd()): Promise<string | undefined> {
  const dir = path.join(rootDir, "learning", "audits");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return undefined;
  }
  const audits = files.filter((file) => /^AUDIT-.*\.md$/u.test(file)).sort();
  const latest = audits[audits.length - 1];
  if (latest === undefined) return undefined;

  const content = await fs.readFile(path.join(dir, latest), "utf8");
  const dateLine = /Дата:\s*(\d{4}-\d{2}-\d{2})/u.exec(content);
  if (dateLine?.[1] !== undefined) return dateLine[1];

  const fromName = /AUDIT-(\d{4})-(\d{2})/u.exec(latest);
  return fromName === null ? undefined : `${fromName[1]}-${fromName[2]}-01`;
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
