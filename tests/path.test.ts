import { describe, expect, it } from "vitest";
import { formatDelta, pathMilestones, pathSummary } from "../lib/path";

const versions = [
  { text: "Она вошла в комнату очень медленно и очень тихо.", createdAt: "2026-07-01T10:00:00Z" },
  {
    text: "Она вошла медленно и тихо.",
    createdAt: "2026-07-03T10:00:00Z",
    note: "срезала «очень»",
  },
  { text: "Она вошла тихо. Комната замерла.", createdAt: "2026-07-05T10:00:00Z" },
];

describe("путь фрагмента", () => {
  it("сводка: версии и слова от первой к последней", () => {
    expect(pathSummary(versions)).toEqual({ versions: 3, firstWords: 9, lastWords: 5 });
    expect(pathSummary([])).toEqual({ versions: 0, firstWords: 0, lastWords: 0 });
  });

  it("вехи: номер, дата, пометка, объём и дельта слов", () => {
    const milestones = pathMilestones(versions);
    expect(milestones).toHaveLength(3);
    expect(milestones[0]).toEqual({
      index: 1,
      createdAt: "2026-07-01T10:00:00Z",
      words: 9,
      deltaWords: 0,
    });
    expect(milestones[1]!.note).toBe("срезала «очень»");
    expect(milestones[1]!.deltaWords).toBe(5 - 9);
    expect(milestones[2]!.deltaWords).toBe(5 - 5);
  });

  it("дельта форматируется тихо: +N, −N, ±0", () => {
    expect(formatDelta(12)).toBe("+12");
    expect(formatDelta(-8)).toBe("−8");
    expect(formatDelta(0)).toBe("±0");
  });
});
