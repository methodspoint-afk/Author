import { getNotebook, getNotebookVersions } from "../../../../lib/data";
import { buildManuscript, safeFileName, toPlainText, toRtf } from "../../../../lib/export";

// Скачивание чистовика тетради: /desk/<id>/export?format=rtf|txt.
// RTF открывается в Word (кириллица цела), txt — простой текст. PDF делается
// печатью браузера на отдельной странице /print — здесь его нет.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> },
): Promise<Response> {
  const { notebookId } = await params;
  const notebook = await getNotebook(notebookId);
  if (notebook === undefined) return new Response("Тетрадь не найдена", { status: 404 });

  const versions = await getNotebookVersions(notebook);
  const manuscript = buildManuscript(notebook, versions);

  const format = new URL(request.url).searchParams.get("format") === "txt" ? "txt" : "rtf";
  const isRtf = format === "rtf";

  const body = isRtf ? toRtf(manuscript) : toPlainText(manuscript);
  const fileName = safeFileName(manuscript.title, format);
  const contentType = isRtf ? "application/rtf" : "text/plain";

  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="export.${format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
