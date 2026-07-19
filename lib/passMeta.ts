import type { PassStatus, PassType } from "./types";

// Словарь системы (ТЗ §2): интерфейс говорит одним языком, без канцелярита.

export const PASS_TYPE_LABELS: Record<PassType, string> = {
  "dry-out": "Не высушивать",
  strengthen: "Усилить",
  "mentor-compass": "Проход по компасу",
  inquiry: "Изыскание",
  digest: "Сводка",
  audit: "Аудит корпуса",
  chekhov: "Чеховский разбор (v1)",
};

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  draft: "черновик",
  dispatched: "депеша отправлена",
  completed: "диагноз получен",
};

// Временная карта названий для отображения; полный реестр CompassMeta
// с осями появится в lib/compasses.ts на шаге 6 дорожной карты.
export const COMPASS_TITLES: Record<string, string> = {
  chekhov: "Чехов — сдержанность, подтекст",
  hemingway: "Хемингуэй — айсберг",
  marquez: "Маркес — бесстрастность к невозможному",
  zinsser: "Зинсер — ясность в нон-фикшне",
  pratchett: "Пратчетт — овеществлённая метафора",
  tolstaya: "Толстая — избыточная образность",
  christie: "Агата Кристи — честный обман",
  leguin: "Ле Гуин — мифологическая сдержанность",
  mcphee: "Макфи — архитектура документального текста",
  munro: "Манро — переосмысленное время",
  dovlatov: "Довлатов — предельная сжатость",
  collins: "Уилки Коллинз — скрытая правда через свидетельства",
  sorkin: "Соркин — намерение и препятствие",
};
