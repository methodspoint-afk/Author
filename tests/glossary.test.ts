import { describe, expect, it } from "vitest";
import { GLOSSARY, lookupGloss } from "../lib/glossary";

describe("глоссарий — единый источник", () => {
  it("находит пояснение по слову (регистронезависимо)", () => {
    expect(lookupGloss("Наставник")).toContain("13 мастеров");
    expect(lookupGloss("наставник")).toBe(lookupGloss("Наставник"));
  });

  it("незнакомое слово — undefined", () => {
    expect(lookupGloss("компас")).toBeUndefined();
  });

  it("«Голос автора» — про корпус, «Разбор роста» — про один текст", () => {
    // Единица анализа (docs/ДВА-ПРОЦЕССА.md): голос поверх текстов ↔ один текст.
    const voice = lookupGloss("Голос автора");
    expect(voice).toBeDefined();
    expect(voice!.toLowerCase()).toContain("текст");
    expect(voice!).toContain("Разбор роста");

    const growth = lookupGloss("Разбор роста");
    expect(growth).toBeDefined();
    expect(growth!.toLowerCase()).toContain("версии");
    expect(growth!).toContain("Голос автора");
  });

  it("убранные термины больше не в глоссарии (одна сущность голоса)", () => {
    expect(lookupGloss("Как растёт ваш голос")).toBeUndefined();
    expect(lookupGloss("Сверка голоса")).toBeUndefined();
  });

  it("нет пустых пояснений", () => {
    for (const group of GLOSSARY) {
      for (const t of group.terms) expect(t.gloss.trim().length).toBeGreaterThan(0);
    }
  });
});
