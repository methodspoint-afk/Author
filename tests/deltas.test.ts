import { describe, expect, it } from "vitest";
import { extractDeltaTable, summarizeDeltaTable } from "../lib/deltas";
import type { CompassMeta } from "../lib/compasses";

const compass = { id: "chekhov", title: "Чехов" } as CompassMeta;

const md = `## CHEKHOV-DELTA — замер движения

| Ось | Базовый уровень | Замер 1 | Динамика |
|-----|-----------------|---------|----------|
| Деталь-отбор | сильная база | отбор одной детали держится | повышена до подтверждённой сильной стороны |
| Бесстрастность в боли | точка роста | боль прячется под иронией почти до конца | без сдвига |
| Ружья | системно закрыто | всё на месте | стабильно, есть за чем следить |
`;

describe("сводка дельты без осей", () => {
  const table = extractDeltaTable(md);

  it("таблица парсится", () => {
    expect(table).toBeDefined();
    expect(table!.rows).toHaveLength(3);
  });

  it("сводка отделяет «окрепло» от «над чем поработать» по наблюдениям", () => {
    const s = summarizeDeltaTable({ compass, ...table! });
    expect(s.wins).toContain("отбор одной детали держится");
    // «точка роста» в базовом уровне → над чем поработать
    expect(s.toWork).toContain("боль прячется под иронией почти до конца");
    expect(s.toWork).toContain("всё на месте"); // «следить» в динамике
  });

  it("не раскрывает названия осей и грид", () => {
    const s = summarizeDeltaTable({ compass, ...table! });
    const all = [...s.wins, ...s.toWork].join(" ");
    expect(all).not.toContain("Ось");
    expect(all).not.toContain("Деталь-отбор");
    expect(all).not.toContain("Динамика");
  });
});
