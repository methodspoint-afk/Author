import { notFound } from "next/navigation";
import FragmentPane from "../../../components/FragmentPane";
import NewPassForm from "../../../components/NewPassForm";
import PassCard from "../../../components/PassCard";
import { COMPASSES } from "../../../lib/compasses";
import { getAllPasses, getNotebook, getNotebookPasses, getNotebookVersions } from "../../../lib/data";
import { checkIterationLaw, isLensPass } from "../../../lib/iteration";
import { readCollection } from "../../../lib/storage";
import type { FragmentVersion } from "../../../lib/types";
import { commitToCorpus, createDigest, reopenNotebook, shelveNotebook } from "../actions";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;
  const notebook = await getNotebook(notebookId);
  if (notebook === undefined) notFound();

  const [versions, passes, allPasses, allVersions] = await Promise.all([
    getNotebookVersions(notebook),
    getNotebookPasses(notebook),
    getAllPasses(),
    readCollection<FragmentVersion>("fragment-versions.json"),
  ]);

  const law = checkIterationLaw(notebook, allPasses, allVersions);
  const completedLensCount = passes.filter(
    (pass) => isLensPass(pass.type) && pass.status === "completed",
  ).length;

  return (
    <>
      <h1>{notebook.title}</h1>
      <div className="notebook-toolbar">
        {completedLensCount >= 2 && (
          <form action={createDigest}>
            <input type="hidden" name="notebookId" value={notebook.id} />
            <button type="submit" className="toolbar-button">
              Сводка секретаря
            </button>
          </form>
        )}
        <form action={commitToCorpus}>
          <input type="hidden" name="notebookId" value={notebook.id} />
          <button type="submit" className="toolbar-button">
            {notebook.committedPath !== undefined ? "Обновить в картотеке" : "Внести в картотеку"}
          </button>
        </form>
        {notebook.shelvedAt === undefined ? (
          <form action={shelveNotebook}>
            <input type="hidden" name="notebookId" value={notebook.id} />
            <button type="submit" className="toolbar-button">
              На полку
            </button>
          </form>
        ) : (
          <form action={reopenNotebook}>
            <input type="hidden" name="notebookId" value={notebook.id} />
            <button type="submit" className="toolbar-button">
              Вернуть на стол
            </button>
          </form>
        )}
        {notebook.committedPath !== undefined && (
          <span className="tag-committed">в картотеке: {notebook.committedPath}</span>
        )}
      </div>
      <div className="notebook-page">
        <FragmentPane
          key={versions.length}
          notebookId={notebook.id}
          versions={versions.map((version) => ({
            id: version.id,
            text: version.text,
            ...(version.note !== undefined && { note: version.note }),
          }))}
        />
        <aside>
          <NewPassForm
            notebookId={notebook.id}
            compasses={COMPASSES.map(({ id, title, nativeGenre }) => ({ id, title, nativeGenre }))}
            allowed={law.allowed}
            {...(law.reason !== undefined && { reason: law.reason })}
          />
          <h2>Проходы</h2>
          {passes.length === 0 ? (
            <p className="empty-note">Проходов пока не было.</p>
          ) : (
            <div className="pass-list">
              {passes.map((pass, index) => (
                <PassCard key={pass.id} pass={pass} defaultOpen={index === passes.length - 1} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
