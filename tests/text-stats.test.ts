import { describe, expect, it } from "vitest";
import { textStats } from "../lib/textStats";

describe("счётчик объёма", () => {
  it("считает слова и знаки с пробелами", () => {
    expect(textStats("Она вошла, не поднимая глаз.")).toEqual({ words: 5, chars: 28 });
  });

  it("пустота и пробелы — нули", () => {
    expect(textStats("")).toEqual({ words: 0, chars: 0 });
    expect(textStats("   \n ")).toEqual({ words: 0, chars: 0 });
  });

  it("переводы строк и множественные пробелы не плодят слов", () => {
    expect(textStats("раз\n\nдва   три").words).toBe(3);
  });
});
