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

  it("в интерфейсе оси не раскрываются — «Как растёт ваш голос» без слова «ось»", () => {
    const g = lookupGloss("Как растёт ваш голос");
    expect(g).toBeDefined();
    expect(g!.toLowerCase()).not.toContain("ось");
    expect(g!.toLowerCase()).not.toContain("осям");
  });

  it("нет пустых пояснений", () => {
    for (const group of GLOSSARY) {
      for (const t of group.terms) expect(t.gloss.trim().length).toBeGreaterThan(0);
    }
  });
});
