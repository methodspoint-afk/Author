import { describe, expect, it } from "vitest";
import { growthChain, growthEligible } from "../lib/growth";
import { buildGrowthPrompt, parseGrowthResponse } from "../lib/prompts";
import type { AxisAssessment, FragmentVersion, Notebook, Pass } from "../lib/types";

function version(id: string, text: string): FragmentVersion {
  return { id, notebookId: "nb", text, createdAt: "2026-08-01T00:00:00Z" };
}

const axis: AxisAssessment = { key: "k", label: "ось", state: "зона роста", seen: "s", step: "?" };

function check(id: string, versionId: string, compassId: string, point: string): Pass {
  return {
    id,
    type: "mentor-compass",
    label: "Сверить",
    notebookId: "nb",
    compassId,
    fragmentVersionId: versionId,
    promptText: "…",
    status: "completed",
    axisResult: [axis],
    parsedResult: { "точка роста": point },
  };
}

const versions = [version("v1", "текст один"), version("v2", "текст два"), version("v3", "текст три")];
const notebook: Notebook = {
  id: "nb",
  title: "Привычка",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  versionIds: ["v1", "v2", "v3"],
  passIds: ["c1", "c2"],
};

describe("цепочка разбора роста (мульти-наставник)", () => {
  it("собирает версии + советы разных наставников + берёт финальную версию", () => {
    const passes = [
      check("c1", "v1", "dovlatov", "сжать сильнее"),
      check("c2", "v2", "chekhov", "деталь вместо описания"),
    ];
    const chain = growthChain(notebook, versions, passes)!;
    expect(chain.checkCount).toBe(2);
    expect(chain.versions.map((v) => v.label)).toEqual(["версия 1", "версия 2", "версия 3"]);
    // советы от РАЗНЫХ наставников
    expect(chain.advice).toHaveLength(2);
    expect(chain.advice[0]!.mentor).toContain("Довлатов");
    expect(chain.advice[1]!.mentor).toContain("Чехов");
    expect(chain.advice[0]!.point).toBe("сжать сильнее");
  });

  it("подтягивает «что берегли» из завершённой «Не высушить»", () => {
    const dryOut: Pass = {
      id: "d0",
      type: "dry-out",
      label: "Не высушить",
      notebookId: "nb",
      promptText: "…",
      status: "completed",
      parsedResult: { разбор: "живёт иронией рассказчицы" },
    };
    const nb = { ...notebook, passIds: ["d0", "c1", "c2"] };
    const passes = [dryOut, check("c1", "v1", "dovlatov", "a"), check("c2", "v2", "dovlatov", "b")];
    expect(growthChain(nb, versions, passes)!.protect).toContain("иронией");
  });

  it("меньше двух сверок — недоступно", () => {
    const passes = [check("c1", "v1", "dovlatov", "a")];
    expect(growthEligible({ ...notebook, passIds: ["c1"] }, passes)).toBe(false);
    expect(growthChain({ ...notebook, passIds: ["c1"] }, versions, passes)).toBeUndefined();
  });

  it("≥2 сверки любых наставников — доступно", () => {
    const passes = [check("c1", "v1", "dovlatov", "a"), check("c2", "v2", "sorkin", "b")];
    expect(growthEligible(notebook, passes)).toBe(true);
  });
});

describe("депеша разбора роста", () => {
  it("нарратив: версии, советы по пути, контракт с бакетами", () => {
    const prompt = buildGrowthPrompt({
      versions: [
        { label: "версия 4", text: "было" },
        { label: "версия 6", text: "стало" },
      ],
      advice: [{ versionLabel: "версия 4", mentor: "Довлатов — сжатость", point: "сжать" }],
      protect: "живёт иронией",
      intention: "вызвать воспоминания",
    });
    expect(prompt).toContain("разбор РОСТА одного текста");
    expect(prompt).toContain("ВЕРСИЯ 4");
    expect(prompt).toContain("Советы наставников по пути");
    expect(prompt).toContain("Довлатов — сжатость: сжать");
    expect(prompt).toContain("живёт иронией");
    expect(prompt).toContain("[ОКРЕПЛО]");
    expect(prompt).toContain("[НАД ЧЕМ ПОРАБОТАТЬ]");
    expect(prompt).toContain("[СЛЕДУЮЩИЙ ШАГ]");
  });
});

describe("парсер разбора роста", () => {
  it("раскладывает Главное/Окрепло/Над чем/Следующий шаг", () => {
    const raw = `===IRINAOS===
[ГЛАВНОЕ]
Текст плотнеет от версии к версии.
[ОКРЕПЛО]
- Сжатие: «говорить не подумав» → «говорить что думаю»
- Ирония стала ходом
[НАД ЧЕМ ПОРАБОТАТЬ]
- Финал три версии на месте
[СЛЕДУЮЩИЙ ШАГ]
Что если финал не спрашивает, а показывает деталью?
===КОНЕЦ===`;
    const r = parseGrowthResponse(raw)!;
    expect(r.main).toContain("плотнеет");
    expect(r.wins).toHaveLength(2);
    expect(r.wins[0]).toContain("говорить что думаю");
    expect(r.toWork).toEqual(["Финал три версии на месте"]);
    expect(r.nextStep).toContain("показывает деталью");
  });

  it("сбой — undefined", () => {
    expect(parseGrowthResponse("просто текст")).toBeUndefined();
  });
});
