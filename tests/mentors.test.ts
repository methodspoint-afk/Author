import { describe, expect, it } from "vitest";
import { ACTIVE_COMPASS_IDS, ACTIVE_COMPASSES, COMPASSES, isCompassActive } from "../lib/compasses";
import { mentorEngagement } from "../lib/mentors";
import type { Pass } from "../lib/types";

function compassPass(
  id: string,
  compassId: string,
  status: Pass["status"],
  completedAt?: string,
): Pass {
  return {
    id,
    type: "mentor-compass",
    label: "Компас",
    notebookId: "nb1",
    compassId,
    promptText: "...",
    status,
    ...(completedAt !== undefined && { completedAt }),
  };
}

describe("активные наставники", () => {
  it("ровно три задействованы, и это боевые компасы", () => {
    expect(ACTIVE_COMPASS_IDS).toEqual(["chekhov", "dovlatov", "sorkin"]);
    expect(ACTIVE_COMPASSES).toHaveLength(3);
    expect(isCompassActive("chekhov")).toBe(true);
    expect(isCompassActive("hemingway")).toBe(false);
  });

  it("на карте всё равно все 13", () => {
    expect(COMPASSES).toHaveLength(13);
  });
});

describe("вовлечённость наставников", () => {
  it("считает только завершённые проходы по компасу и берёт последнюю дату", () => {
    const passes = [
      compassPass("p1", "chekhov", "completed", "2026-07-01T10:00:00Z"),
      compassPass("p2", "chekhov", "completed", "2026-07-05T10:00:00Z"),
      compassPass("p3", "chekhov", "draft"), // не в счёт
      compassPass("p4", "dovlatov", "dispatched"), // не в счёт
    ];
    const map = mentorEngagement(passes);
    expect(map.get("chekhov")).toEqual({ count: 2, lastAt: "2026-07-05T10:00:00Z" });
    expect(map.has("dovlatov")).toBe(false);
  });

  it("проход без compassId не ломает подсчёт", () => {
    const pass = { ...compassPass("p1", "x", "completed", "2026-07-01T10:00:00Z") };
    delete (pass as { compassId?: string }).compassId;
    expect(mentorEngagement([pass]).size).toBe(0);
  });
});
