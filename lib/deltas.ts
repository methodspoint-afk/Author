import { promises as fs } from "node:fs";
import path from "node:path";
import { COMPASSES, type CompassMeta } from "./compasses";

// Портрет голоса (ТЗ §5.3): дельта-таблицы живут в md-файлах компасов
// (единственный источник правды), Кабинет их только читает и показывает.

export interface DeltaTable {
  compass: CompassMeta;
  header: string[];
  rows: string[][];
}

function parseTableLine(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/** Достаёт таблицу из секции «## …DELTA…» файла компаса. */
export function extractDeltaTable(markdown: string): { header: string[]; rows: string[][] } | undefined {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^##\s.*DELTA/u.test(line));
  if (start === -1) return undefined;

  const tableLines: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^##\s/u.test(line)) break;
    if (line.trimStart().startsWith("|")) tableLines.push(line.trim());
  }
  if (tableLines.length < 2) return undefined;

  const header = parseTableLine(tableLines[0] ?? "");
  const rows = tableLines
    .slice(1)
    .filter((line) => !/^\|[\s\-|]+\|$/u.test(line)) // строка-разделитель |---|---|
    .map(parseTableLine);

  return rows.length > 0 ? { header, rows } : undefined;
}

export async function readDeltaTables(rootDir: string = process.cwd()): Promise<DeltaTable[]> {
  const tables: DeltaTable[] = [];
  for (const compass of COMPASSES) {
    let markdown: string;
    try {
      markdown = await fs.readFile(path.join(rootDir, compass.knowledgePath), "utf8");
    } catch {
      continue; // файл компаса ещё не заведён — просто не показываем
    }
    const table = extractDeltaTable(markdown);
    if (table !== undefined) tables.push({ compass, ...table });
  }
  return tables;
}
