import { describe, expect, it } from "vitest";
import { RETURN_OPENERS, RHYTHM_LINES, SVERKA_LINES, pickLine } from "../lib/secretaryLines";

describe("голос секретаря", () => {
  it("pickLine детерминирован по семени и попадает в пул", () => {
    const a = pickLine(SVERKA_LINES, "x-3");
    expect(pickLine(SVERKA_LINES, "x-3")).toBe(a);
    expect(SVERKA_LINES).toContain(a);
  });

  it("разные семена дают разброс (не всегда одна реплика)", () => {
    const seen = new Set(
      Array.from({ length: 12 }, (_, i) => pickLine(RETURN_OPENERS, `nb-${i}`)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it("пустой пул — пустая строка", () => {
    expect(pickLine([], "seed")).toBe("");
  });

  it("во всех репликах есть плейсхолдеры для подстановки", () => {
    for (const line of SVERKA_LINES) expect(line).toContain("{count}");
    for (const line of RETURN_OPENERS) expect(line).toContain("{days}");
    for (const line of RHYTHM_LINES) {
      expect(line).toContain("{count}");
      expect(line).toContain("{days}");
    }
  });
});
