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

// Сводка дельты БЕЗ раскрытия осей (оси — наше УТП, наружу не выкладываем).
// Из строк берём наблюдения-замеры (что видно в самом тексте), а названия осей,
// базовые уровни и сам грид-инструмент прячем. Полный нарратив с накоплением/
// трендом — в следующей версии (см. docs/ВЕРСИИ.md).

export interface DeltaSummary {
  compass: CompassMeta;
  wins: string[]; // что окрепло
  toWork: string[]; // над чем поработать
}

function clip(text: string, max = 180): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Сводка по дельте одного наставника: наблюдения без осей и без таблицы. */
export function summarizeDeltaTable(table: DeltaTable): DeltaSummary {
  const wins: string[] = [];
  const toWork: string[] = [];
  for (const row of table.rows) {
    const base = (row[1] ?? "").toLowerCase();
    const dynamics = (row[row.length - 1] ?? "").toLowerCase();
    // последнее непустое наблюдение-замер (между базовым уровнем и «Динамикой»)
    const measures = row.slice(2, row.length - 1).map((c) => c.trim()).filter((c) => c !== "");
    const observation = measures[measures.length - 1] ?? "";
    if (observation === "") continue;

    if (/повыш|сильн|образц|окреп/u.test(dynamics)) {
      wins.push(clip(observation));
    } else if (base.includes("точка роста") || /следить|качается|проверить/u.test(dynamics)) {
      toWork.push(clip(observation));
    }
  }
  return { compass: table.compass, wins: wins.slice(0, 2), toWork: toWork.slice(0, 2) };
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
