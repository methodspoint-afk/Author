import Link from "next/link";
import { getNotebooks } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function CardIndexPage() {
  const notebooks = await getNotebooks();
  const committed = notebooks
    .filter((notebook) => notebook.committedPath !== undefined)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <h1>Картотека</h1>
      {committed.length === 0 ? (
        <p className="empty-note">
          В картотеке пусто. Внести тетрадь можно со страницы тетради — кнопкой «Внести в
          картотеку».
        </p>
      ) : (
        <ul className="notebook-list">
          {committed.map((notebook) => (
            <li key={notebook.id} className="notebook-card">
              <Link href={`/desk/${notebook.id}`}>{notebook.title}</Link>
              <div className="notebook-meta">
                <span>{notebook.committedPath}</span>
                <span>
                  {notebook.versionIds.length} версий · {notebook.passIds.length} проходов
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
