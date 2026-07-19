import { describe, expect, it } from "vitest";
import { auditReminder, countVersionsSince, readLastAuditDate } from "../lib/rituals";
import type { FragmentVersion } from "../lib/types";

function version(createdAt: string): FragmentVersion {
  return { id: createdAt, notebookId: "nb1", text: "т", createdAt };
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
