import { describe, expect, it } from "vitest";
import { checkIterationLaw, findPassToClose } from "../lib/iteration";
import type { FragmentVersion, Notebook, Pass } from "../lib/types";

function notebook(passIds: string[]): Notebook {
  return {
    id: "nb1",
    title: "Тетрадь",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    versionIds: ["v1"],
    passIds,
  };
}

function pass(id: string, status: Pass["status"], type: Pass["type"] = "strengthen"): Pass {
  return { id, type, label: id, notebookId: "nb1", promptText: "...", status };
}

function version(id: string, basedOnPassId?: string): FragmentVersion {
  return {
    id,
    notebookId: "nb1",
    text: `текст ${id}`,
    createdAt: "2026-07-01T00:00:00Z",
    ...(basedOnPassId !== undefined && { basedOnPassId }),
  };
}

describe("закон итерации", () => {
  it("пустая тетрадь — можно начинать", () => {
    expect(checkIterationLaw(notebook([]), [], [version("v1")]).allowed).toBe(true);
  });

  it("депеша ждёт ответа — нельзя", () => {
    const check = checkIterationLaw(notebook(["p1"]), [pass("p1", "dispatched")], [version("v1")]);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("ждёт ответа");
  });

  it("диагноз получен, версия не зафиксирована — нельзя", () => {
    const check = checkIterationLaw(notebook(["p1"]), [pass("p1", "completed")], [version("v1")]);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("зафиксировать новую версию");
  });

  it("версия закрыла проход — можно дальше", () => {
    const check = checkIterationLaw(
      notebook(["p1"]),
      [pass("p1", "completed")],
      [version("v1"), version("v2", "p1")],
    );
    expect(check.allowed).toBe(true);
  });

  it("изыскание закону не подчиняется", () => {
    const check = checkIterationLaw(
      notebook(["p1"]),
      [pass("p1", "dispatched", "inquiry")],
      [version("v1")],
    );
    expect(check.allowed).toBe(true);
  });
});

describe("findPassToClose", () => {
  it("находит последний завершённый незакрытый проход-линзу", () => {
    expect(
      findPassToClose(notebook(["p1"]), [pass("p1", "completed")], [version("v1")]),
    ).toBe("p1");
  });

  it("уже закрытый проход не закрывается второй раз", () => {
    expect(
      findPassToClose(
        notebook(["p1"]),
        [pass("p1", "completed")],
        [version("v1"), version("v2", "p1")],
      ),
    ).toBeUndefined();
  });
});
