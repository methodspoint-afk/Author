import Link from "next/link";
import GlossaryTerm from "../../components/GlossaryTerm";
import { ACTIVE_COMPASS_IDS, COMPASSES } from "../../lib/compasses";
import { getAllPasses, getNotebooks } from "../../lib/data";
import { readDeltaTables } from "../../lib/deltas";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const [notebooks, passes, deltas] = await Promise.all([
    getNotebooks(),
    getAllPasses(),
    readDeltaTables(),
  ]);

  const committed = notebooks.filter((notebook) => notebook.committedPath !== undefined).length;
  const inquiries = passes.filter((pass) => pass.type === "inquiry");
  const waitingInquiries = inquiries.filter((pass) => pass.status !== "completed").length;
  const shelved = notebooks.filter((notebook) => notebook.shelvedAt !== undefined).length;

  return (
    <>
      <h1>Кабинет</h1>
      <div className="study-grid">
        <Link href="/study/card-index" className="study-card">
          <h2><GlossaryTerm term="Картотека">Картотека</GlossaryTerm></h2>
          <p>
            Внесённых тетрадей: {committed}. Корпус — материал для аудита и голоса.
          </p>
        </Link>
        <Link href="/study/inquiries" className="study-card">
          <h2><GlossaryTerm term="Изыскание">Изыскания</GlossaryTerm></h2>
          <p>
            Справок: {inquiries.length}
            {waitingInquiries > 0 && ` (в работе: ${waitingInquiries})`}. Секретарь наводит справки
            по запросу и по следам разборов.
          </p>
        </Link>
        <Link href="/study/voice" className="study-card">
          <h2><GlossaryTerm term="Голос">Голос</GlossaryTerm></h2>
          <p>
            Портрет вашего стиля: сверка голоса и подтверждённые механики.
          </p>
        </Link>
        <Link href="/study/mentors" className="study-card">
          <h2><GlossaryTerm term="Наставник">Карта наставников</GlossaryTerm></h2>
          <p>
            В деле {ACTIVE_COMPASS_IDS.length} из {COMPASSES.length} наставников; замеров голоса:{" "}
            {deltas.length}. Как растёт голос — по следам сверок.
          </p>
        </Link>
        <Link href="/study/shelf" className="study-card">
          <h2><GlossaryTerm term="Полка">Полка</GlossaryTerm></h2>
          <p>Тетрадей на полке: {shelved}. Завершённое — не обязательно опубликованное.</p>
        </Link>
      </div>
    </>
  );
}
