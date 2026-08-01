import Link from "next/link";
import NewNotebookForm from "../../components/NewNotebookForm";
import SecretaryNote from "../../components/SecretaryNote";
import { RHYTHM_LINES, SVERKA_LINES, pickLine } from "../../lib/secretaryLines";
import { getAllPasses, getNotebooks } from "../../lib/data";
import { findPassToClose } from "../../lib/iteration";
import { auditReminder, lastVoiceCheckDate, laterDate, readLastAuditDate, workRhythm } from "../../lib/rituals";
import { readCollection } from "../../lib/storage";
import type { FragmentVersion } from "../../lib/types";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default async function DeskPage() {
  const [notebooks, passes, versions, lastAuditDate] = await Promise.all([
    getNotebooks(),
    getAllPasses(),
    readCollection<FragmentVersion>("fragment-versions.json"),
    readLastAuditDate(),
  ]);
  const lastCheck = laterDate(lastAuditDate, lastVoiceCheckDate(passes));
  const reminder = auditReminder(versions, lastCheck);
  const rhythm = workRhythm(versions);

  const passById = new Map(passes.map((pass) => [pass.id, pass]));
  // Тетради, состоящие из одних изысканий и аудитов, живут в Кабинете, не на Столе.
  const cabinetTypes = new Set(["inquiry", "audit"]);
  const isCabinetOnly = (notebook: (typeof notebooks)[number]): boolean =>
    notebook.versionIds.length === 0 &&
    notebook.passIds.length > 0 &&
    notebook.passIds.every((id) => cabinetTypes.has(passById.get(id)?.type ?? ""));

  const active = notebooks
    .filter((notebook) => notebook.shelvedAt === undefined && !isCabinetOnly(notebook))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const dispatchedByNotebook = new Map<string, number>();
  for (const pass of passes) {
    if (pass.status === "dispatched") {
      dispatchedByNotebook.set(pass.notebookId, (dispatchedByNotebook.get(pass.notebookId) ?? 0) + 1);
    }
  }

  return (
    <>
      <h1>Стол</h1>
      <p className="masthead-motto">
        Каждый большой писатель начинал с маленькой тетради: пишите так, как хотите и умеете, и
        начать можно прямо сейчас. Просто нажмите кнопку «Новая тетрадь» и вставьте текст, с
        которым хотите поработать. Или откройте в подборке свой текст, к которому хотите
        вернуться.
      </p>
      {reminder.due ? (
        <SecretaryNote id={`audit-${lastCheck ?? "none"}-${reminder.count}`}>
          {pickLine(SVERKA_LINES, `${lastCheck ?? "none"}-${reminder.count}`).replace(
            "{count}",
            `${reminder.count} ${plural(reminder.count, "правка", "правки", "правок")}`,
          )}{" "}
          <Link href="/study/voice">Сверить голос →</Link>
        </SecretaryNote>
      ) : (
        rhythm.due && (
          <SecretaryNote id={`rhythm-${rhythm.windowDays}-${rhythm.count}`}>
            {pickLine(RHYTHM_LINES, `${rhythm.windowDays}-${rhythm.count}`)
              .replace("{days}", `${rhythm.windowDays} ${plural(rhythm.windowDays, "день", "дня", "дней")}`)
              .replace("{count}", `${rhythm.count} ${plural(rhythm.count, "правка", "правки", "правок")}`)}
          </SecretaryNote>
        )
      )}
      <div className="notebook-toolbar">
        <NewNotebookForm />
      </div>
      {active.length === 0 ? (
        <p className="empty-note">
          На столе пусто. Заведите новую тетрадь, верните что-то с полки — или посмотрите,{" "}
          <Link href="/start">с чего начать</Link>.
        </p>
      ) : (
        <ul className="notebook-list">
          {active.map((notebook) => {
            const waiting = dispatchedByNotebook.get(notebook.id) ?? 0;
            return (
              <li key={notebook.id} className="notebook-card">
                <Link href={`/desk/${notebook.id}`}>{notebook.title}</Link>
                <div className="notebook-meta">
                  <span>
                    {notebook.versionIds.length}{" "}
                    {plural(notebook.versionIds.length, "версия", "версии", "версий")}
                  </span>
                  <span>
                    {notebook.passIds.length}{" "}
                    {plural(notebook.passIds.length, "разбор", "разбора", "разборов")}
                  </span>
                  {waiting > 0 && (
                    <span className="tag-wait">
                      {waiting === 1 ? "депеша ждёт ответа" : `депеш ждут ответа: ${waiting}`}
                    </span>
                  )}
                  {findPassToClose(notebook, passes, versions) !== undefined && (
                    <span className="tag-edit">разбор получен — ждёт правки</span>
                  )}
                  {notebook.committedPath !== undefined && (
                    <span className="tag-committed">в картотеке</span>
                  )}
                  <span>обновлена {dateFormat.format(new Date(notebook.updatedAt))}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
