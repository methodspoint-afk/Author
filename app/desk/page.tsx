import Link from "next/link";
import { getAllPasses, getNotebooks } from "../../lib/data";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default async function DeskPage() {
  const [notebooks, passes] = await Promise.all([getNotebooks(), getAllPasses()]);

  const active = notebooks
    .filter((notebook) => notebook.shelvedAt === undefined)
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
      {active.length === 0 ? (
        <p className="empty-note">На столе пусто. Все тетради — на полке.</p>
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
                    {plural(notebook.passIds.length, "проход", "прохода", "проходов")}
                  </span>
                  {waiting > 0 && (
                    <span className="tag-wait">
                      {waiting === 1 ? "депеша ждёт ответа" : `депеш ждут ответа: ${waiting}`}
                    </span>
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
