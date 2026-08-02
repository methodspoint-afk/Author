import { notFound } from "next/navigation";
import Link from "next/link";
import { getNotebook, getNotebookPasses } from "../../../../../../lib/data";
import { buildReviewManuscript } from "../../../../../../lib/export";
import PrintButton from "../../../../../../components/PrintButton";

export const dynamic = "force-dynamic";

// Печатный вид полученного разбора (для «Сохранить как PDF»). Структуру разбора
// (Главное, зоны роста, что уже работает, упражнение) сохраняем переносами строк.
export default async function ReviewPrintPage({
  params,
}: {
  params: Promise<{ notebookId: string; passId: string }>;
}) {
  const { notebookId, passId } = await params;
  const notebook = await getNotebook(notebookId);
  if (notebook === undefined) notFound();

  const passes = await getNotebookPasses(notebook);
  const pass = passes.find((entry) => entry.id === passId);
  if (pass === undefined) notFound();

  const { title, body } = buildReviewManuscript(pass, notebook.title);

  return (
    <div className="print-view">
      <div className="print-controls">
        <Link href={`/desk/${notebookId}`}>← В тетрадь</Link>
        <PrintButton />
      </div>
      <article className="manuscript">
        <h1>{title}</h1>
        {body.trim() === "" ? (
          <p className="empty-note">Разбор пуст.</p>
        ) : (
          <div className="review-print-body">{body}</div>
        )}
      </article>
    </div>
  );
}
