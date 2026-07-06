// Реестр компасов-наставников — единственный источник правды (ТЗ §4).
// Знание каждого компаса живёт в markdown-файле по knowledgePath;
// оси (CompassAxis[]) будут добавлены в реестр на шаге 6 дорожной карты.

export interface CompassMeta {
  id: string;
  title: string;
  knowledgePath: string;
  nativeGenre: string;
}

export const COMPASSES: CompassMeta[] = [
  {
    id: "chekhov",
    title: "Чехов — сдержанность, подтекст",
    knowledgePath: "learning/compasses/CHEKHOV-COMPASS.md",
    nativeGenre: "короткая проза",
  },
  {
    id: "hemingway",
    title: "Хемингуэй — айсберг",
    knowledgePath: "learning/compasses/HEMINGWAY-COMPASS.md",
    nativeGenre: "короткая проза",
  },
  {
    id: "marquez",
    title: "Маркес — бесстрастность к невозможному",
    knowledgePath: "learning/compasses/MARQUEZ-COMPASS.md",
    nativeGenre: "магический реализм",
  },
  {
    id: "zinsser",
    title: "Зинсер — ясность в нон-фикшне",
    knowledgePath: "learning/compasses/ZINSSER-COMPASS.md",
    nativeGenre: "нон-фикшн",
  },
  {
    id: "pratchett",
    title: "Пратчетт — овеществлённая метафора",
    knowledgePath: "learning/compasses/PRATCHETT-COMPASS.md",
    nativeGenre: "юмористическое фэнтези",
  },
  {
    id: "tolstaya",
    title: "Толстая — избыточная образность",
    knowledgePath: "learning/compasses/TOLSTAYA-COMPASS.md",
    nativeGenre: "короткая проза",
  },
  {
    id: "christie",
    title: "Агата Кристи — честный обман",
    knowledgePath: "learning/compasses/CHRISTIE-COMPASS.md",
    nativeGenre: "детектив",
  },
  {
    id: "leguin",
    title: "Ле Гуин — мифологическая сдержанность",
    knowledgePath: "learning/compasses/LEGUIN-COMPASS.md",
    nativeGenre: "фэнтези и фантастика",
  },
  {
    id: "mcphee",
    title: "Макфи — архитектура документального текста",
    knowledgePath: "learning/compasses/MCPHEE-COMPASS.md",
    nativeGenre: "документальная проза",
  },
  {
    id: "munro",
    title: "Манро — переосмысленное время",
    knowledgePath: "learning/compasses/MUNRO-COMPASS.md",
    nativeGenre: "короткая проза",
  },
  {
    id: "dovlatov",
    title: "Довлатов — предельная сжатость",
    knowledgePath: "learning/compasses/DOVLATOV-COMPASS.md",
    nativeGenre: "автобиографическая короткая проза",
  },
  {
    id: "collins",
    title: "Уилки Коллинз — скрытая правда через свидетельства",
    knowledgePath: "learning/compasses/COLLINS-COMPASS.md",
    nativeGenre: "детектив",
  },
  {
    id: "sorkin",
    title: "Соркин — намерение и препятствие",
    knowledgePath: "learning/compasses/SORKIN-COMPASS.md",
    nativeGenre: "драма и сценарий",
  },
];

export function getCompass(id: string): CompassMeta | undefined {
  return COMPASSES.find((compass) => compass.id === id);
}
