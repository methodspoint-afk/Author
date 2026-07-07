import Link from "next/link";
import InquiryForm from "../../../components/InquiryForm";
import PassCard from "../../../components/PassCard";
import { getAllPasses, getNotebooks } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const [passes, notebooks] = await Promise.all([getAllPasses(), getNotebooks()]);
  const notebookById = new Map(notebooks.map((notebook) => [notebook.id, notebook]));

  const inquiries = passes.filter((pass) => pass.type === "inquiry");
  const active = inquiries.filter((pass) => pass.status !== "completed");
  const completed = inquiries.filter((pass) => pass.status === "completed");

  return (
    <>
      <h1>Изыскания</h1>
      <div className="lens-block">
        <h2>Новое изыскание</h2>
        <InquiryForm />
      </div>

      {active.length > 0 && (
        <>
          <h2>В работе</h2>
          <div className="pass-list inquiries-list">
            {active.map((pass) => (
              <InquiryEntry key={pass.id} pass={pass} notebookById={notebookById} open />
            ))}
          </div>
        </>
      )}

      <h2>Полученные справки</h2>
      {completed.length === 0 ? (
        <p className="empty-note">Справок пока нет.</p>
      ) : (
        <div className="pass-list inquiries-list">
          {completed.map((pass) => (
            <InquiryEntry key={pass.id} pass={pass} notebookById={notebookById} open={false} />
          ))}
        </div>
      )}
    </>
  );
}

function InquiryEntry({
  pass,
  notebookById,
  open,
}: {
  pass: Parameters<typeof PassCard>[0]["pass"];
  notebookById: Map<string, { title: string; versionIds: string[] }>;
  open: boolean;
}) {
  const notebook = notebookById.get(pass.notebookId);
  const isFromNotebook = notebook !== undefined && notebook.versionIds.length > 0;
  return (
    <div>
      {isFromNotebook && (
        <p className="inquiry-source">
          по следам работы в тетради{" "}
          <Link href={`/desk/${pass.notebookId}`}>«{notebook.title}»</Link>
        </p>
      )}
      <PassCard pass={pass} defaultOpen={open} />
    </div>
  );
}
