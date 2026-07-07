import { describe, expect, it } from "vitest";
import { buildCaseMarkdown, corpusFileName } from "../lib/corpus";
import { extractDeltaTable } from "../lib/deltas";
import { buildDigestPrompt, buildInquiryPrompt } from "../lib/prompts";
import type { FragmentVersion, Notebook, Pass } from "../lib/types";

const notebook: Notebook = {
  id: "nb1",
  title: "Малышка в туфлях",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-05T00:00:00Z",
  versionIds: ["v1", "v2"],
  passIds: ["p1"],
};

const versions: FragmentVersion[] = [
  { id: "v1", notebookId: "nb1", text: "Первый текст.", createdAt: "2026-07-01T00:00:00Z" },
  {
    id: "v2",
    notebookId: "nb1",
    text: "Второй текст.",
    createdAt: "2026-07-02T00:00:00Z",
    note: "убрала лишнее",
    basedOnPassId: "p1",
  },
];

const passes: Pass[] = [
  {
    id: "p1",
    type: "strengthen",
    label: "Усилить",
    notebookId: "nb1",
    intention: "чтобы финал бил",
    promptText: "...",
    status: "completed",
    parsedResult: { диагноз: "Слабое начало.", "точка роста": "Резать разгон." },
  },
];

describe("картотека", () => {
  it("buildCaseMarkdown собирает кейс с версиями и диагнозами", () => {
    const markdown = buildCaseMarkdown(notebook, versions, passes);
    expect(markdown).toContain("# Малышка в туфлях");
    expect(markdown).toContain("### Версия 1 (2026-07-01)");
    expect(markdown).toContain("### Версия 2 (2026-07-02) — убрала лишнее");
    expect(markdown).toContain("Первый текст.");
    expect(markdown).toContain("Намерение: чтобы финал бил");
    expect(markdown).toContain("**диагноз**");
    expect(markdown).toContain("Резать разгон.");
  });

  it("corpusFileName даёт дату и id", () => {
    expect(corpusFileName(notebook, new Date("2026-07-06T12:00:00Z"))).toBe("2026-07-06-nb1.md");
  });
});

describe("дельта-таблицы", () => {
  it("extractDeltaTable достаёт таблицу из секции DELTA", () => {
    const markdown = `# ЧЕХОВ — компас

## Семь осей

текст осей

## CHEKHOV-DELTA — замер движения

| Ось | Базовый уровень | Замер 1 | Динамика |
|-----|-----------------|---------|----------|
| Деталь-отбор | сильная база | подтверждена | стабильно |
| Отжатость | средняя | уточнена | уточнена |
`;
    const table = extractDeltaTable(markdown);
    expect(table).toBeDefined();
    expect(table!.header).toEqual(["Ось", "Базовый уровень", "Замер 1", "Динамика"]);
    expect(table!.rows).toHaveLength(2);
    expect(table!.rows[0]![0]).toBe("Деталь-отбор");
  });

  it("файл без DELTA-секции — undefined", () => {
    expect(extractDeltaTable("# Компас\n\n## Оси\n\nтекст")).toBeUndefined();
  });
});

describe("промпты секретаря", () => {
  it("изыскание содержит тему, повод и контракт", () => {
    const prompt = buildInquiryPrompt({ topic: "подтекст", sourceGrowthPoint: "резать разгон" });
    expect(prompt).toContain("изыскания по теме: подтекст");
    expect(prompt).toContain("резать разгон");
    expect(prompt).toContain("[СЕКЦИЯ: справка]");
    expect(prompt).toContain("===КОНЕЦ===");
  });

  it("сводка содержит обе версии и историю итераций", () => {
    const prompt = buildDigestPrompt({
      notebookTitle: "Малышка",
      firstVersionText: "первый",
      lastVersionText: "последний",
      rounds: [
        { label: "Усилить", diagnosis: "слабое начало", versionNote: "срезала разгон" },
        { label: "Компас: Чехов", growthPoint: "бесстрастность" },
      ],
    });
    expect(prompt).toContain("сводка по тетради «Малышка»");
    expect(prompt).toContain("первый");
    expect(prompt).toContain("последний");
    expect(prompt).toContain("Итерация 2 — Компас: Чехов");
    expect(prompt).toContain("срезала разгон");
  });
});
