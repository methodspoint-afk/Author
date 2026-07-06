// Одноразовая миграция данных v1 → v2 (ТЗ §8.2).
//
// Использование:
//   npm run migrate:v1                      # data/ в корне проекта
//   npm run migrate:v1 -- --data /путь/к/data
//   npm run migrate:v1 -- --force           # перезаписать уже существующие файлы v2
//
// Читает:  prompt-runs.json, threads.json
// Пишет:   notebooks.json, passes.json, fragment-versions.json
// Файлы v1 не изменяются и не удаляются.

import { migrateV1 } from "../lib/migrate-v1";
import {
  DEFAULT_DATA_DIR,
  collectionExists,
  readCollection,
  writeCollection,
} from "../lib/storage";
import type { V1PromptRun, V1TextThread } from "../lib/v1-types";

const OUTPUT_FILES = ["notebooks.json", "passes.json", "fragment-versions.json"];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dataFlag = args.indexOf("--data");
  const dir = dataFlag !== -1 ? args[dataFlag + 1] : DEFAULT_DATA_DIR;
  if (dir === undefined) {
    console.error("После --data нужно указать путь к каталогу данных.");
    process.exit(1);
  }

  const runs = await readCollection<V1PromptRun>("prompt-runs.json", dir);
  const threads = await readCollection<V1TextThread>("threads.json", dir);

  if (runs.length === 0 && threads.length === 0) {
    console.error(`В ${dir} нет данных v1 (prompt-runs.json / threads.json пусты или отсутствуют).`);
    process.exit(1);
  }

  if (!force) {
    for (const file of OUTPUT_FILES) {
      if (await collectionExists(file, dir)) {
        console.error(`${file} уже существует в ${dir}. Запустите с --force, чтобы перезаписать.`);
        process.exit(1);
      }
    }
  }

  const result = migrateV1(runs, threads);

  await writeCollection("notebooks.json", result.notebooks, dir);
  await writeCollection("passes.json", result.passes, dir);
  await writeCollection("fragment-versions.json", result.versions, dir);

  console.log(`Миграция завершена (${dir}):`);
  console.log(`  раундов v1:  ${runs.length}, цепочек v1: ${threads.length}`);
  console.log(`  тетрадей:    ${result.notebooks.length}`);
  console.log(`  проходов:    ${result.passes.length}`);
  console.log(`  версий:      ${result.versions.length}`);
  if (result.warnings.length > 0) {
    console.log(`\nПредупреждения (${result.warnings.length}):`);
    for (const warning of result.warnings) console.log(`  - ${warning}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
