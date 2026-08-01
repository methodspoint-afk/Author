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

  it("«Как растёт ваш голос» опирается на оси и на базу (сколько сверок)", () => {
    // По решению автора подход измерения по осям сохранён и вынесен наружу
    // (осевой разбор + осевая дельта), поэтому слово «оси» здесь уместно.
    const g = lookupGloss("Как растёт ваш голос");
    expect(g).toBeDefined();
    expect(g!.toLowerCase()).toContain("осям");
    expect(g!.toLowerCase()).toContain("сверк");
  });

  it("нет пустых пояснений", () => {
    for (const group of GLOSSARY) {
      for (const t of group.terms) expect(t.gloss.trim().length).toBeGreaterThan(0);
    }
  });
});
