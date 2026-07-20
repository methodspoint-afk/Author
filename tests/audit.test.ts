import { describe, expect, it } from "vitest";
import { auditFileName, buildAuditMarkdown, collectAuditPairs } from "../lib/audit";
import { buildAuditPrompt } from "../lib/prompts";
import type { FragmentVersion, Notebook } from "../lib/types";

function makeVersion(id: string, notebookId: string, text: string, createdAt: string, note?: string): FragmentVersion {
  return { id, notebookId, text, createdAt, ...(note !== undefined && { note }) };
}

const notebooks: Notebook[] = [
  {
    id: "nb1",
    title: "Малышка",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-10T00:00:00Z",
    versionIds: ["v1", "v2", "v3"],
    passIds: [],
  },
];

const versions: FragmentVersion[] = [
  makeVersion("v1", "nb1", "Первый.", "2026-07-01T10:00:00Z"),
  makeVersion("v2", "nb1", "Второй.", "2026-07-05T10:00:00Z"), // день аудита
  makeVersion("v3", "nb1", "Третий.", "2026-07-10T10:00:00Z", "срезала разгон"),
];

describe("пары аудита", () => {
  it("первая версия — не правка; пары считаются строго после дня аудита", () => {
    const pairs = collectAuditPairs(notebooks, versions, "2026-07-05");
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({
      notebookTitle: "Малышка",
      before: "Второй.",
      after: "Третий.",
      note: "срезала разгон",
    });
  });

  it("без даты аудита берутся все правки", () => {
    expect(collectAuditPairs(notebooks, versions, undefined)).toHaveLength(2);
  });
});

describe("депеша аудита", () => {
  it("содержит пары, правило повторов и контракт", () => {
    const prompt = buildAuditPrompt(
      [{ notebookTitle: "Малышка", before: "Было.", after: "Стало.", note: "правка" }],
      "механика самоиронии",
    );
    expect(prompt).toContain("аудит корпуса");
    expect(prompt).toContain("тетрадь «Малышка»");
    expect(prompt).toContain("Было.");
    expect(prompt).toContain("Стало.");
    expect(prompt).toContain("2–3 повторах");
    expect(prompt).toContain("механика самоиронии");
    expect(prompt).toContain("[СЕКЦИЯ: механики]");
    expect(prompt).toContain("[СЕКЦИЯ: анти-паттерны]");
    expect(prompt).toContain("===КОНЕЦ===");
  });
});

describe("файл аудита", () => {
  const date = new Date("2026-07-19T12:00:00Z");

  it("имя файла — по дню", () => {
    expect(auditFileName(date)).toBe("AUDIT-2026-07-19.md");
  });

  it("markdown содержит строку «Дата:», которую читает lib/rituals", () => {
    const markdown = buildAuditMarkdown(
      { механики: "кандидат А", итог: "голос держится" },
      date,
    );
    // тот же regex, что в readLastAuditDate
    const match = /Дата:\s*(\d{4}-\d{2}-\d{2})/u.exec(markdown);
    expect(match?.[1]).toBe("2026-07-19");
    expect(markdown).toContain("## Механики");
    expect(markdown).toContain("кандидат А");
    expect(markdown).toContain("## Итог");
  });
});
