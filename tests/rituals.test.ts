import { describe, expect, it } from "vitest";
import {
  auditReminder,
  countVersionsSince,
  daysSince,
  lastVoiceCheckDate,
  laterDate,
  readLastAuditDate,
  workRhythm,
} from "../lib/rituals";
import type { FragmentVersion, Pass } from "../lib/types";

function version(createdAt: string): FragmentVersion {
  return { id: createdAt, notebookId: "nb1", text: "т", createdAt };
}

function versionOf(notebookId: string, createdAt: string): FragmentVersion {
  return { id: `${notebookId}-${createdAt}`, notebookId, text: "т", createdAt };
}

describe("напоминание об аудите", () => {
  const versions = [
    version("2026-07-04T10:00:00Z"),
    version("2026-07-05T10:00:00Z"), // день аудита — не считается
    version("2026-07-06T10:00:00Z"),
    version("2026-07-07T10:00:00Z"),
  ];

  it("считает только версии строго после дня аудита", () => {
    expect(countVersionsSince(versions, "2026-07-05")).toBe(2);
  });

  it("без аудита считаются все версии", () => {
    expect(countVersionsSince(versions, undefined)).toBe(4);
  });

  it("due — только при достижении порога", () => {
    expect(auditReminder(versions, "2026-07-05", 3).due).toBe(false);
    expect(auditReminder(versions, "2026-07-05", 2)).toEqual({
      due: true,
      count: 2,
      threshold: 2,
    });
  });

  it("readLastAuditDate читает дату из реального файла аудита", async () => {
    // learning/audits/AUDIT-2026-07.md содержит «Дата: 2026-07-05»
    expect(await readLastAuditDate()).toBe("2026-07-05");
  });

  it("readLastAuditDate берёт максимум по дате, а не по имени файла", async () => {
    // Лексикографически AUDIT-2026-07.md > AUDIT-2026-07-19.md («.» > «-»),
    // но последний аудит — тот, чья «Дата:» позже.
    const { promises: fs } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "irinaos-audit-"));
    const dir = path.join(root, "learning", "audits");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "AUDIT-2026-07.md"), "Дата: 2026-07-05", "utf8");
    await fs.writeFile(path.join(dir, "AUDIT-2026-07-19.md"), "Дата: 2026-07-19", "utf8");

    expect(await readLastAuditDate(root)).toBe("2026-07-19");
    await fs.rm(root, { recursive: true, force: true });
  });
});

describe("дата последней сверки голоса", () => {
  function auditPass(status: Pass["status"], completedAt?: string): Pass {
    return {
      id: completedAt ?? status,
      type: "audit",
      label: "Сверка голоса",
      notebookId: "audit-1",
      promptText: "…",
      status,
      ...(completedAt !== undefined && { completedAt }),
    };
  }

  it("берёт максимум по завершённым проходам-сверкам", () => {
    const passes = [
      auditPass("completed", "2026-07-10T10:00:00Z"),
      auditPass("completed", "2026-07-22T10:00:00Z"),
      auditPass("draft"),
    ];
    expect(lastVoiceCheckDate(passes)).toBe("2026-07-22");
  });

  it("нет завершённых сверок — undefined", () => {
    expect(lastVoiceCheckDate([auditPass("draft")])).toBeUndefined();
  });

  it("laterDate выбирает позднюю дату, undefined уступает", () => {
    expect(laterDate("2026-07-05", "2026-07-22")).toBe("2026-07-22");
    expect(laterDate(undefined, "2026-07-22")).toBe("2026-07-22");
    expect(laterDate("2026-07-05", undefined)).toBe("2026-07-05");
    expect(laterDate(undefined, undefined)).toBeUndefined();
  });
});

describe("сколько дней прошло", () => {
  const now = new Date("2026-08-01T12:00:00Z");
  it("считает полные дни", () => {
    expect(daysSince("2026-07-22T10:00:00Z", now)).toBe(10);
  });
  it("будущее и мусор → 0", () => {
    expect(daysSince("2026-08-05T00:00:00Z", now)).toBe(0);
    expect(daysSince("не дата", now)).toBe(0);
  });
});

describe("констатация ритма", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  // nb1: первая версия (не правка) + 5 правок в окне; nb2: одна первая версия
  const versions: FragmentVersion[] = [
    versionOf("nb1", "2026-07-01T10:00:00Z"), // первая — не правка
    versionOf("nb1", "2026-07-10T10:00:00Z"),
    versionOf("nb1", "2026-07-12T10:00:00Z"),
    versionOf("nb1", "2026-07-14T10:00:00Z"),
    versionOf("nb1", "2026-07-20T10:00:00Z"),
    versionOf("nb1", "2026-07-28T10:00:00Z"),
    versionOf("nb2", "2026-07-25T10:00:00Z"), // единственная версия — не правка
  ];

  it("считает правки в окне, кроме первых версий тетрадей", () => {
    const rhythm = workRhythm(versions, now, 30, 5);
    expect(rhythm.count).toBe(5);
    expect(rhythm.due).toBe(true);
    expect(rhythm.windowDays).toBe(30);
  });

  it("правки старше окна не в счёт", () => {
    // окно 7 дней от 30 июля — в него попадает только правка от 28-го
    expect(workRhythm(versions, now, 7, 5).count).toBe(1);
    expect(workRhythm(versions, now, 7, 5).due).toBe(false);
  });

  it("ниже порога — не due", () => {
    expect(workRhythm(versions, now, 30, 6).due).toBe(false);
  });
});
