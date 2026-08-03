import { describe, expect, it } from "vitest";
import {
  buildAuthorVoicePrompt,
  parseAuthorVoiceResponse,
} from "../lib/prompts";
import type { FragmentVersion, Notebook, Pass, PassType } from "../lib/types";
import {
  AUTHOR_VOICE_MIN_TEXTS,
  authorVoiceEligible,
  authorVoiceInput,
  fullyCycledNotebooks,
  textCompletedCycle,
} from "../lib/voice";

let seq = 0;
const uid = (): string => `id-${(seq += 1)}`;

function version(notebookId: string, text: string): FragmentVersion {
  return { id: uid(), notebookId, text, createdAt: new Date(1000 + seq).toISOString() };
}

function pass(notebookId: string, type: PassType, status: Pass["status"] = "completed"): Pass {
  return { id: uid(), type, label: type, notebookId, promptText: "", status };
}

/** Тетрадь с полным циклом: Не высушить + 2 Сверить + Усилить (все завершены). */
function cycledNotebook(title: string): { notebook: Notebook; versions: FragmentVersion[]; passes: Pass[] } {
  const id = uid();
  const v1 = version(id, `${title} — v1`);
  const v2 = version(id, `${title} — финал`);
  const passes = [
    pass(id, "dry-out"),
    pass(id, "mentor-compass"),
    pass(id, "mentor-compass"),
    pass(id, "strengthen"),
  ];
  const notebook: Notebook = {
    id,
    title,
    createdAt: v1.createdAt,
    updatedAt: v2.createdAt,
    versionIds: [v1.id, v2.id],
    passIds: passes.map((p) => p.id),
  };
  return { notebook, versions: [v1, v2], passes };
}

describe("полный цикл текста", () => {
  it("требует Не высушить + ≥2 Сверить + Усилить, все завершённые", () => {
    const { notebook, passes } = cycledNotebook("Т");
    expect(textCompletedCycle(notebook, passes)).toBe(true);
  });

  it("одной сверки мало", () => {
    const id = uid();
    const passes = [pass(id, "dry-out"), pass(id, "mentor-compass"), pass(id, "strengthen")];
    const notebook: Notebook = {
      id, title: "Т", createdAt: "", updatedAt: "",
      versionIds: [], passIds: passes.map((p) => p.id),
    };
    expect(textCompletedCycle(notebook, passes)).toBe(false);
  });

  it("незавершённая линза не засчитывается", () => {
    const id = uid();
    const passes = [
      pass(id, "dry-out"),
      pass(id, "mentor-compass"),
      pass(id, "mentor-compass", "dispatched"),
      pass(id, "strengthen"),
    ];
    const notebook: Notebook = {
      id, title: "Т", createdAt: "", updatedAt: "",
      versionIds: [], passIds: passes.map((p) => p.id),
    };
    expect(textCompletedCycle(notebook, passes)).toBe(false);
  });

  it("без «Усилить» цикл не полон", () => {
    const id = uid();
    const passes = [pass(id, "dry-out"), pass(id, "mentor-compass"), pass(id, "mentor-compass")];
    const notebook: Notebook = {
      id, title: "Т", createdAt: "", updatedAt: "",
      versionIds: [], passIds: passes.map((p) => p.id),
    };
    expect(textCompletedCycle(notebook, passes)).toBe(false);
  });
});

describe("гейт «Голоса автора» — ≥3 текста", () => {
  it("два цикла — рано, три — открывается", () => {
    const a = cycledNotebook("А");
    const b = cycledNotebook("Б");
    const c = cycledNotebook("В");

    const two = { notebooks: [a.notebook, b.notebook], passes: [...a.passes, ...b.passes] };
    expect(authorVoiceEligible(two.notebooks, two.passes)).toBe(false);

    const three = {
      notebooks: [a.notebook, b.notebook, c.notebook],
      passes: [...a.passes, ...b.passes, ...c.passes],
    };
    expect(fullyCycledNotebooks(three.notebooks, three.passes)).toHaveLength(3);
    expect(authorVoiceEligible(three.notebooks, three.passes)).toBe(true);
    expect(AUTHOR_VOICE_MIN_TEXTS).toBe(3);
  });

  it("input берёт финальные версии прошедших цикл текстов", () => {
    const a = cycledNotebook("А");
    const b = cycledNotebook("Б");
    const c = cycledNotebook("В");
    const notebooks = [a.notebook, b.notebook, c.notebook];
    const versions = [...a.versions, ...b.versions, ...c.versions];
    const passes = [...a.passes, ...b.passes, ...c.passes];

    const input = authorVoiceInput(notebooks, versions, passes);
    expect(input).toHaveLength(3);
    expect(input[0]?.text).toContain("финал");
    expect(input.map((t) => t.title)).toEqual(["А", "Б", "В"]);
  });
});

describe("депеша и парсер «Голоса автора»", () => {
  it("депеша содержит все тексты и контракт", () => {
    const prompt = buildAuthorVoicePrompt({
      texts: [
        { title: "А", text: "текст один" },
        { title: "Б", text: "текст два", intention: "чтобы било" },
      ],
    });
    expect(prompt).toContain("текст один");
    expect(prompt).toContain("текст два");
    expect(prompt).toContain("намерение автора: чтобы било");
    expect(prompt).toContain("===IRINAOS===");
  });

  it("парсит секции в GrowthReport (уверенно→wins, колеблется→toWork)", () => {
    const raw = `болтовня
===IRINAOS===
[ГЛАВНОЕ]
Голос узнаётся по сухой иронии.
[УВЕРЕННО]
- Короткая фраза-удар в финале — есть в обоих текстах.
[КОЛЕБЛЕТСЯ]
- Деталь-реприза: в одном тексте держит, в другом теряется.
[СЛЕДУЮЩИЙ ШАГ]
Что если репризу закреплять сознательно?
===КОНЕЦ===
хвост`;
    const report = parseAuthorVoiceResponse(raw);
    expect(report).toBeDefined();
    expect(report!.main).toContain("сухой иронии");
    expect(report!.wins).toHaveLength(1);
    expect(report!.wins[0]).toContain("фраза-удар");
    expect(report!.toWork[0]).toContain("реприза");
    expect(report!.nextStep).toContain("репризу");
  });

  it("без блока — undefined", () => {
    expect(parseAuthorVoiceResponse("нет разметки")).toBeUndefined();
  });
});
