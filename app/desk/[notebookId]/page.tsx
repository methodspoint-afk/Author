import { notFound } from "next/navigation";
import FragmentPane from "../../../components/FragmentPane";
import NewPassForm from "../../../components/NewPassForm";
import PassActions from "../../../components/PassActions";
import { COMPASSES } from "../../../lib/compasses";
import { getAllPasses, getNotebook, getNotebookPasses, getNotebookVersions } from "../../../lib/data";
import { checkIterationLaw } from "../../../lib/iteration";
import { COMPASS_TITLES, PASS_STATUS_LABELS, PASS_TYPE_LABELS } from "../../../lib/passMeta";
import { readCollection } from "../../../lib/storage";
import type { FragmentVersion, Pass } from "../../../lib/types";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

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

  return (
    <>
      <h1>{notebook.title}</h1>
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

function PassCard({ pass, defaultOpen }: { pass: Pass; defaultOpen: boolean }) {
  const title =
    pass.type === "mentor-compass" && pass.compassId !== undefined
      ? `Компас: ${COMPASS_TITLES[pass.compassId] ?? pass.compassId}`
      : PASS_TYPE_LABELS[pass.type];

  return (
    <details className="pass-card" open={defaultOpen}>
      <summary>
        {title}{" "}
        <span className="pass-status" data-status={pass.status}>
          · {PASS_STATUS_LABELS[pass.status]}
          {pass.completedAt !== undefined &&
            ` · ${dateTimeFormat.format(new Date(pass.completedAt))}`}
        </span>
      </summary>
      <div className="pass-body">
        {pass.intention !== undefined && <p>Намерение: {pass.intention}</p>}
        {pass.inquiryTopic !== undefined && <p>Тема изыскания: {pass.inquiryTopic}</p>}
        <details>
          <summary>Депеша (промпт)</summary>
          <pre>{pass.promptText}</pre>
        </details>
        {pass.parsedResult !== undefined && (
          <details open={pass.status === "completed"}>
            <summary>Диагноз</summary>
            <ParsedResult result={pass.parsedResult} />
          </details>
        )}
        {pass.rawResponse !== undefined && (
          <details>
            <summary>Ответ целиком</summary>
            <pre>{pass.rawResponse}</pre>
          </details>
        )}
        <PassActions
          passId={pass.id}
          status={pass.status}
          promptText={pass.promptText}
          {...(pass.lastParseFailed !== undefined && { lastParseFailed: pass.lastParseFailed })}
        />
      </div>
    </details>
  );
}

function ParsedResult({ result }: { result: Record<string, string> | Record<string, string>[] }) {
  const blocks = Array.isArray(result) ? result : [result];
  return (
    <>
      {blocks.map((block, blockIndex) => (
        <dl key={blockIndex} className="pass-result">
          {Object.entries(block).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </>
  );
}
