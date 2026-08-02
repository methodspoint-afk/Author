import { describe, expect, it } from "vitest";
import {
  axisResultToParsed,
  parseCompassResponse,
  topAxes,
} from "../lib/prompts";
import type { AxisAssessment } from "../lib/types";

const AXES = [
  { key: "A_ONE", label: "1. Деталь вместо описания" },
  { key: "A_TWO", label: "2. Краткость как отбор" },
  { key: "A_THREE", label: "3. Ружьё стреляет" },
];

describe("парсер осевого разбора", () => {
  it("раскладывает [ОСЬ N]/[ГЛАВНОЕ]/[УПРАЖНЕНИЕ] и привязывает к осям по номеру", () => {
    const raw = `Вот разбор.
===IRINAOS===
[ОСЬ 1]
состояние: зона роста
видно: три конкурирующие детали в одном абзаце — «шляпа», «зонт», «часы».
шаг: какая из трёх деталей понесёт сцену, если оставить одну?
[ОСЬ 2]
состояние: сильная сторона
видно: фраза сжата до кости, ни одного лишнего слова.
шаг: что удержит эту сжатость на длинной сцене?
[ОСЬ 3]
состояние: в норме
видно: заявленных ружей нет — сцена короткая.
шаг: —
[ГЛАВНОЕ]
Смотрите на отбор деталей: там сейчас главная зона роста.
[УПРАЖНЕНИЕ]
Возьмите чужой абзац с тремя деталями и вычеркните две — оставьте ту, что держит сцену.
===КОНЕЦ===`;
    const parsed = parseCompassResponse(raw, AXES);
    expect(parsed).toBeDefined();
    expect(parsed!.axes).toHaveLength(3);

    const first = parsed!.axes[0]!;
    expect(first.key).toBe("A_ONE");
    expect(first.state).toBe("зона роста");
    expect(first.seen).toContain("три конкурирующие детали");
    expect(first.step).toContain("какая из трёх");

    // у сильной стороны шаг-вопрос тоже сохраняется
    expect(parsed!.axes[1]!.state).toBe("сильная сторона");
    expect(parsed!.axes[1]!.step).toContain("сжатость");
    // «шаг: —» у «в норме» превращается в пустую строку
    expect(parsed!.axes[2]!.state).toBe("в норме");
    expect(parsed!.axes[2]!.step).toBe("");

    expect(parsed!.main).toContain("отбор деталей");
    expect(parsed!.exercise).toContain("вычеркните две");
  });

  it("номер оси вне реестра пропускается, сбой даёт undefined", () => {
    const raw = `===IRINAOS===
[ОСЬ 9]
состояние: зона роста
видно: что-то
шаг: вопрос?
[ГЛАВНОЕ]
итог
===КОНЕЦ===`;
    // ось 9 вне реестра из трёх → оценок нет → undefined
    expect(parseCompassResponse(raw, AXES)).toBeUndefined();
    // нет блока вовсе
    expect(parseCompassResponse("просто текст", AXES)).toBeUndefined();
  });
});

describe("отбор осей для показа", () => {
  const axes: AxisAssessment[] = [
    { key: "n", label: "в норме", state: "в норме", seen: "s", step: "" },
    { key: "s", label: "сильная", state: "сильная сторона", seen: "s", step: "" },
    { key: "g1", label: "рост1", state: "зона роста", seen: "s", step: "q" },
    { key: "g2", label: "рост2", state: "зона роста", seen: "s", step: "q" },
    { key: "g3", label: "рост3", state: "зона роста", seen: "s", step: "q" },
  ];

  it("по умолчанию — все не-«в норме», сначала зоны роста", () => {
    const shown = topAxes(axes);
    // 3 зоны роста + 1 сильная = 4; «в норме» скрыта
    expect(shown).toHaveLength(4);
    expect(shown.slice(0, 3).every((axis) => axis.state === "зона роста")).toBe(true);
    expect(shown[3]!.state).toBe("сильная сторона");
    expect(shown.some((axis) => axis.state === "в норме")).toBe(false);
  });

  it("лимит применяется, только если задан явно", () => {
    expect(topAxes(axes, 2)).toHaveLength(2);
  });

  it("сильная сторона показывается после зон роста", () => {
    const few: AxisAssessment[] = [
      { key: "s", label: "сильная", state: "сильная сторона", seen: "s", step: "q" },
      { key: "g", label: "рост", state: "зона роста", seen: "s", step: "q" },
      { key: "n", label: "норма", state: "в норме", seen: "s", step: "" },
    ];
    const shown = topAxes(few);
    expect(shown.map((a) => a.state)).toEqual(["зона роста", "сильная сторона"]);
  });
});

describe("синтез плоского результата для сводки/изысканий", () => {
  it("«разбор» собран из показанных осей, «точка роста» = главное, «упражнение» = exercise", () => {
    const parsed = axisResultToParsed({
      axes: [
        { key: "g", label: "1. Деталь", state: "зона роста", seen: "три детали", step: "какая понесёт?" },
        { key: "n", label: "2. Краткость", state: "в норме", seen: "ок", step: "" },
      ],
      main: "Смотрите на отбор деталей.",
      exercise: "Вычеркните две детали из трёх.",
    });
    expect(parsed["разбор"]).toContain("Деталь (зона роста): три детали");
    expect(parsed["разбор"]).toContain("→ какая понесёт?");
    expect(parsed["разбор"]).not.toContain("Краткость"); // «в норме» не показываем
    expect(parsed["точка роста"]).toBe("Смотрите на отбор деталей.");
    expect(parsed["упражнение"]).toBe("Вычеркните две детали из трёх.");
  });
});
