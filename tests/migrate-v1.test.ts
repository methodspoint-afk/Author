import { describe, expect, it } from "vitest";
import { migrateV1 } from "../lib/migrate-v1";
import type { V1PromptRun, V1TextThread } from "../lib/v1-types";

const NOW = "2026-07-06T12:00:00Z";

function run(partial: Partial<V1PromptRun> & Pick<V1PromptRun, "id" | "type">): V1PromptRun {
  return {
    label: partial.id,
    promptText: `промпт ${partial.id}`,
    status: "completed",
    ...partial,
  } as V1PromptRun;
}

describe("migrateV1", () => {
  it("цепочка становится тетрадью, sourceText — версиями со схлопыванием дублей", () => {
    const runs: V1PromptRun[] = [
      // раунды 1 и 2 — над одним текстом (v1 не требовал правки между итерациями)
      run({ id: "r1", type: "dry-out", sourceText: "текст А", threadId: "t1", completedAt: "2026-07-01T10:00:00Z" }),
      run({ id: "r2", type: "strengthen", sourceText: "текст А", threadId: "t1", completedAt: "2026-07-02T10:00:00Z" }),
      run({ id: "r3", type: "mentor-compass", sourceText: "текст Б", threadId: "t1", compassId: "sorkin", completedAt: "2026-07-03T10:00:00Z" }),
    ];
    const threads: V1TextThread[] = [
      {
        id: "t1",
        title: "Малышка в туфлях",
        createdAt: "2026-07-01T09:00:00Z",
        updatedAt: "2026-07-03T10:00:00Z",
        roundIds: ["r1", "r2", "r3"],
        finishedAt: "2026-07-04T10:00:00Z",
      },
    ];

    const result = migrateV1(runs, threads, NOW);

    expect(result.notebooks).toHaveLength(1);
    const notebook = result.notebooks[0]!;
    expect(notebook.id).toBe("t1");
    expect(notebook.shelvedAt).toBe("2026-07-04T10:00:00Z");
    expect(notebook.passIds).toEqual(["r1", "r2", "r3"]);

    // Дубль текста между r1 и r2 схлопнут: две версии, не три.
    expect(result.versions).toHaveLength(2);
    const [versionA, versionB] = result.versions;
    expect(versionA!.text).toBe("текст А");
    expect(versionA!.basedOnPassId).toBeUndefined();
    expect(versionB!.text).toBe("текст Б");
    // Версия Б родилась из правки после последнего «текстового» прохода — r2.
    expect(versionB!.basedOnPassId).toBe("r2");
    expect(notebook.versionIds).toEqual([versionA!.id, versionB!.id]);

    // Проходы ссылаются на актуальную для них версию.
    const passes = new Map(result.passes.map((pass) => [pass.id, pass]));
    expect(passes.get("r1")!.fragmentVersionId).toBe(versionA!.id);
    expect(passes.get("r2")!.fragmentVersionId).toBe(versionA!.id);
    expect(passes.get("r3")!.fragmentVersionId).toBe(versionB!.id);
    expect(passes.get("r3")!.compassId).toBe("sorkin");
  });

  it("standalone-раунд становится тетрадью длины один", () => {
    const runs: V1PromptRun[] = [
      run({
        id: "r10",
        type: "dry-out",
        label: "Хомяк",
        sourceText: "текст поста",
        completedAt: "2026-06-20T10:00:00Z",
        finishedAt: "2026-06-21T10:00:00Z",
        committedPath: "learning/corpus/homyak.md",
      }),
    ];

    const result = migrateV1(runs, [], NOW);

    expect(result.notebooks).toHaveLength(1);
    const notebook = result.notebooks[0]!;
    expect(notebook.id).toBe("nb-r10");
    expect(notebook.title).toBe("Хомяк");
    expect(notebook.shelvedAt).toBe("2026-06-21T10:00:00Z");
    expect(notebook.committedPath).toBe("learning/corpus/homyak.md");
    expect(notebook.versionIds).toHaveLength(1);
    expect(result.versions[0]!.text).toBe("текст поста");
    expect(result.passes[0]!.notebookId).toBe("nb-r10");
  });

  it("переименовывает типы и статусы: research→inquiry, thread-synthesis→digest, waiting→dispatched", () => {
    const runs: V1PromptRun[] = [
      run({
        id: "r20",
        type: "research",
        status: "waiting",
        researchTopic: "исследования о подтексте",
        sourceRunId: "r1",
      }),
      run({ id: "r21", type: "thread-synthesis", threadId: "t2" }),
      run({ id: "r22", type: "chekhov", sourceText: "старый разбор", threadId: "t2" }),
    ];
    const threads: V1TextThread[] = [
      {
        id: "t2",
        title: "Письмо",
        createdAt: "2026-07-01T09:00:00Z",
        updatedAt: "2026-07-02T09:00:00Z",
        roundIds: ["r22", "r21"],
      },
    ];

    const result = migrateV1(runs, threads, NOW);
    const passes = new Map(result.passes.map((pass) => [pass.id, pass]));

    const inquiry = passes.get("r20")!;
    expect(inquiry.type).toBe("inquiry");
    expect(inquiry.status).toBe("dispatched");
    expect(inquiry.inquiryTopic).toBe("исследования о подтексте");
    expect(inquiry.sourcePassId).toBe("r1");
    expect(inquiry.fragmentVersionId).toBeUndefined();

    const digest = passes.get("r21")!;
    expect(digest.type).toBe("digest");
    expect(digest.fragmentVersionId).toBeUndefined();

    // Legacy chekhov переносится как есть (clean cutover), но версию создаёт.
    const chekhov = passes.get("r22")!;
    expect(chekhov.type).toBe("chekhov");
    expect(chekhov.fragmentVersionId).toBeDefined();
  });

  it("осиротевшие и потерянные раунды переносятся с предупреждениями", () => {
    const runs: V1PromptRun[] = [
      run({ id: "r30", type: "dry-out", sourceText: "х", threadId: "нет-такой-цепочки" }),
      run({ id: "r31", type: "strengthen", sourceText: "y", threadId: "t3" }), // есть threadId, нет в roundIds
    ];
    const threads: V1TextThread[] = [
      {
        id: "t3",
        title: "Тетрадь с дырой",
        createdAt: "2026-07-01T09:00:00Z",
        updatedAt: "2026-07-01T09:00:00Z",
        roundIds: ["r-исчезнувший", "r31"],
      },
    ];

    const result = migrateV1(runs, threads, NOW);

    // r31: в roundIds есть — перенесён в тетрадь t3 штатно, без дублирования.
    expect(result.passes.filter((pass) => pass.id === "r31")).toHaveLength(1);
    expect(result.passes.find((pass) => pass.id === "r31")!.notebookId).toBe("t3");
    // r30: цепочки нет — отдельная тетрадь + предупреждение.
    expect(result.notebooks.map((notebook) => notebook.id)).toContain("nb-r30");
    expect(result.warnings.some((warning) => warning.includes("r-исчезнувший"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("nb-") || warning.includes("r30"))).toBe(true);
  });
});
