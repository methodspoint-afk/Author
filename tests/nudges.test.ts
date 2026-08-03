import { describe, expect, it } from "vitest";
import { authorVoiceNear, cycleMissingStep, growthNear } from "../lib/nudges";
import type { Notebook, Pass, PassType } from "../lib/types";

let seq = 0;
const uid = (): string => `id-${(seq += 1)}`;

function pass(notebookId: string, type: PassType, status: Pass["status"] = "completed"): Pass {
  return { id: uid(), type, label: type, notebookId, promptText: "", status };
}

function notebookOf(passes: Pass[]): Notebook {
  const id = passes[0]?.notebookId ?? uid();
  return {
    id, title: "Т", createdAt: "", updatedAt: "",
    versionIds: [], passIds: passes.map((p) => p.id),
  };
}

/** Тетрадь с заданным числом завершённых линз. */
function make(dry: number, checks: number, str: number): { notebook: Notebook; passes: Pass[] } {
  const id = uid();
  const passes: Pass[] = [];
  for (let i = 0; i < dry; i++) passes.push(pass(id, "dry-out"));
  for (let i = 0; i < checks; i++) passes.push(pass(id, "mentor-compass"));
  for (let i = 0; i < str; i++) passes.push(pass(id, "strengthen"));
  return { notebook: notebookOf(passes.length > 0 ? passes : [pass(id, "dry-out", "draft")]), passes };
}

describe("близость «Разбора роста»", () => {
  it("одна сверка — на подходе; две — уже открыт (не близость)", () => {
    const one = make(0, 1, 0);
    expect(growthNear(one.notebook, one.passes)).toBe(true);
    const two = make(0, 2, 0);
    expect(growthNear(two.notebook, two.passes)).toBe(false);
    const none = make(0, 0, 0);
    expect(growthNear(none.notebook, none.passes)).toBe(false);
  });

  it("незавершённая сверка не считается", () => {
    const id = uid();
    const passes = [pass(id, "mentor-compass", "dispatched")];
    expect(growthNear(notebookOf(passes), passes)).toBe(false);
  });
});

describe("недостающий шаг полного цикла", () => {
  it("есть Не высушить + 2 сверки, нет Усилить → не хватает «Усилить»", () => {
    const { notebook, passes } = make(1, 2, 0);
    expect(cycleMissingStep(notebook, passes)).toBe("strengthen");
  });

  it("есть Усилить + 2 сверки, нет Не высушить → не хватает «Не высушить»", () => {
    const { notebook, passes } = make(0, 2, 1);
    expect(cycleMissingStep(notebook, passes)).toBe("dry-out");
  });

  it("цикл полон → null", () => {
    const { notebook, passes } = make(1, 2, 1);
    expect(cycleMissingStep(notebook, passes)).toBeNull();
  });

  it("нет ни Не высушить, ни Усилить (два шага) → null", () => {
    const { notebook, passes } = make(0, 2, 0);
    expect(cycleMissingStep(notebook, passes)).toBeNull();
  });

  it("меньше двух сверок → рано, null", () => {
    const { notebook, passes } = make(1, 1, 0);
    expect(cycleMissingStep(notebook, passes)).toBeNull();
  });
});

describe("близость «Голоса автора»", () => {
  it("два полных цикла из трёх — на подходе; три — уже открыт", () => {
    const a = make(1, 2, 1);
    const b = make(1, 2, 1);
    const c = make(1, 2, 1);

    const two = { nb: [a.notebook, b.notebook], ps: [...a.passes, ...b.passes] };
    expect(authorVoiceNear(two.nb, two.ps)).toBe(true);

    const three = {
      nb: [a.notebook, b.notebook, c.notebook],
      ps: [...a.passes, ...b.passes, ...c.passes],
    };
    expect(authorVoiceNear(three.nb, three.ps)).toBe(false);
  });

  it("один полный цикл — ещё не близость", () => {
    const a = make(1, 2, 1);
    expect(authorVoiceNear([a.notebook], a.passes)).toBe(false);
  });
});
