import Link from "next/link";
import { ACTIVE_COMPASSES, COMPASSES, isCompassActive } from "../../../lib/compasses";
import { getAllPasses } from "../../../lib/data";
import { mentorEngagement } from "../../../lib/mentors";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// Полнота заполнения компаса: семь делений — по числу завершённых проходов.
const FILL_SLOTS = 7;

export default async function MentorsPage() {
  const passes = await getAllPasses();
  const engagement = mentorEngagement(passes);

  const active = ACTIVE_COMPASSES;
  const upcoming = COMPASSES.filter((compass) => !isCompassActive(compass.id));

  return (
    <>
      <p className="back-link">
        <Link href="/study">← Кабинет</Link>
      </p>
      <h1>Наставники</h1>
      <p className="empty-note">
        В этой версии в деле {active.length} наставника из {COMPASSES.length}. Кружки
        наставника заполняются с каждым завершённым разбором «Сверить».
      </p>

      {/* Задействованные — крупным первым рядом. */}
      <div className="mentor-grid">
        {active.map((compass) => {
          const entry = engagement.get(compass.id);
          const filled = Math.min(entry?.count ?? 0, FILL_SLOTS);

          return (
            <div key={compass.id} className="mentor-card" data-active="true">
              <h2>{compass.title}</h2>
              <p className="mentor-genre">{compass.nativeGenre}</p>
              <div className="mentor-fill" aria-label={`проходов: ${entry?.count ?? 0}`}>
                {Array.from({ length: FILL_SLOTS }, (_, i) => (
                  <span key={i} className="mentor-dot" data-filled={i < filled} />
                ))}
              </div>
              {entry === undefined ? (
                <p className="mentor-note">Ещё не открыт — позовите на проход из тетради.</p>
              ) : (
                <p className="mentor-note">
                  Проходов: {entry.count}
                  {entry.lastAt !== undefined &&
                    ` · последний — ${dateFormat.format(new Date(entry.lastAt))}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* «Как растёт голос» убрана — движение голоса теперь в «Разборе роста»
          (один текст) и «Голосе автора» (по корпусу). См. docs/ДВА-ПРОЦЕССА.md. */}

      {/* Будущие наставники — компактным подвалом, без метки на каждой карточке. */}
      {upcoming.length > 0 && (
        <section className="mentors-upcoming">
          <h2>Наставники: встретиться в следующих версиях</h2>
          <div className="mentor-mini-grid">
            {upcoming.map((compass) => (
              <div key={compass.id} className="mentor-mini">
                {compass.title}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
