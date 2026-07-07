import Link from "next/link";
import NewNotebookForm from "../../components/NewNotebookForm";
import { getAllPasses, getNotebooks } from "../../lib/data";
import { auditReminder, readLastAuditDate } from "../../lib/rituals";
import { readCollection } from "../../lib/storage";
import type { FragmentVersion, Notebook, Pass } from "../../lib/types";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// Статус тетради для рамки и карточек (ТЗ «Тетрадь» v1 §4).
// Полная машина статусов придёт с маршрутом Прописей (шаг 4);
// здесь — честная проекция текущих данных на пять состояний.
function notebookStatus(notebook: Notebook, passes: Pass[]): { st: string; label: string } {
  if (notebook.shelvedAt !== undefined) return { st: "done", label: "завершено" };
  const own = passes.filter((pass) => pass.notebookId === notebook.id);
  if (own.some((pass) => pass.status === "dispatched")) {
    return { st: "mentor", label: "у наставника" };
  }
  if (own.some((pass) => pass.status === "completed")) {
    return { st: "edit", label: "правка" };
  }
  return { st: "draft", label: "черновик" };
}

export default async function DeskPage() {
  const [notebooks, passes, versions, lastAuditDate] = await Promise.all([
    getNotebooks(),
    getAllPasses(),
    readCollection<FragmentVersion>("fragment-versions.json"),
    readLastAuditDate(),
  ]);
  const reminder = auditReminder(versions, lastAuditDate);

  const passById = new Map(passes.map((pass) => [pass.id, pass]));
  // Тетради, состоящие из одних изысканий, живут в Кабинете, а не на Столе.
  const isInquiryOnly = (notebook: Notebook): boolean =>
    notebook.versionIds.length === 0 &&
    notebook.passIds.length > 0 &&
    notebook.passIds.every((id) => passById.get(id)?.type === "inquiry");

  const active = notebooks
    .filter((notebook) => notebook.shelvedAt === undefined && !isInquiryOnly(notebook))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const shown = active.slice(0, 7);
  const rest = active.length - shown.length;

  return (
    <>
      <header className="masthead">
        <h1>Стол</h1>
        <p className="motto">
          У каждого писателя должен быть большой стол и вместительный кабинет — это их
          электронная версия. Каждый большой писатель начинал с маленькой тетради:
          пишите так, как хотите и умеете, — начать можно прямо сейчас.
        </p>
        <div className="primers">
          <details className="primer">
            <summary>
              <b>Прописи</b>
              <span>три этапа, три наставника, один аудит</span>
            </summary>
            <p>
              Базовый маршрут: Не высушить → Сверить → Усилить, после — аудит круга,
              изыскание и финальная правка. Рекомендуем начинать с него.
            </p>
          </details>
          <details className="primer">
            <summary>
              <b>Наставники</b>
              <span>оси больших мастеров</span>
            </summary>
            <p>
              Чехов — чистота стиля, Соркин — драматургия, Зинссер — ясная проза.
              Диагнозы идут из ценностей мастера, а последнее слово — за вами.
            </p>
          </details>
          <details className="primer">
            <summary>
              <b>Аудит</b>
              <span>что изменилось за три итерации</span>
            </summary>
            <p>
              Разбор ваших решений за круг: что менялось, что выросло и почему.
              Финальный аудит сравнивает первую и последнюю версии.
            </p>
          </details>
          <details className="primer">
            <summary>
              <b>Голос</b>
              <span>портрет вашего стиля</span>
            </summary>
            <p>
              После трёх кругов можно заказать аудит голоса — большой разбор стиля.
              Путь к нему виден в <Link href="/study/voice">Кабинете</Link>.
            </p>
          </details>
        </div>
      </header>

      {reminder.due && (
        <p className="secretary-note">
          Секретарь: с последнего аудита накопилось {reminder.count}{" "}
          {plural(reminder.count, "зафиксированная правка", "зафиксированные правки", "зафиксированных правок")}{" "}
          — пора сверить <Link href="/study/voice">портрет голоса</Link>.
        </p>
      )}

      <NewNotebookForm />

      <h2 className="strip-title">На столе</h2>
      {shown.length === 0 ? (
        <p className="empty-note">На столе пусто. Перо скучает — начните с окна выше.</p>
      ) : (
        <div className="strip">
          {shown.map((notebook) => {
            const { st, label } = notebookStatus(notebook, passes);
            return (
              <div key={notebook.id} className="strip-card" data-st={st}>
                <Link href={`/desk/${notebook.id}`}>{notebook.title}</Link>
                <span className="strip-meta">
                  {label} · {notebook.versionIds.length}{" "}
                  {plural(notebook.versionIds.length, "версия", "версии", "версий")} ·{" "}
                  {dateFormat.format(new Date(notebook.updatedAt))}
                </span>
              </div>
            );
          })}
          <Link href="/study/card-index" className="strip-more">
            {rest > 0 ? `ещё ${rest} → картотека` : "картотека →"}
          </Link>
        </div>
      )}

      <section>
        <h2 className="strip-title">Кабинет</h2>
        <Link href="/study" className="cab-main">
          Пройти в Кабинет
        </Link>
        <div className="cab-row">
          <Link href="/study/card-index">Картотека</Link>
          <Link href="/study/shelf">Полка</Link>
          <Link href="/study/inquiries">Изыскания</Link>
          <Link href="/study/voice">Голос</Link>
        </div>
      </section>
    </>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
