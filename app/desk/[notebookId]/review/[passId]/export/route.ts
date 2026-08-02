import { getNotebook, getNotebookPasses } from "../../../../../../lib/data";
import { buildReviewManuscript, safeFileName, toPlainText, toRtf } from "../../../../../../lib/export";

// Скачивание полученного разбора: /desk/<id>/review/<passId>/export?format=rtf|txt.
// RTF открывается в Word (кириллица цела), txt — простой текст. PDF — печатью
// браузера на .../review/<passId>/print.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string; passId: string }> },
): Promise<Response> {
  const { notebookId, passId } = await params;
  const notebook = await getNotebook(notebookId);
  if (notebook === undefined) return new Response("Тетрадь не найдена", { status: 404 });

  const passes = await getNotebookPasses(notebook);
  const pass = passes.find((entry) => entry.id === passId);
  if (pass === undefined) return new Response("Разбор не найден", { status: 404 });

  const manuscript = buildReviewManuscript(pass, notebook.title);

  const format = new URL(request.url).searchParams.get("format") === "txt" ? "txt" : "rtf";
  const isRtf = format === "rtf";

  const body = isRtf ? toRtf(manuscript) : toPlainText(manuscript);
  const fileName = safeFileName(manuscript.title, format);
  const contentType = isRtf ? "application/rtf" : "text/plain";

  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="review.${format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
