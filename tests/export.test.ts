import { describe, expect, it } from "vitest";
import { buildManuscript, buildReviewManuscript, safeFileName, toPlainText, toRtf } from "../lib/export";
import type { AxisAssessment, FragmentVersion, Notebook, Pass } from "../lib/types";

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

describe("чистовик разбора для скачивания", () => {
  function axis(over: Partial<AxisAssessment>): AxisAssessment {
    return { key: "k", label: "1. Ось", state: "зона роста", seen: "видно", step: "вопрос?", ...over };
  }

  const axisPass: Pass = {
    id: "p1",
    type: "mentor-compass",
    label: "Сверить",
    notebookId: "nb1",
    compassId: "sorkin",
    promptText: "…",
    status: "completed",
    completedAt: "2026-08-02T10:00:00Z",
    intention: "вызвать воспоминания о детстве",
    targetGenreId: "зарисовка",
    parsedResult: { "точка роста": "Смотрите на телесное противоречие.", "упражнение": "Микросцена из трёх звеньев." },
    axisResult: [
      axis({ key: "g1", state: "зона роста", focus: "Сначала взгляд взрослого", priority: true }),
      axis({ key: "s1", state: "сильная сторона", focus: "Большая жизнь не впору", priority: true }),
      axis({ key: "n1", state: "в норме", focus: "Сцена без речи", step: "" }),
    ],
  };

  it("осевой разбор: заголовок наставника, разделы, оси-фокусы, упражнение", () => {
    const m = buildReviewManuscript(axisPass, "Зарисовка про туфли");
    expect(m.title).toContain("Сверить");
    expect(m.title).toContain("Соркин");
    expect(m.body).toContain("Намерение: вызвать воспоминания о детстве");
    expect(m.body).toContain("Жанр: зарисовка");
    expect(m.body).toContain("ГЛАВНОЕ");
    expect(m.body).toContain("ЗОНЫ РОСТА");
    expect(m.body).toContain("Сначала взгляд взрослого (зона роста)");
    expect(m.body).toContain("ЧТО УЖЕ РАБОТАЕТ");
    expect(m.body).toContain("Большая жизнь не впору (сильная сторона)");
    expect(m.body).toContain("УПРАЖНЕНИЕ");
    expect(m.body).toContain("Микросцена из трёх звеньев.");
    // «в норме» и имена осей наружу не выдаём
    expect(m.body).not.toContain("Сцена без речи");
    expect(m.body).not.toContain("1. Ось");
  });

  it("общий случай (изыскание): заголовок «Справка» и секции parsedResult", () => {
    const inquiry: Pass = {
      id: "p2",
      type: "inquiry",
      label: "Изыскание",
      notebookId: "nb1",
      inquiryTopic: "как держится ритм",
      promptText: "…",
      status: "completed",
      parsedResult: { справка: "Ритм держится на повторе." },
    };
    const m = buildReviewManuscript(inquiry);
    expect(m.title).toContain("Справка");
    expect(m.body).toContain("Тема: как держится ритм");
    expect(m.body).toContain("СПРАВКА");
    expect(m.body).toContain("Ритм держится на повторе.");
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
