import { describe, expect, it } from "vitest";
import {
  buildCompassPrompt,
  buildDryOutPrompt,
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

  it("компас-промпт включает знание компаса и перенос жанра", () => {
    const prompt = buildCompassPrompt({
      text: "текст",
      compassTitle: "Соркин — намерение и препятствие",
      compassKnowledge: "# ААРОН СОРКИН\n...оси...",
      nativeGenre: "драма и сценарий",
      targetGenre: "иронический детектив",
    });
    expect(prompt).toContain("ААРОН СОРКИН");
    expect(prompt).toContain("ПЕРЕНОС ЖАНРА");
    expect(prompt).toContain("иронический детектив");
    expect(prompt).toContain("драма и сценарий");
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
