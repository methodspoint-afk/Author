// Реестр компасов-наставников — единственный источник правды (ТЗ §4).
// Знание каждого компаса живёт в markdown-файле по knowledgePath;
// оси дублируют заголовки «Семь осей» из этих файлов — для UI и промптов.

export interface CompassAxis {
  key: string; // "CHEKHOV_DETAIL"
  label: string; // "1. Деталь вместо описания"
}

export interface CompassMeta {
  id: string;
  title: string;
  knowledgePath: string;
  nativeGenre: string;
  axes: CompassAxis[];
}

export const COMPASSES: CompassMeta[] = [
  {
    id: "chekhov",
    title: "Чехов — сдержанность, подтекст",
    knowledgePath: "learning/compasses/CHEKHOV-COMPASS.md",
    nativeGenre: "короткая проза",
    axes: [
      { key: "CHEKHOV_DETAIL", label: "1. Деталь вместо описания" },
      { key: "CHEKHOV_COLD_SURFACE", label: "2. Бесстрастность поверхности / сострадание глубины" },
      { key: "CHEKHOV_NO_JUDGING", label: "3. Не судить героев" },
      { key: "CHEKHOV_CUT_OPENINGS", label: "4. Сокращение начал и концов" },
      { key: "CHEKHOV_GUN_FIRES", label: "5. Ружьё стреляет" },
      { key: "CHEKHOV_BREVITY", label: "6. Краткость как отбор" },
      { key: "CHEKHOV_MUNDANE_DRAMA", label: "7. Обыденность как носитель драмы" },
    ],
  },
  {
    id: "hemingway",
    title: "Хемингуэй — айсберг",
    knowledgePath: "learning/compasses/HEMINGWAY-COMPASS.md",
    nativeGenre: "короткая проза",
    axes: [
      { key: "HEMINGWAY_ICEBERG", label: "1. Айсберг — умолчание известного создаёт вес" },
      { key: "HEMINGWAY_DIALOG_AROUND", label: "2. Диалог обходит настоящий предмет стороной" },
      { key: "HEMINGWAY_SIMPLE_AND", label: "3. Простые предложения через «и», без подчинения" },
      { key: "HEMINGWAY_REPEAT_RHYTHM", label: "4. Намеренный повтор точного слова как ритм" },
      { key: "HEMINGWAY_ACTION_EMOTION", label: "5. Физическое действие как носитель эмоции" },
      { key: "HEMINGWAY_UNEXPLAINED_WOUND", label: "6. Рана, которая никогда не объясняется" },
      { key: "HEMINGWAY_FLAT_VIOLENCE", label: "7. Насилие — журналистской точностью, без оценок" },
    ],
  },
  {
    id: "marquez",
    title: "Маркес — бесстрастность к невозможному",
    knowledgePath: "learning/compasses/MARQUEZ-COMPASS.md",
    nativeGenre: "магический реализм",
    axes: [
      { key: "MARQUEZ_DEADPAN_IMPOSSIBLE", label: "1. Бесстрастное повествование о невозможном" },
      { key: "MARQUEZ_LITERAL_HYPERBOLE", label: "2. Гипербола как буквальный факт, не риторика" },
      { key: "MARQUEZ_CYCLIC_TIME", label: "3. Цикличное, родовое время вместо линейного" },
      { key: "MARQUEZ_TRAUMA_CODE", label: "4. Фантастическое как способ говорить о травме" },
      { key: "MARQUEZ_SENSORY_CASCADE", label: "5. Сенсорный избыток через каскад, а не отбор" },
      { key: "MARQUEZ_SOLITUDE_CORE", label: "6. Одиночество как структурный центр" },
      { key: "MARQUEZ_LONG_SENTENCE", label: "7. Длинное безостановочное предложение как ритм" },
    ],
  },
  {
    id: "zinsser",
    title: "Зинсер — ясность в нон-фикшне",
    knowledgePath: "learning/compasses/ZINSSER-COMPASS.md",
    nativeGenre: "нон-фикшн",
    axes: [
      { key: "ZINSSER_CLUTTER", label: "1. Мусор — главный враг, каждое слово платит за место" },
      { key: "ZINSSER_LIVE_VOICE", label: "2. Живой голос от первого лица" },
      { key: "ZINSSER_READER_DEAL", label: "3. «Сделка» с читателем в первых предложениях" },
      { key: "ZINSSER_UNITY", label: "4. Единство лица, времени и интонации" },
      { key: "ZINSSER_NO_CRUTCHES", label: "5. Долой слова-костыли" },
      { key: "ZINSSER_PRECISE_WORD", label: "6. Точное слово важнее эффектного" },
      { key: "ZINSSER_DETAIL_INTEREST", label: "7. Интерес передаётся деталью, а не заявлением" },
    ],
  },
  {
    id: "pratchett",
    title: "Пратчетт — овеществлённая метафора",
    knowledgePath: "learning/compasses/PRATCHETT-COMPASS.md",
    nativeGenre: "юмористическое фэнтези",
    axes: [
      { key: "PRATCHETT_LITERAL_IDIOM", label: "1. Овеществление клише и идиомы как двигатель мира" },
      { key: "PRATCHETT_SYSTEM_SATIRE", label: "2. Сатира встроена в устройство системы" },
      { key: "PRATCHETT_SERIOUS_ABSURD", label: "3. Абсурд, к которому персонажи относятся серьёзно" },
      { key: "PRATCHETT_LOW_WISDOM", label: "4. Афористичная мудрость из уст «низких» персонажей" },
      { key: "PRATCHETT_FARCE_TO_PAIN", label: "5. Поворот от фарса к боли без предупреждения" },
      { key: "PRATCHETT_MUNDANE_CONSEQUENCES", label: "6. Посылка доводится до бытовых последствий" },
      { key: "PRATCHETT_FOOTNOTE_VOICE", label: "7. Сноска как отдельный голос" },
    ],
  },
  {
    id: "tolstaya",
    title: "Толстая — избыточная образность",
    knowledgePath: "learning/compasses/TOLSTAYA-COMPASS.md",
    nativeGenre: "короткая проза",
    axes: [
      { key: "TOLSTAYA_METAPHOR_ENGINE", label: "1. Плотность метафоры как двигатель восприятия" },
      { key: "TOLSTAYA_IRONY_DISTANCE", label: "2. Ирония как дистанция над сентиментальным" },
      { key: "TOLSTAYA_SERIOUS_GROTESQUE", label: "3. Гротеск с полной реалистической серьёзностью" },
      { key: "TOLSTAYA_SOUND_LAYER", label: "4. Звук и ритм фразы как смысловой слой" },
      { key: "TOLSTAYA_TENDERNESS_BREAK", label: "5. Контраст иронии и внезапной нежности" },
      { key: "TOLSTAYA_SENSORY_CHARACTER", label: "6. Сенсорный избыток как раскрытие характера" },
      { key: "TOLSTAYA_LAYERED_TIME", label: "7. Время наслаивается, а не течёт линейно" },
    ],
  },
  {
    id: "christie",
    title: "Агата Кристи — честный обман",
    knowledgePath: "learning/compasses/CHRISTIE-COMPASS.md",
    nativeGenre: "детектив",
    axes: [
      { key: "CHRISTIE_ROLE_SHIELD", label: "1. Наименее подозреваемый защищён своей ролью" },
      { key: "CHRISTIE_CLOSED_SYSTEM", label: "2. Замкнутая система как архитектура мотива" },
      { key: "CHRISTIE_TYPE_CAMOUFLAGE", label: "3. Психологический тип как камуфляж" },
      { key: "CHRISTIE_REPLAY_FINALE", label: "4. Развязка как прогон улик назад" },
      { key: "CHRISTIE_FALSE_SOLUTION", label: "5. Ложное решение перед истинным" },
      { key: "CHRISTIE_MUNDANE_CLUE", label: "6. Бытовая мелочь как ключевая улика" },
      { key: "CHRISTIE_MATERIAL_MOTIVE", label: "7. Мотив всегда материален и картируем" },
    ],
  },
  {
    id: "leguin",
    title: "Ле Гуин — мифологическая сдержанность",
    knowledgePath: "learning/compasses/LEGUIN-COMPASS.md",
    nativeGenre: "фэнтези и фантастика",
    axes: [
      { key: "LEGUIN_CULTURE_STRUCTURE", label: "1. Культура как структура, определяющая действие" },
      { key: "LEGUIN_NO_PURE_EVIL", label: "2. Отказ от простого добра и зла" },
      { key: "LEGUIN_POWER_PRICE", label: "3. Сила имеет цену и требует равновесия" },
      { key: "LEGUIN_MYTHIC_RHYTHM", label: "4. Мифологический, экономный ритм фразы" },
      { key: "LEGUIN_INSIDE_OTHER", label: "5. Иное описано изнутри, без экзотизации" },
      { key: "LEGUIN_GROWTH_AS_LOSS", label: "6. Взросление как утрата и интеграция" },
      { key: "LEGUIN_COSTLY_UTOPIA", label: "7. Утопия с настоящей ценой" },
    ],
  },
  {
    id: "mcphee",
    title: "Макфи — архитектура документального текста",
    knowledgePath: "learning/compasses/MCPHEE-COMPASS.md",
    nativeGenre: "документальная проза",
    axes: [
      { key: "MCPHEE_DESIGNED_STRUCTURE", label: "1. Структура как спроектированная форма" },
      { key: "MCPHEE_VERIFIED_DETAIL", label: "2. Сцена из проверенной, конкретной детали" },
      { key: "MCPHEE_FRAME_OF_REFERENCE", label: "3. Точка отсчёта — мост к незнакомому" },
      { key: "MCPHEE_OMISSION", label: "4. Умолчание как структурная сила текста" },
      { key: "MCPHEE_TRANSPARENT_NARRATOR", label: "5. Рассказчик — прозрачный организатор" },
      { key: "MCPHEE_DENSITY_BREATH", label: "6. Чередование плотности ради дыхания читателя" },
      { key: "MCPHEE_OWN_WORDS", label: "7. Человек — через свои слова, не эпитеты автора" },
    ],
  },
  {
    id: "munro",
    title: "Манро — переосмысленное время",
    knowledgePath: "learning/compasses/MUNRO-COMPASS.md",
    nativeGenre: "короткая проза",
    axes: [
      { key: "MUNRO_TIME_COLLAPSE", label: "1. Схлопывание десятилетий внутри одной сцены" },
      { key: "MUNRO_HIDDEN_SUBJECT", label: "2. Настоящий предмет спрятан под бытовым" },
      { key: "MUNRO_NO_VERDICT", label: "3. Моральная неоднозначность без приговора" },
      { key: "MUNRO_CONCRETE_UNIVERSAL", label: "4. Бытовой мир как путь к универсальности" },
      { key: "MUNRO_RETROSPECT_NARRATOR", label: "5. Рассказчик задним числом" },
      { key: "MUNRO_REFRAMING_FINALE", label: "6. Финал переосмысляет, а не разрешает" },
      { key: "MUNRO_PRACTICAL_LIMIT", label: "7. Ограничение — через практическую деталь" },
    ],
  },
  {
    id: "dovlatov",
    title: "Довлатов — предельная сжатость",
    knowledgePath: "learning/compasses/DOVLATOV-COMPASS.md",
    nativeGenre: "автобиографическая короткая проза",
    axes: [
      { key: "DOVLATOV_ANECDOTE_UNIT", label: "1. Анекдот как единица прозы" },
      { key: "DOVLATOV_RIDICULOUS_NARRATOR", label: "2. Рассказчик — самый нелепый персонаж" },
      { key: "DOVLATOV_FLAT_TRAGEDY", label: "3. Бесстрастность даже к трагедии" },
      { key: "DOVLATOV_ABSURD_AS_NORM", label: "4. Абсурд подаётся как норма" },
      { key: "DOVLATOV_COMPRESSION", label: "5. Сжатие как основной приём" },
      { key: "DOVLATOV_ONE_STROKE_PORTRAIT", label: "6. Портрет одной чертой в одной фразе" },
      { key: "DOVLATOV_EAR_CONTROL", label: "7. Слуховой контроль фразы" },
    ],
  },
  {
    id: "collins",
    title: "Уилки Коллинз — скрытая правда через свидетельства",
    knowledgePath: "learning/compasses/COLLINS-COMPASS.md",
    nativeGenre: "детектив",
    axes: [
      { key: "COLLINS_TESTIMONY_STRUCTURE", label: "1. Структура показаний, а не единого рассказчика" },
      { key: "COLLINS_CHARACTER_UNRELIABILITY", label: "2. Ненадёжность через характер, не обман" },
      { key: "COLLINS_VISIBLE_CLUE", label: "3. Улика на виду, подтверждённая задним числом" },
      { key: "COLLINS_FACT_TENSION", label: "4. Напряжение через факт, а не эпитет" },
      { key: "COLLINS_CHARMING_EVIL", label: "5. Обаятельное, разумное зло" },
      { key: "COLLINS_CHRONOLOGY", label: "6. Хронологическая строгость как двигатель саспенса" },
      { key: "COLLINS_PLOT_CRITIQUE", label: "7. Социальная критика через устройство сюжета" },
    ],
  },
  {
    id: "sorkin",
    title: "Соркин — намерение и препятствие",
    knowledgePath: "learning/compasses/SORKIN-COMPASS.md",
    nativeGenre: "драма и сценарий",
    axes: [
      { key: "SORKIN_INTENTION_OBSTACLE", label: "1. Намерение и препятствие" },
      { key: "SORKIN_LINE_AS_ACTION", label: "2. Реплика — это действие, не информация" },
      { key: "SORKIN_ENTER_LATE", label: "3. Вход на середине конфликта" },
      { key: "SORKIN_PHRASE_AS_THEME", label: "4. Фраза как музыкальная тема" },
      { key: "SORKIN_WIT_AS_WEAPON", label: "5. Остроумие — оружие персонажа, не украшение" },
      { key: "SORKIN_MONOLOGUE_ARIA", label: "6. Монолог как ария" },
      { key: "SORKIN_BEST_ARGUMENTS", label: "7. Антагонисту — лучшие аргументы" },
    ],
  },
];

export function getCompass(id: string): CompassMeta | undefined {
  return COMPASSES.find((compass) => compass.id === id);
}
