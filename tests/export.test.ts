import { describe, expect, it } from "vitest";
import { buildManuscript, safeFileName, toPlainText, toRtf } from "../lib/export";
import type { FragmentVersion, Notebook } from "../lib/types";

function version(id: string, text: string): FragmentVersion {
  return { id, notebookId: "nb1", text, createdAt: "2026-07-10T10:00:00Z" };
}

const notebook: Notebook = {
  id: "nb1",
  title: "Она была хорошенькая",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-10T00:00:00Z",
  versionIds: ["v1", "v2"],
  passIds: [],
};

describe("сборка чистовика", () => {
  it("берёт финальную версию по порядку versionIds", () => {
    const m = buildManuscript(notebook, [version("v1", "Черновик."), version("v2", "Чистовик.")]);
    expect(m).toEqual({ title: "Она была хорошенькая", body: "Чистовик." });
  });

  it("без версий — пустое тело", () => {
    expect(buildManuscript({ ...notebook, versionIds: [] }, []).body).toBe("");
  });
});

describe("плоский текст", () => {
  it("заголовок, пустая строка, тело", () => {
    expect(toPlainText({ title: "Заголовок", body: "Тело." })).toBe("Заголовок\n\nТело.\n");
  });
});

describe("RTF для Word", () => {
  const rtf = toRtf({ title: "Тест", body: "Абзац один.\n\nАбзац два." });

  it("валидный каркас RTF с кодовой страницей", () => {
    expect(rtf).toContain("{\\rtf1\\ansi");
    expect(rtf.endsWith("}")).toBe(true);
  });

  it("кириллица уходит в \\u-эскейпы, не сырыми байтами", () => {
    // «Т» = U+0422 = 1058
    expect(rtf).toContain("\\u1058?");
    expect(rtf).not.toContain("Тест");
  });

  it("перевод строки становится \\par", () => {
    expect(rtf).toContain("\\par");
  });
});

describe("безопасное имя файла", () => {
  it("сохраняет буквы/цифры, чистит пунктуацию, добавляет расширение", () => {
    expect(safeFileName("Она была хорошенькая!", "rtf")).toBe("Она была хорошенькая.rtf");
  });

  it("пустой заголовок → запасное имя", () => {
    expect(safeFileName("!!!", "txt")).toBe("тетрадь.txt");
  });
});
