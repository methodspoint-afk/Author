import { describe, expect, it } from "vitest";
import { cleanTitle, removeNotebook } from "../lib/notebook";
import type { FragmentVersion, Notebook, Pass } from "../lib/types";

describe("переименование тетради", () => {
  it("обрезает пробелы, пустое имя отклоняет", () => {
    expect(cleanTitle("  Малышка в туфлях  ")).toBe("Малышка в туфлях");
    expect(cleanTitle("   ")).toBeUndefined();
    expect(cleanTitle("")).toBeUndefined();
  });
});

describe("удаление тетради", () => {
  const notebooks: Notebook[] = [
    { id: "nb1", title: "Убрать", createdAt: "", updatedAt: "", versionIds: ["v1"], passIds: ["p1"] },
    { id: "nb2", title: "Оставить", createdAt: "", updatedAt: "", versionIds: ["v2"], passIds: [] },
  ];
  const versions: FragmentVersion[] = [
    { id: "v1", notebookId: "nb1", text: "т", createdAt: "" },
    { id: "v2", notebookId: "nb2", text: "т", createdAt: "" },
  ];
  const passes: Pass[] = [
    { id: "p1", type: "strengthen", label: "У", notebookId: "nb1", promptText: "", status: "completed" },
  ];

  it("убирает тетрадь вместе с её версиями и проходами, чужие не трогает", () => {
    const result = removeNotebook(notebooks, versions, passes, "nb1");
    expect(result.notebooks.map((n) => n.id)).toEqual(["nb2"]);
    expect(result.versions.map((v) => v.id)).toEqual(["v2"]);
    expect(result.passes).toEqual([]);
  });

  it("удаление несуществующей тетради ничего не ломает", () => {
    const result = removeNotebook(notebooks, versions, passes, "нет");
    expect(result.notebooks).toHaveLength(2);
    expect(result.versions).toHaveLength(2);
    expect(result.passes).toHaveLength(1);
  });
});
