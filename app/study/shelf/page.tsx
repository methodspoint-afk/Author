import Link from "next/link";
import { getNotebooks } from "../../../lib/data";
import { reopenNotebook } from "../../desk/actions";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const notebooks = await getNotebooks();
  const shelved = notebooks
    .filter((notebook) => notebook.shelvedAt !== undefined)
    .sort((a, b) => (b.shelvedAt ?? "").localeCompare(a.shelvedAt ?? ""));

  return (
    <>
      <h1>Полка</h1>
      {shelved.length === 0 ? (
        <p className="empty-note">Полка пуста — всё в работе.</p>
      ) : (
        <ul className="notebook-list">
          {shelved.map((notebook) => (
            <li key={notebook.id} className="notebook-card">
              <Link href={`/desk/${notebook.id}`}>{notebook.title}</Link>
              <div className="notebook-meta">
                <span>
                  {notebook.versionIds.length} версий · {notebook.passIds.length} проходов
                </span>
                {notebook.committedPath !== undefined && (
                  <span className="tag-committed">в картотеке</span>
                )}
                <form action={reopenNotebook}>
                  <input type="hidden" name="notebookId" value={notebook.id} />
                  <button type="submit" className="toolbar-button">
                    Вернуть на стол
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
