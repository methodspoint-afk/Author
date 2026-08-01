import { describe, expect, it } from "vitest";
import {
  buildCompassPrompt,
  buildDryOutPrompt,
  buildVoiceCheckPrompt,
  extractGrowthPoint,
  parsePromptResponse,
} from "../lib/prompts";

describe("сборка промптов", () => {
  it("промпт запрещает писать за автора и содержит контракт формата", () => {
    const prompt = buildDryOutPrompt({ text: "текст", intention: "чтобы финал бил" });
    expect(prompt).toContain("НИКОГДА не пишете");
    expect(prompt).toContain("Намерение автора");
    expect(prompt).toContain("чтобы финал бил");
    expect(prompt).toContain("===IRINAOS===");
    expect(prompt).toContain("===КОНЕЦ===");
  });

  it("компас-промпт включает знание компаса, оси и перенос жанра", () => {
    const prompt = buildCompassPrompt({
      text: "текст",
      compassTitle: "Соркин — намерение и препятствие",
      compassKnowledge: "# ААРОН СОРКИН\n...оси...",
      nativeGenre: "драма и сценарий",
      axes: [
        { key: "SORKIN_INTENTION_OBSTACLE", label: "1. Намерение и препятствие" },
        { key: "SORKIN_LINE_AS_ACTION", label: "2. Реплика — это действие" },
      ],
      targetGenre: "иронический детектив",
    });
    expect(prompt).toContain("ААРОН СОРКИН");
    expect(prompt).toContain("ПЕРЕНОС ЖАНРА");
    expect(prompt).toContain("иронический детектив");
    expect(prompt).toContain("драма и сценарий");
    // оси перечислены нумерованным списком и есть осевой контракт
    expect(prompt).toContain("1. Намерение и препятствие");
    expect(prompt).toContain("2. Реплика — это действие");
    expect(prompt).toContain("[ОСЬ 1]");
    expect(prompt).toContain("[ГЛАВНОЕ]");
  });
});

describe("депеша сверки голоса (версия 1.0)", () => {
  it("лёгкое зеркало: одна секция, без механик-таблиц и дельт", () => {
    const prompt = buildVoiceCheckPrompt([
      { notebookTitle: "Малышка", before: "Было.", after: "Стало.", note: "срезала разгон" },
    ]);
    expect(prompt).toContain("сверка голоса");
    expect(prompt).toContain("тетрадь «Малышка»");
    expect(prompt).toContain("Было.");
    expect(prompt).toContain("Стало.");
    expect(prompt).toContain("[СЕКЦИЯ: сверка]");
    expect(prompt).toContain("===КОНЕЦ===");
    // именно лёгкий вариант — без секций полного аудита
    expect(prompt).not.toContain("[СЕКЦИЯ: механики]");
    expect(prompt).not.toContain("[СЕКЦИЯ: дрейф голоса]");
  });
});

describe("парсер по контракту формата", () => {
  it("разбирает секции внутри блока", () => {
    const raw = `Вот мой разбор.
===IRINAOS===
[СЕКЦИЯ: диагноз]
Деталь глушится соседями.
[СЕКЦИЯ: точка роста]
Отбор одной детали вместо трёх.
===КОНЕЦ===
Спасибо!`;
    const parsed = parsePromptResponse(raw);
    expect(parsed).toBeDefined();
    expect(parsed!["диагноз"]).toBe("Деталь глушится соседями.");
    expect(extractGrowthPoint(parsed!)).toBe("Отбор одной детали вместо трёх.");
  });

  it("возвращает undefined без блока или без секций", () => {
    expect(parsePromptResponse("просто текст")).toBeUndefined();
    expect(parsePromptResponse("===IRINAOS===\nбез секций\n===КОНЕЦ===")).toBeUndefined();
  });
});
