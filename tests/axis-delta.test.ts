import { describe, expect, it } from "vitest";
import { getCompass } from "../lib/compasses";
import { allMentorGrowth, mentorGrowth } from "../lib/axisDelta";
import type { AxisAssessment, Pass } from "../lib/types";

const chekhov = getCompass("chekhov")!;
const DETAIL = chekhov.axes[0]!; // «1. Деталь вместо описания»
const NO_JUDGE = chekhov.axes[2]!; // «3. Не судить героев»
const BREVITY = chekhov.axes[5]!; // «6. Краткость как отбор»

function axis(base: { key: string; label: string }, state: AxisAssessment["state"]): AxisAssessment {
  return { key: base.key, label: base.label, state, seen: `наблюдение по ${base.label}`, step: "" };
}

function pass(
  id: string,
  notebookId: string,
  completedAt: string,
  axisResult: AxisAssessment[],
): Pass {
  return {
    id,
    type: "mentor-compass",
    label: "Сверить",
    notebookId,
    compassId: "chekhov",
    promptText: "...",
    status: "completed",
    completedAt,
    axisResult,
  };
}

describe("осевая дельта роста", () => {
  it("ось зона роста → сильная сторона попадает в «окрепло» как выросшая", () => {
    const passes = [
      pass("p1", "nb1", "2026-07-01T10:00:00Z", [
        axis(DETAIL, "зона роста"),
        axis(BREVITY, "зона роста"),
        axis(NO_JUDGE, "в норме"),
      ]),
      pass("p2", "nb2", "2026-07-10T10:00:00Z", [
        axis(DETAIL, "сильная сторона"), // выросла
        axis(BREVITY, "зона роста"), // всё ещё в работе
        axis(NO_JUDGE, "сильная сторона"), // держится (не была зоной роста)
      ]),
    ];
    const g = mentorGrowth(chekhov, passes)!;
    expect(g.passCount).toBe(2);
    expect(g.notebookCount).toBe(2);

    const detail = g.strengthened.find((a) => a.key === DETAIL.key)!;
    expect(detail.grew).toBe(true);
    const noJudge = g.strengthened.find((a) => a.key === NO_JUDGE.key)!;
    expect(noJudge.grew).toBe(false);
    // «выросшие» стоят первыми
    expect(g.strengthened[0]!.key).toBe(DETAIL.key);

    expect(g.toWork.map((a) => a.key)).toEqual([BREVITY.key]);
  });

  it("оси «в норме» не показываем, движение считаем по последней сверке", () => {
    const passes = [
      pass("p1", "nb1", "2026-07-01T10:00:00Z", [axis(DETAIL, "в норме")]),
    ];
    const g = mentorGrowth(chekhov, passes)!;
    expect(g.strengthened).toHaveLength(0);
    expect(g.toWork).toHaveLength(0);
  });

  it("учитывает только завершённые сверки с осями этого наставника", () => {
    const passes: Pass[] = [
      pass("p1", "nb1", "2026-07-01T10:00:00Z", [axis(DETAIL, "зона роста")]),
      { ...pass("p2", "nb1", "2026-07-02T10:00:00Z", [axis(DETAIL, "зона роста")]), status: "draft" },
      { ...pass("p3", "nb1", "2026-07-03T10:00:00Z", []), compassId: "dovlatov" },
    ];
    const g = mentorGrowth(chekhov, passes)!;
    expect(g.passCount).toBe(1);
    expect(g.toWork.map((a) => a.key)).toEqual([DETAIL.key]);
  });

  it("без релевантных сверок — undefined; allMentorGrowth пропускает пустых", () => {
    expect(mentorGrowth(chekhov, [])).toBeUndefined();
    expect(allMentorGrowth([])).toEqual([]);
  });
});
