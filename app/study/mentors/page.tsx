import { ACTIVE_COMPASS_IDS, COMPASSES, isCompassActive } from "../../../lib/compasses";
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

  // Задействованные — первыми (в порядке реестра), затем будущие.
  const ordered = [
    ...COMPASSES.filter((compass) => isCompassActive(compass.id)),
    ...COMPASSES.filter((compass) => !isCompassActive(compass.id)),
  ];

  return (
    <>
      <h1>Карта наставников</h1>
      <p className="empty-note">
        В этой версии в деле {ACTIVE_COMPASS_IDS.length} наставника из {COMPASSES.length}.
        Компас заполняется с каждым завершённым проходом; остальные наставники ждут своих
        версий Мастерской.
      </p>

      <div className="mentor-grid">
        {ordered.map((compass) => {
          const active = isCompassActive(compass.id);
          const entry = engagement.get(compass.id);
          const filled = Math.min(entry?.count ?? 0, FILL_SLOTS);

          return (
            <div key={compass.id} className="mentor-card" data-active={active}>
              <h2>{compass.title}</h2>
              <p className="mentor-genre">{compass.nativeGenre}</p>

              {active ? (
                <>
                  <div className="mentor-fill" aria-label={`проходов: ${entry?.count ?? 0}`}>
                    {Array.from({ length: FILL_SLOTS }, (_, i) => (
                      <span key={i} className="mentor-dot" data-filled={i < filled} />
                    ))}
                  </div>
                  {entry === undefined ? (
                    <p className="mentor-note">
                      Ещё не открыт — позовите на проход из тетради.
                    </p>
                  ) : (
                    <p className="mentor-note">
                      Проходов: {entry.count}
                      {entry.lastAt !== undefined &&
                        ` · последний — ${dateFormat.format(new Date(entry.lastAt))}`}
                    </p>
                  )}
                </>
              ) : (
                <p className="mentor-note mentor-soon">В следующих версиях</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
