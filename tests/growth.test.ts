import { describe, expect, it } from "vitest";
import { getCompass } from "../lib/compasses";
import { eligibleGrowthMentors, growthChain } from "../lib/growth";
import { buildGrowthPrompt, parseGrowthResponse } from "../lib/prompts";
import type { AxisAssessment, FragmentVersion, Notebook, Pass } from "../lib/types";

function version(id: string, text: string): FragmentVersion {
  return { id, notebookId: "nb", text, createdAt: "2026-08-01T00:00:00Z" };
}

const axis: AxisAssessment = {
  key: "k",
  label: "ось",
  state: "зона роста",
  seen: "видно",
  step: "?",
};

function check(id: string, versionId: string, compassId = "dovlatov"): Pass {
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
  };
}

const notebook: Notebook = {
  id: "nb",
  title: "Привычка говорить что думаю",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  versionIds: ["v1", "v2", "v3"],
  passIds: ["c1", "c2"],
};
const versions = [version("v1", "текст один"), version("v2", "текст два"), version("v3", "текст три")];

describe("цепочка разбора роста", () => {
  it("собирает версии сверок + финальную, ≥2 сверки одного наставника", () => {
    const passes = [check("c1", "v1"), check("c2", "v2")];
    const chain = growthChain(notebook, versions, passes, "dovlatov")!;
    expect(chain.checkCount).toBe(2);
    expect(chain.versions.map((v) => v.label)).toEqual(["версия 1", "версия 2", "версия 3"]);
    expect(chain.versions[2]!.text).toBe("текст три");
  });

  it("меньше двух сверок — нет разбора роста", () => {
    const passes = [check("c1", "v1")];
    expect(growthChain({ ...notebook, passIds: ["c1"] }, versions, passes, "dovlatov")).toBeUndefined();
  });

  it("eligibleGrowthMentors — наставники с ≥2 сверками в тетради", () => {
    const passes = [check("c1", "v1"), check("c2", "v2"), check("c3", "v2", "chekhov")];
    const nb = { ...notebook, passIds: ["c1", "c2", "c3"] };
    expect(eligibleGrowthMentors(nb, passes)).toEqual(["dovlatov"]); // у Чехова только 1
  });
});

describe("депеша разбора роста", () => {
  it("включает оси, версии по порядку и контракт движения", () => {
    const compass = getCompass("dovlatov")!;
    const prompt = buildGrowthPrompt({
      compassTitle: compass.title,
      compassKnowledge: "# ДОВЛАТОВ\n...",
      axes: compass.axes,
      versions: [
        { label: "версия 4", text: "было" },
        { label: "версия 6", text: "стало" },
      ],
    });
    expect(prompt).toContain("разбор РОСТА");
    expect(prompt).toContain("ВЕРСИЯ 4");
    expect(prompt).toContain("ВЕРСИЯ 6");
    expect(prompt).toContain("движение:");
    expect(prompt).toContain("[ОСЬ 1]");
    expect(prompt).toContain("[ГЛАВНОЕ]");
    expect(prompt).not.toContain("1. 1."); // без задвоения номера
  });
});

describe("парсер разбора роста", () => {
  const axes = [
    { key: "A", label: "1. Сжатие" },
    { key: "B", label: "2. Слух" },
  ];
  it("раскладывает движение/фокус/видно/шаг + главное", () => {
    const raw = `===IRINAOS===
[ОСЬ 1]
движение: окрепло
фокус: фраза сжалась
видно: «говорить не подумав мысли вслух» → «говорить что думаю»
шаг: где ещё можно срезать объяснение?
[ОСЬ 2]
движение: без изменений
фокус: финал на месте
видно: финал не двигался между версиями
шаг: —
[ГЛАВНОЕ]
Текст плотнеет; дальше — финал.
===КОНЕЦ===`;
    const parsed = parseGrowthResponse(raw, axes)!;
    expect(parsed.axes).toHaveLength(2);
    expect(parsed.axes[0]!.movement).toBe("окрепло");
    expect(parsed.axes[0]!.focus).toBe("фраза сжалась");
    expect(parsed.axes[0]!.seen).toContain("говорить что думаю");
    expect(parsed.axes[0]!.step).toContain("срезать");
    expect(parsed.axes[1]!.movement).toBe("без изменений");
    expect(parsed.axes[1]!.step).toBe(""); // «—» → пусто
    expect(parsed.main).toContain("плотнеет");
  });

  it("«просело» распознаётся, сбой — undefined", () => {
    const raw = `===IRINAOS===\n[ОСЬ 1]\nдвижение: стало хуже\nвидно: расплылось\nшаг: ?\n[ГЛАВНОЕ]\nитог\n===КОНЕЦ===`;
    expect(parseGrowthResponse(raw, axes)!.axes[0]!.movement).toBe("просело");
    expect(parseGrowthResponse("просто текст", axes)).toBeUndefined();
  });
});
