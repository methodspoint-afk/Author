import { notFound } from "next/navigation";
import Link from "next/link";
import FragmentPane from "../../../components/FragmentPane";
import NewPassForm from "../../../components/NewPassForm";
import NotebookControls from "../../../components/NotebookControls";
import PassCard from "../../../components/PassCard";
import SecretaryNote from "../../../components/SecretaryNote";
import ToolbarActionButton from "../../../components/ToolbarActionButton";
import { ACTIVE_COMPASSES } from "../../../lib/compasses";
import { getAllPasses, getNotebook, getNotebookPasses, getNotebookVersions } from "../../../lib/data";
import { checkIterationLaw, isLensPass } from "../../../lib/iteration";
import { daysSince } from "../../../lib/rituals";
import { RETURN_OPENERS, pickLine } from "../../../lib/secretaryLines";
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

  // Приветствие при возврате к давней тетради: где остановились и что дальше.
  const away = daysSince(notebook.updatedAt);
  const lastVersion = versions[versions.length - 1];
  const nextStep = law.allowed
    ? "Сейчас можно взять новую линзу — или забрать текст, когда он готов."
    : law.reason ?? "";

  return (
    <>
      <h1>{notebook.title}</h1>
      {away >= 3 && (
        <SecretaryNote id={`return-${notebook.id}-${notebook.updatedAt}`}>
          {pickLine(RETURN_OPENERS, `${notebook.id}-${notebook.updatedAt}`).replace(
            "{days}",
            `${away} ${plural(away, "день", "дня", "дней")}`,
          )}{" "}
          {lastVersion?.note !== undefined && `В прошлый раз вы отметили: «${lastVersion.note}». `}
          {nextStep}
        </SecretaryNote>
      )}
      {/* Главное — линзы (в тетради справа). Вспомогательное убрано под «Ещё…»,
          чтобы не отвлекать: картотека, полка, экспорт, переименование, удаление. */}
      <details className="more-menu">
        <summary>Ещё…</summary>
        <div className="more-menu-body">
          <div className="notebook-toolbar">
            <ToolbarActionButton
              action={commitToCorpus}
              notebookId={notebook.id}
              label={notebook.committedPath !== undefined ? "Обновить в картотеке" : "Внести в картотеку"}
              pendingLabel={notebook.committedPath !== undefined ? "Обновляю…" : "Вношу…"}
            />
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
              <span className="tag-committed">в картотеке</span>
            )}
          </div>
          <div className="export-bar">
            <span className="export-label">Забрать текст:</span>
            <a className="export-link" href={`/desk/${notebook.id}/export?format=rtf`}>
              Word
            </a>
            <Link className="export-link" href={`/desk/${notebook.id}/print`}>
              PDF
            </Link>
            <a className="export-link" href={`/desk/${notebook.id}/export?format=txt`}>
              TXT
            </a>
          </div>
          <NotebookControls notebookId={notebook.id} title={notebook.title} />
        </div>
      </details>
      <div className="notebook-page">
        <FragmentPane
          key={versions.length}
          notebookId={notebook.id}
          versions={versions.map((version) => ({
            id: version.id,
            text: version.text,
            createdAt: version.createdAt,
            ...(version.note !== undefined && { note: version.note }),
          }))}
        />
        <aside>
          <NewPassForm
            notebookId={notebook.id}
            compasses={ACTIVE_COMPASSES.map(({ id, title, nativeGenre, axes }) => ({
              id,
              title,
              nativeGenre,
              axes,
            }))}
            allowed={law.allowed}
            {...(law.reason !== undefined && { reason: law.reason })}
          />
          {completedLensCount >= 2 && (
            <div className="digest-offer">
              <ToolbarActionButton
                action={createDigest}
                notebookId={notebook.id}
                label="Сводка секретаря"
                pendingLabel="Собираю сводку…"
              />
              <p className="pane-hint">Свести все разборы этой тетради в один общий итог.</p>
            </div>
          )}
          <h2>Разборы</h2>
          {passes.length === 0 ? (
            <p className="empty-note">Разборов пока нет — выберите линзу выше.</p>
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

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
