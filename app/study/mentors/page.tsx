import Link from "next/link";
import { allMentorGrowth } from "../../../lib/axisDelta";
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

// Имя оси без ведущего номера («1. Деталь…» → «Деталь…»).
function axisName(label: string): string {
  return label.replace(/^\d+\.\s*/u, "");
}

// Русское склонение по числу: 1 сверка · 2 сверки · 5 сверок.
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export default async function MentorsPage() {
  const passes = await getAllPasses();
  const engagement = mentorEngagement(passes);

  const active = ACTIVE_COMPASSES;
  const upcoming = COMPASSES.filter((compass) => !isCompassActive(compass.id));

  // Рост голоса — из накопленных разборов по осям (Pass.axisResult), не из
  // рукописных таблиц. Задействованных наставников показываем первыми.
  const activeIds = new Set(active.map((compass) => compass.id));
  const growth = allMentorGrowth(passes).sort((a, b) => {
    const aActive = activeIds.has(a.compass.id) ? 0 : 1;
    const bActive = activeIds.has(b.compass.id) ? 0 : 1;
    return aActive - bActive;
  });

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

      {/* Как растёт голос — из накопленных разборов по осям. «Спрятанно, с
          базой»: под каждым наставником видно, на скольких сверках основано. */}
      {growth.length > 0 && (
        <section className="mentor-deltas">
          <h2>Как растёт ваш голос</h2>
          <p className="empty-note">
            По следам линзы «Сверить» видно, куда движется ваш голос: что уже окрепло и над
            чем стоит поработать. Копится от круга к кругу — чем больше сверок, тем вернее.
          </p>
          {growth.map(({ compass, passCount, notebookCount, strengthened, toWork }) => (
            <div key={compass.id} className="delta-summary">
              <h3>{compass.title}</h3>
              <p className="delta-base">
                Основано на {passCount} {plural(passCount, "сверке", "сверках", "сверках")} · по{" "}
                {notebookCount} {plural(notebookCount, "тексту", "текстам", "текстам")}
              </p>
              {strengthened.length > 0 && (
                <div className="delta-line delta-win">
                  <span className="delta-tag">Окрепло</span>
                  <ul>
                    {strengthened.map((axis) => (
                      <li key={axis.key}>
                        <strong>{axisName(axis.label)}</strong>
                        {axis.grew && <span className="delta-grew"> — выросло из зоны роста</span>}
                        {`. ${axis.seen}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {toWork.length > 0 && (
                <div className="delta-line delta-work">
                  <span className="delta-tag">Над чем поработать</span>
                  <ul>
                    {toWork.map((axis) => (
                      <li key={axis.key}>
                        <strong>{axisName(axis.label)}</strong>
                        {`. ${axis.seen}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {strengthened.length === 0 && toWork.length === 0 && (
                <p className="empty-note">Пока всё в норме — наблюдения копятся.</p>
              )}
            </div>
          ))}
        </section>
      )}

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
