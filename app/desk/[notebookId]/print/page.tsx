import { notFound } from "next/navigation";
import Link from "next/link";
import { getNotebook, getNotebookVersions } from "../../../../lib/data";
import { buildManuscript } from "../../../../lib/export";
import PrintButton from "../../../../components/PrintButton";

export const dynamic = "force-dynamic";

// Печатный вид чистовика: только заголовок и текст. Кнопка «Сохранить как PDF»
// открывает печать браузера; при печати шапка/подвал и панель скрыты (print-CSS).
export default async function PrintPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;
  const notebook = await getNotebook(notebookId);
  if (notebook === undefined) notFound();

  const versions = await getNotebookVersions(notebook);
  const { title, body } = buildManuscript(notebook, versions);

  return (
    <div className="print-view">
      <div className="print-controls">
        <Link href={`/desk/${notebookId}`}>← В тетрадь</Link>
        <PrintButton />
      </div>
      <article className="manuscript">
        <h1>{title}</h1>
        {body.trim() === "" ? (
          <p className="empty-note">В тетради пока нет текста.</p>
        ) : (
          body
            .split(/\n{2,}/u)
            .map((para, index) => <p key={index}>{para}</p>)
        )}
      </article>
    </div>
  );
}
