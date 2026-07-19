import { describe, expect, it } from "vitest";
import { buildNewNotebook } from "../lib/notebook";

describe("заведение новой тетради", () => {
  const now = "2026-07-19T10:00:00Z";
  function ids(): () => string {
    let n = 0;
    return () => `id${++n}`;
  }

  it("собирает тетрадь с первой версией из текста", () => {
    const result = buildNewNotebook(
      { title: "  Малышка в туфлях  ", text: "  Первый текст.  " },
      now,
      ids(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.notebook.title).toBe("Малышка в туфлях"); // обрезан пробел
    expect(result.notebook.createdAt).toBe(now);
    expect(result.notebook.updatedAt).toBe(now);
    expect(result.notebook.passIds).toEqual([]);
    // первая версия связана с тетрадью и попала в versionIds
    expect(result.notebook.versionIds).toEqual([result.version.id]);
    expect(result.version.notebookId).toBe(result.notebook.id);
    expect(result.version.text).toBe("Первый текст.");
    expect(result.version.createdAt).toBe(now);
    expect(result.version.basedOnPassId).toBeUndefined();
  });

  it("без названия — ошибка", () => {
    const result = buildNewNotebook({ title: "   ", text: "есть текст" }, now, ids());
    expect(result).toEqual({ ok: false, error: "Дайте тетради название." });
  });

  it("без текста — ошибка (иначе не завести проход)", () => {
    const result = buildNewNotebook({ title: "Есть название", text: "  " }, now, ids());
    expect(result).toEqual({ ok: false, error: "Вставьте первый текст фрагмента." });
  });
});
