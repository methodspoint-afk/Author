import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import PassCard from "../../../components/PassCard";
import { collectAuditPairs } from "../../../lib/audit";
import { getAllPasses, getNotebooks } from "../../../lib/data";
import { readLastAuditDate } from "../../../lib/rituals";
import { readCollection } from "../../../lib/storage";
import type { FragmentVersion } from "../../../lib/types";
import { startAudit } from "../../desk/actions";

export const dynamic = "force-dynamic";

const auditDateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const auditMonthFormat = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Имя файла аудита (AUDIT-YYYY-MM[-DD]) → человеческий заголовок без .md.
function auditLabel(name: string): string {
  const match = /^AUDIT-(\d{4})-(\d{2})(?:-(\d{2}))?$/u.exec(name);
  if (match === null) return name.replace(/^AUDIT-/u, "Аудит ");
  const [, year, month, day] = match;
  if (day !== undefined) {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return `Аудит от ${auditDateFormat.format(date)}`;
  }
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return `Аудит за ${auditMonthFormat.format(date)}`;
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function readAudits(): Promise<Array<{ name: string; content: string }>> {
  const dir = path.join(process.cwd(), "learning", "audits");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const audits = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .sort()
      .reverse()
      .map(async (file) => ({
        name: file.replace(/\.md$/u, ""),
        content: await fs.readFile(path.join(dir, file), "utf8"),
      })),
  );
  return audits;
}

export default async function VoicePage() {
  const [voiceCore, audits, notebooks, passes, versions, lastAuditDate] = await Promise.all([
    readIfExists(path.join(process.cwd(), "learning", "AUTHOR-VOICE-CORE.md")),
    readAudits(),
    getNotebooks(),
    getAllPasses(),
    readCollection<FragmentVersion>("fragment-versions.json"),
    readLastAuditDate(),
  ]);

  const activeAudit = passes.find((pass) => pass.type === "audit" && pass.status !== "completed");
  const pairs = collectAuditPairs(notebooks, versions, lastAuditDate);

  return (
    <>
      <p className="back-link">
        <Link href="/study">← Кабинет</Link>
      </p>
      <h1>Голос</h1>
      <p className="empty-note">
        Портрет — качественный, не численный: словами и примерами, не графиками. Замеры по
        осям каждого наставника переехали в <Link href="/study/mentors">Наставники</Link>.
      </p>

      <h2>Аудит</h2>
      {activeAudit !== undefined ? (
        <div className="pass-list inquiries-list">
          <PassCard pass={activeAudit} defaultOpen />
        </div>
      ) : pairs.length > 0 ? (
        <div className="lens-block audit-block">
          <p>
            С последнего аудита{lastAuditDate !== undefined && ` (${lastAuditDate})`} накопилось
            правок: {pairs.length}. Секретарь соберёт депешу из пар «было ↔ стало».
          </p>
          <form action={startAudit}>
            <button type="submit" className="toolbar-button">
              Провести аудит
            </button>
          </form>
        </div>
      ) : (
        <p className="empty-note">
          Новых правок с последнего аудита{lastAuditDate !== undefined && ` (${lastAuditDate})`} нет
          — сверять нечего.
        </p>
      )}

      <h2>Подтверждённые механики</h2>
      {voiceCore !== undefined ? (
        <details className="voice-core" open>
          <summary>Ядро голоса</summary>
          <pre>{voiceCore}</pre>
        </details>
      ) : (
        <p className="empty-note">
          Ядро голоса ещё не заведено — оно появится с первым подтверждённым кандидатом аудита
          (правило 2–3 повторов).
        </p>
      )}

      <h2>Аудиты</h2>
      {audits.length === 0 ? (
        <p className="empty-note">Аудитов пока не было.</p>
      ) : (
        audits.map((audit) => (
          <details key={audit.name} className="voice-core">
            <summary>{auditLabel(audit.name)}</summary>
            <pre>{audit.content}</pre>
          </details>
        ))
      )}
    </>
  );
}
