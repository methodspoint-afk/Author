import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import PassCard from "../../../components/PassCard";
import { collectAuditPairs } from "../../../lib/audit";
import { getAllPasses, getNotebooks } from "../../../lib/data";
import { lastVoiceCheckDate, laterDate, readLastAuditDate } from "../../../lib/rituals";
import { readCollection } from "../../../lib/storage";
import type { FragmentVersion } from "../../../lib/types";
import { startVoiceCheck } from "../../desk/actions";

export const dynamic = "force-dynamic";

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export default async function VoicePage() {
  const [voiceCore, notebooks, passes, versions, auditFileDate] = await Promise.all([
    readIfExists(path.join(process.cwd(), "learning", "AUTHOR-VOICE-CORE.md")),
    getNotebooks(),
    getAllPasses(),
    readCollection<FragmentVersion>("fragment-versions.json"),
    readLastAuditDate(),
  ]);

  const lastCheck = laterDate(auditFileDate, lastVoiceCheckDate(passes));
  const activeCheck = passes.find((pass) => pass.type === "audit" && pass.status !== "completed");
  const doneChecks = passes
    .filter((pass) => pass.type === "audit" && pass.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const pairs = collectAuditPairs(notebooks, versions, lastCheck);

  return (
    <>
      <p className="back-link">
        <Link href="/study">← Кабинет</Link>
      </p>
      <h1>Голос</h1>
      <p className="empty-note">
        Портрет — качественный, не численный: словами и примерами, не графиками. Замеры по
        осям каждого наставника — в <Link href="/study/mentors">Наставниках</Link>.
      </p>

      <h2>Сверка голоса</h2>
      <p className="empty-note">
        Лёгкое зеркало: секретарь смотрит на ваши правки «было ↔ стало» и называет
        2–3 черты — что уже звучит уверенно, а что ещё качается. Выводы делаете вы.
      </p>
      {activeCheck !== undefined ? (
        <div className="pass-list inquiries-list">
          <PassCard pass={activeCheck} defaultOpen />
        </div>
      ) : pairs.length > 0 ? (
        <div className="lens-block audit-block">
          <p>
            С последней сверки{lastCheck !== undefined && ` (${lastCheck})`} накопилось
            правок: {pairs.length}. Секретарь соберёт зеркало из пар «было ↔ стало».
          </p>
          <form action={startVoiceCheck}>
            <button type="submit" className="toolbar-button">
              Сверить голос
            </button>
          </form>
        </div>
      ) : (
        <p className="empty-note">
          Новых правок с последней сверки{lastCheck !== undefined && ` (${lastCheck})`} нет
          — сверять нечего.
        </p>
      )}

      {doneChecks.length > 0 && (
        <>
          <h2>История сверок</h2>
          <div className="pass-list inquiries-list">
            {doneChecks.map((pass) => (
              <PassCard key={pass.id} pass={pass} defaultOpen={false} />
            ))}
          </div>
        </>
      )}

      <h2>Подтверждённые механики</h2>
      {voiceCore !== undefined ? (
        <details className="voice-core" open>
          <summary>Ядро голоса</summary>
          <pre>{voiceCore}</pre>
        </details>
      ) : (
        <p className="empty-note">
          Ядро голоса — портрет подтверждённых механик — собирается из повторов в сверках.
          Полный аудит, который ведёт это ядро сам, появится в следующей версии.
        </p>
      )}
    </>
  );
}
