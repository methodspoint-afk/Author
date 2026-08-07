import Link from "next/link";
import GlossaryTerm from "../../components/GlossaryTerm";
import ProgressDots from "../../components/ProgressDots";
import { ACTIVE_COMPASS_IDS, COMPASSES } from "../../lib/compasses";
import { getAllPasses, getNotebooks } from "../../lib/data";
import { AUTHOR_VOICE_MIN_TEXTS, fullyCycledNotebooks } from "../../lib/voice";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const [notebooks, passes] = await Promise.all([getNotebooks(), getAllPasses()]);

  const committed = notebooks.filter((notebook) => notebook.committedPath !== undefined).length;
  const inquiries = passes.filter((pass) => pass.type === "inquiry");
  const waitingInquiries = inquiries.filter((pass) => pass.status !== "completed").length;
  const shelved = notebooks.filter((notebook) => notebook.shelvedAt !== undefined).length;
  // Тихий прогресс «Голоса автора»: сколько текстов прошли полный круг (из ≥3).
  const voiceCycled = fullyCycledNotebooks(notebooks, passes).length;

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
            Портрет вашего стиля поверх текстов: «Голос автора» — что уже звучит уверенно, а что
            ещё колеблется.
          </p>
          {voiceCycled >= 1 && (
            <p className="progress-line">
              <ProgressDots
                filled={Math.min(voiceCycled, AUTHOR_VOICE_MIN_TEXTS)}
                total={AUTHOR_VOICE_MIN_TEXTS}
                label={`полный круг прошли: ${voiceCycled} из ${AUTHOR_VOICE_MIN_TEXTS}`}
              />
              <span>{Math.min(voiceCycled, AUTHOR_VOICE_MIN_TEXTS)} из {AUTHOR_VOICE_MIN_TEXTS}</span>
            </p>
          )}
        </Link>
        <Link href="/study/mentors" className="study-card">
          <h2><GlossaryTerm term="Наставник">Карта наставников</GlossaryTerm></h2>
          <p>
            В деле {ACTIVE_COMPASS_IDS.length} из {COMPASSES.length} наставников. Карта тех, чьими
            глазами можно посмотреть на текст под линзой «Сверить».
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
