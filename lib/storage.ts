import { promises as fs } from "node:fs";
import path from "node:path";

// Хранение v2 (ТЗ §8.1): каждая коллекция — один JSON-файл в data/,
// чтение целиком, перезапись целиком.

// Путь к данным можно переопределить (например, для тестов),
// чтобы не трогать реальные тексты автора.
export const DEFAULT_DATA_DIR =
  process.env.IRINAOS_DATA_DIR ?? path.join(process.cwd(), "data");

export function dataPath(filename: string, dir: string = DEFAULT_DATA_DIR): string {
  return path.join(dir, filename);
}

export async function readCollection<T>(
  filename: string,
  dir: string = DEFAULT_DATA_DIR,
): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(dataPath(filename, dir), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filename}: ожидается JSON-массив`);
  }
  return parsed as T[];
}

export async function writeCollection<T>(
  filename: string,
  items: T[],
  dir: string = DEFAULT_DATA_DIR,
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  // Запись через временный файл: перезапись коллекции атомарна,
  // оборванная запись не портит данные автора.
  const tmp = dataPath(`.${filename}.tmp`, dir);
  await fs.writeFile(tmp, JSON.stringify(items, null, 2) + "\n", "utf8");
  await fs.rename(tmp, dataPath(filename, dir));
}

export async function collectionExists(
  filename: string,
  dir: string = DEFAULT_DATA_DIR,
): Promise<boolean> {
  try {
    await fs.access(dataPath(filename, dir));
    return true;
  } catch {
    return false;
  }
}
