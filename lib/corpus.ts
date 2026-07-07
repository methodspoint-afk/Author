import path from "node:path";
import type { FragmentVersion, Notebook, Pass } from "./types";
import { PASS_STATUS_LABELS, PASS_TYPE_LABELS } from "./passMeta";

// Картотека (ТЗ §5.3): внесение тетради в корпус — markdown-кейс,
// живущий в learning/corpus/. Явные ветки, никаких молчаливых фолбэков.

export const CORPUS_DIR =
  process.env.IRINAOS_CORPUS_DIR ?? path.join(process.cwd(), "learning", "corpus");

export function corpusFileName(notebook: Notebook, date: Date): string {
  const day = date.toISOString().slice(0, 10);
  return `${day}-${notebook.id}.md`;
}

export function buildCaseMarkdown(
  notebook: Notebook,
  versions: FragmentVersion[],
  passes: Pass[],
): string {
  const lines: string[] = [`# ${notebook.title}`, ""];
  lines.push(`Тетрадь: ${notebook.id}. Версий: ${versions.length}, проходов: ${passes.length}.`);
  lines.push("");

  lines.push("## Версии фрагмента");
  lines.push("");
  versions.forEach((version, index) => {
    const note =
      version.note !== undefined && version.note !== "перенесено из v1"
        ? ` — ${version.note}`
        : "";
    lines.push(`### Версия ${index + 1} (${version.createdAt.slice(0, 10)})${note}`);
    lines.push("");
    lines.push(version.text);
    lines.push("");
  });

  lines.push("## Проходы");
  lines.push("");
  for (const pass of passes) {
    lines.push(`### ${pass.label} — ${PASS_TYPE_LABELS[pass.type]}, ${PASS_STATUS_LABELS[pass.status]}`);
    lines.push("");
    if (pass.intention !== undefined) {
      lines.push(`Намерение: ${pass.intention}`);
      lines.push("");
    }
    if (pass.inquiryTopic !== undefined) {
      lines.push(`Тема изыскания: ${pass.inquiryTopic}`);
      lines.push("");
    }
    if (pass.parsedResult !== undefined) {
      const blocks = Array.isArray(pass.parsedResult) ? pass.parsedResult : [pass.parsedResult];
      for (const block of blocks) {
        for (const [section, value] of Object.entries(block)) {
          lines.push(`**${section}**`);
          lines.push("");
          lines.push(value);
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}
