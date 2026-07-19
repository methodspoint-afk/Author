import { describe, expect, it } from "vitest";
import { removePass } from "../lib/notebook";
import type { Notebook, Pass } from "../lib/types";

const now = "2026-07-19T12:00:00Z";

function makePass(id: string, notebookId: string, status: Pass["status"], type: Pass["type"] = "strengthen"): Pass {
  return { id, type, label: "т", notebookId, promptText: "...", status };
}

function makeNotebook(id: string, versionIds: string[], passIds: string[]): Notebook {
  return {
    id,
    title: "Тетрадь",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    versionIds,
    passIds,
  };
}

describe("удаление прохода", () => {
  it("черновик удаляется из проходов и из тетради", () => {
    const notebooks = [makeNotebook("nb1", ["v1"], ["p1", "p2"])];
    const passes = [makePass("p1", "nb1", "completed"), makePass("p2", "nb1", "draft")];

    const result = removePass(notebooks, passes, "p2", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.passes.map((pass) => pass.id)).toEqual(["p1"]);
    expect(result.notebooks[0]!.passIds).toEqual(["p1"]);
    expect(result.notebooks[0]!.updatedAt).toBe(now);
    expect(result.notebookId).toBe("nb1");
  });

  it("отправленная депеша тоже удаляется", () => {
    const notebooks = [makeNotebook("nb1", ["v1"], ["p1"])];
    const passes = [makePass("p1", "nb1", "dispatched")];
    expect(removePass(notebooks, passes, "p1", now).ok).toBe(true);
  });

  it("завершённый проход не удаляется — история", () => {
    const notebooks = [makeNotebook("nb1", ["v1"], ["p1"])];
    const passes = [makePass("p1", "nb1", "completed")];
    const result = removePass(notebooks, passes, "p1", now);
    expect(result).toEqual({ ok: false, error: "Диагноз уже получен — такой проход не удаляется." });
  });

  it("тетрадь-призрак (изыскание без версий) уходит вместе с проходом", () => {
    const notebooks = [
      makeNotebook("inq-1", [], ["p1"]),
      makeNotebook("nb2", ["v1"], []),
    ];
    const passes = [makePass("p1", "inq-1", "draft", "inquiry")];

    const result = removePass(notebooks, passes, "p1", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.notebooks.map((notebook) => notebook.id)).toEqual(["nb2"]);
    expect(result.passes).toEqual([]);
  });

  it("тетрадь с версиями остаётся даже без проходов", () => {
    const notebooks = [makeNotebook("nb1", ["v1"], ["p1"])];
    const passes = [makePass("p1", "nb1", "draft")];
    const result = removePass(notebooks, passes, "p1", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.notebooks).toHaveLength(1);
    expect(result.notebooks[0]!.passIds).toEqual([]);
  });

  it("несуществующий проход — ошибка", () => {
    expect(removePass([], [], "нет", now)).toEqual({ ok: false, error: "Проход не найден." });
  });
});
