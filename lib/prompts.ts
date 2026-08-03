// Сборка промптов (ТЗ §6.3) и контракт формата ответа (§6.2).
// Этот слой ничего не знает о том, КАК депеша дойдёт до ИИ.

import type { AxisAssessment, AxisState, GrowthReport } from "./types";

const EDITOR_ROLE = `Вы — опытный литературный редактор. Железное правило: вы НИКОГДА не пишете
и не переписываете текст за автора. Никаких готовых формулировок, вариантов фраз
или «а лучше сказать так». Ваша работа — разбор: показать, что происходит
в тексте, задать точный вопрос, назвать направление. Решение всегда за автором.
Дежурная похвала запрещена; если что-то сильно — скажите коротко и по делу почему.
Разбирайте ТОЛЬКО присланный фрагмент. Не опирайтесь на то, что вы можете знать
об этом тексте, авторе или произведении из других разговоров, своей памяти или
файлов, — чего нет в этих строках, того для разбора не существует.`;

export const RESPONSE_CONTRACT = `Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: разбор]
(основной разбор)
[СЕКЦИЯ: точка роста]
(одна главная зона роста, сформулированная одним абзацем)
===КОНЕЦ===`;

interface LensPromptInput {
  text: string;
  intention?: string;
}

export interface CompassPromptInput extends LensPromptInput {
  compassTitle: string;
  compassKnowledge: string; // содержимое md-файла компаса
  nativeGenre: string;
  axes: Array<{ key: string; label: string }>; // семь осей наставника
  targetGenre?: string; // если автор работает вне родного жанра компаса
}

function intentionBlock(intention?: string): string {
  return intention !== undefined && intention.trim() !== ""
    ? `\nНамерение автора для этого фрагмента: ${intention.trim()}\nДержите диагностику прицельной — относительно этого намерения.\n`
    : "";
}

function fragmentBlock(text: string): string {
  return `\nТекст фрагмента:\n<<<НАЧАЛО ФРАГМЕНТА>>>\n${text}\n<<<КОНЕЦ ФРАГМЕНТА>>>\n`;
}

export function buildDryOutPrompt({ text, intention }: LensPromptInput): string {
  return `${EDITOR_ROLE}

Задача — «Не высушивать». Определите, за счёт чего этот фрагмент ЖИВЁТ:
какие элементы (детали, интонация, ритм, ходы) несут его жизнь и не должны
пострадать при редактуре. Отдельно назовите, что рискует быть «высушено»
неосторожной правкой — и почему это было бы потерей.
${intentionBlock(intention)}${fragmentBlock(text)}
${RESPONSE_CONTRACT}`;
}

export function buildStrengthenPrompt({ text, intention }: LensPromptInput): string {
  return `${EDITOR_ROLE}

Задача — «Усилить». Найдите слабые места фрагмента. По каждому: что именно
слабо, почему (механика, не вкусовщина) — и вопрос автору, который поможет
ему найти решение самому. Не предлагайте готовых исправлений.
${intentionBlock(intention)}${fragmentBlock(text)}
${RESPONSE_CONTRACT}`;
}

// Контракт осевого разбора «Сверить»: по каждой оси — блок [ОСЬ N], плюс
// [ГЛАВНОЕ] и [УПРАЖНЕНИЕ]. Номер N привязывает ось к реестру наставника
// (CompassMeta.axes). «фокус» — нейтральный заголовок наблюдения (автору
// показываем его, а не название оси). «приоритет» — отбор 2–3 зон роста и
// одной сильной стороны, сильнее всего отвечающих намерению автора.
export const AXIS_RESPONSE_CONTRACT = `Ответ верните СТРОГО в формате ниже, без текста вне блока. Для КАЖДОЙ из семи
осей — свой блок [ОСЬ N], где N — номер оси из списка выше. В конце — [ГЛАВНОЕ]
и [УПРАЖНЕНИЕ].

===IRINAOS===
[ОСЬ 1]
состояние: <ровно одно из трёх: сильная сторона | зона роста | в норме>
фокус: <короткий нейтральный заголовок ЭТОГО наблюдения — про то, что происходит в тексте (2–5 слов). НЕ название оси и НЕ термин мастерства (напр. «финал договаривает», а не «сокращение концовок»)>
видно: <что видно ИМЕННО в этом фрагменте — коротко и с примером-цитатой, а не общими словами>
шаг: <НЕ готовая правка, а продвигающий вопрос из роли этого наставника — по правилам развивающей обратной связи: помогает автору осмыслить наблюдение и САМОМУ решить, что дорабатывать, а что оставить. Обязателен и для «зоны роста», и для «сильной стороны». Только если «в норме» — поставьте «—»>
приоритет: <да — если это одна из 2–3 зон роста, СИЛЬНЕЕ всего отвечающих намерению автора, ИЛИ единственная сильная сторона, которая максимально приближает текст к результату намерения; иначе — нет>
[ОСЬ 2]
… (все семь осей по этому же шаблону)
[ОСЬ 7]
…
[ГЛАВНОЕ]
<одна главная зона роста фрагмента: куда смотреть в первую очередь — относительно намерения автора, одним абзацем. Заверши не общим вопросом-формулой, а живым разворотом, который вырастает из конкретного образа, детали или фразы ЭТОГО текста и подводит автора к его выбору. Это чаще всего вопрос, но опосредованный через сам текст; меняй форму от разбора к разбору. ЗАПРЕЩЕНО завершать штампом вроде «какое одно действие сильнее всего приблизит к намерению» и любыми стандартными коучинговыми оборотами.>
[УПРАЖНЕНИЕ]
<микроупражнение на конкретный писательский микронавык из роли ИМЕННО этого наставника. Сначала само задание (что тренировать), затем с новой строки короткий пример-демонстрация, помеченный «Например: …» — чтобы автор без наставника рядом понял, как выполнить верно; подчеркни, что это лишь ОДИН из возможных вариантов. Это тренировка навыка, не правка данного фрагмента — автор берёт в копилку и делает по желанию.>
===КОНЕЦ===`;

export function buildCompassPrompt({
  text,
  intention,
  compassTitle,
  compassKnowledge,
  nativeGenre,
  axes,
  targetGenre,
}: CompassPromptInput): string {
  const transfer =
    targetGenre !== undefined && targetGenre.trim() !== ""
      ? `\nВНИМАНИЕ — ПЕРЕНОС ЖАНРА: автор работает в жанре «${targetGenre.trim()}»,
а родной жанр наставника — «${nativeGenre}». Используйте подсказки «ПЕРЕНОС»
из файла наставника; оси, не имеющие смысла вне родного жанра, честно
помечайте состоянием «в норме» и поясняйте в строке «видно».\n`
      : "";

  // Метки осей уже могут содержать ведущий номер («1. Намерение…») — снимаем
  // его, чтобы не задваивать нумерацию списка.
  const axisList = axes
    .map((axis, index) => `${index + 1}. ${axis.label.replace(/^\d+\.\s*/u, "")}`)
    .join("\n");

  return `${EDITOR_ROLE}

Задача — разбор по осям наставника «${compassTitle}». Наставник — это ориентир,
а НЕ образец для имитации: берём его направление стиля, а не голос.

Пройдите по всем семи осям наставника. Оси — это грани мастерства, по которым
мы смотрим на текст:
${axisList}

По КАЖДОЙ оси дайте короткую, конкретную оценку именно этого фрагмента, опираясь
на формулировки ДИАГНОСТИКИ из файла наставника. Не общими словами — с примером
из текста. Честно различайте: где ось уже сильная сторона автора, где зона роста,
а где всё в норме и трогать нечего.

Формулируйте по правилам развивающей обратной связи: конкретно и на основе того,
что видно в тексте (без оценок автора как личности); не «что плохо», а что усилит;
каждую ось завершайте вопросом, который передаёт решение автору. Держите
коучинговый вектор — подвести автора к его собственному следующему решению, — но
НЕ проговаривайте его дежурной формулой: он должен вырастать из конкретного
материала текста. Отберите приоритетом 2–3 зоны роста, СИЛЬНЕЕ всего отвечающие намерению,
и ОДНУ сильную сторону, которая максимально приближает к его результату — именно
их автор увидит первыми; остальные оси оцените честно, но без приоритета.
${transfer}
Файл наставника:
<<<НАЧАЛО>>>
${compassKnowledge}
<<<КОНЕЦ>>>
${intentionBlock(intention)}${fragmentBlock(text)}
${AXIS_RESPONSE_CONTRACT}`;
}

/** Нормализация состояния оси к одному из трёх значений контракта. */
function normalizeAxisState(raw: string): AxisState {
  const s = raw.toLowerCase();
  if (s.includes("сильн")) return "сильная сторона";
  if (s.includes("рост")) return "зона роста";
  return "в норме";
}

/** Достаёт поле («состояние»/«видно»/«шаг») из текста блока одной оси. */
function axisField(block: string, label: string, nextLabels: string[]): string {
  const stop = nextLabels.length > 0 ? `(?=\\n\\s*(?:${nextLabels.join("|")}):)` : "";
  const re = new RegExp(`${label}:\\s*([\\s\\S]*?)${stop === "" ? "$" : stop}`, "iu");
  const m = re.exec(block);
  return m?.[1] !== undefined ? m[1].trim() : "";
}

export interface CompassReview {
  axes: AxisAssessment[];
  main: string; // [ГЛАВНОЕ] — куда смотреть в первую очередь
  exercise: string; // [УПРАЖНЕНИЕ] — микроупражнение в копилку ("" если нет)
}

/**
 * Парсер осевого разбора: читает блок ===IRINAOS===…===КОНЕЦ===, раскладывает
 * секции [ОСЬ N], [ГЛАВНОЕ] и [УПРАЖНЕНИЕ]. Номер N привязывает оценку к
 * axes[N-1] — берём оттуда стабильные key/label наставника. undefined при сбое.
 */
export function parseCompassResponse(
  raw: string,
  axes: Array<{ key: string; label: string }>,
): CompassReview | undefined {
  const block = /===IRINAOS===([\s\S]*?)===КОНЕЦ===/u.exec(raw);
  if (block === null || block[1] === undefined) return undefined;

  const body = block[1];
  const marker = /\[\s*(ОСЬ\s*(\d+)|ГЛАВНОЕ|УПРАЖНЕНИЕ)\s*\]/gu;

  type Kind = "axis" | "main" | "exercise";
  const sections: Array<{ kind: Kind; axisNumber?: number; content: string }> = [];
  let match = marker.exec(body);
  if (match === null) return undefined;

  while (match !== null) {
    const start = match.index + match[0].length;
    const next = marker.exec(body);
    const end = next === null ? body.length : next.index;
    const content = body.slice(start, end).trim();
    const label = match[1] ?? "";
    const axisNumber = match[2] !== undefined ? Number.parseInt(match[2], 10) : undefined;
    const kind: Kind = axisNumber !== undefined ? "axis" : label.startsWith("УПРАЖНЕНИЕ") ? "exercise" : "main";
    sections.push({ kind, ...(axisNumber !== undefined && { axisNumber }), content });
    match = next;
  }

  const assessments: AxisAssessment[] = [];
  let main = "";
  let exercise = "";
  for (const section of sections) {
    if (section.kind === "main") {
      if (main === "") main = section.content;
      continue;
    }
    if (section.kind === "exercise") {
      if (exercise === "") exercise = section.content;
      continue;
    }
    const axis = axes[(section.axisNumber ?? 0) - 1];
    if (axis === undefined) continue; // номер вне реестра — пропускаем

    const c = section.content;
    const state = normalizeAxisState(axisField(c, "состояние", ["фокус", "видно", "шаг", "приоритет"]));
    const focus = axisField(c, "фокус", ["видно", "шаг", "приоритет"]);
    const seen = axisField(c, "видно", ["шаг", "приоритет"]);
    const stepRaw = axisField(c, "шаг", ["приоритет"]);
    const step = stepRaw === "—" || stepRaw === "-" ? "" : stepRaw;
    const priority = /^да/u.test(axisField(c, "приоритет", []).trim().toLowerCase());
    assessments.push({
      key: axis.key,
      label: axis.label,
      state,
      ...(focus !== "" && { focus }),
      seen,
      step,
      ...(priority && { priority: true }),
    });
  }

  if (assessments.length === 0) return undefined;
  return { axes: assessments, main, exercise };
}

/**
 * Оси для показа автору, в порядке чтения: сначала зоны роста, затем сильные
 * стороны; «в норме» скрываем (менеджер внимания, не отчёт). По умолчанию
 * показываем СТОЛЬКО, сколько есть по факту (лимит — только если задан).
 */
export function topAxes(axes: AxisAssessment[], limit?: number): AxisAssessment[] {
  const rank = (state: AxisState): number =>
    state === "зона роста" ? 0 : state === "сильная сторона" ? 1 : 2;
  const shown = axes
    .filter((axis) => axis.state !== "в норме")
    .sort((a, b) => rank(a.state) - rank(b.state));
  return limit === undefined ? shown : shown.slice(0, limit);
}

/**
 * Отбор осей для показа автору: 2–3 зоны роста + одна сильная сторона,
 * помеченные приоритетом (если наставник их отметил) — иначе по факту.
 * Один источник и для тетради (PassCard), и для экспорта разбора.
 */
export function selectShownAxes(axes: AxisAssessment[]): {
  growth: AxisAssessment[];
  strengths: AxisAssessment[];
} {
  const pick = (state: AxisState, limit: number): AxisAssessment[] => {
    const all = axes.filter((axis) => axis.state === state);
    const pri = all.filter((axis) => axis.priority === true);
    return (pri.length > 0 ? pri : all).slice(0, limit);
  };
  return { growth: pick("зона роста", 3), strengths: pick("сильная сторона", 1) };
}

/**
 * Синтез плоского parsedResult из осевого разбора — чтобы сводка и изыскания
 * (которые читают parsedResult["разбор"]/["точка роста"]) продолжали работать.
 */
export function axisResultToParsed(
  result: { axes: AxisAssessment[]; main: string; exercise?: string },
): Record<string, string> {
  const shown = topAxes(result.axes);
  const razbor = shown
    .map((axis) => {
      const step = axis.step !== "" ? ` → ${axis.step}` : "";
      // имя оси наружу не выдаём — берём нейтральный «фокус»; label только запас
      const name =
        axis.focus !== undefined && axis.focus !== ""
          ? axis.focus
          : axis.label.replace(/^\d+\.\s*/u, "");
      return `${name} (${axis.state}): ${axis.seen}${step}`;
    })
    .join("\n");
  const parsed: Record<string, string> = {};
  if (razbor !== "") parsed["разбор"] = razbor;
  if (result.main !== "") parsed["точка роста"] = result.main;
  if (result.exercise !== undefined && result.exercise !== "") parsed["упражнение"] = result.exercise;
  return parsed;
}

// --- «Разбор роста»: нарративная траектория одного текста (мульти-наставник) ---
// docs/ДВА-ПРОЦЕССА.md: не оси одного наставника, а синтез движения через версии.

export interface GrowthPromptInput {
  versions: Array<{ label: string; text: string }>; // по порядку
  advice: Array<{ versionLabel: string; mentor: string; point: string }>; // советы по пути
  protect?: string; // что берегли — из «Не высушить»
  intention?: string;
}

export const GROWTH_RESPONSE_CONTRACT = `Ответ верните СТРОГО в формате ниже, без текста вне блока.

===IRINAOS===
[ГЛАВНОЕ]
<улучшается ли текст в целом от версии к версии и куда смотреть в первую очередь дальше — одним абзацем, через конкретику ЭТИХ версий, без дежурных формул>
[ОКРЕПЛО]
- <что выросло: на какой версии/правке и за счёт чего — с примером было→стало>
- <ещё пункт, если есть>
[НАД ЧЕМ ПОРАБОТАТЬ]
- <что не двинулось или просело за версии — с конкретикой>
- <ещё пункт, если есть>
[СЛЕДУЮЩИЙ ШАГ]
<один вопрос-направление автору: что попробовать на следующей версии (не готовая правка)>
===КОНЕЦ===`;

export function buildGrowthPrompt({ versions, advice, protect, intention }: GrowthPromptInput): string {
  const versionBlocks = versions
    .map((v) => `<<<${v.label.toUpperCase()}>>>\n${v.text}\n<<<КОНЕЦ: ${v.label}>>>`)
    .join("\n\n");
  const adviceBlock =
    advice.length > 0
      ? `\nСоветы наставников по пути (что автору предлагали на каждой сверке):\n${advice
          .map((a) => `— ${a.versionLabel}, ${a.mentor}: ${a.point}`)
          .join("\n")}\n`
      : "";
  const protectBlock =
    protect !== undefined && protect.trim() !== ""
      ? `\nЧто в тексте берегли (диагностика «Не высушить»):\n${protect.trim()}\n`
      : "";

  return `${EDITOR_ROLE}

Задача — разбор РОСТА одного текста. Перед вами версии ОДНОГО фрагмента по порядку:
автор правил его сам после сверок с наставниками (наставники могли быть разными).
Не разбирайте отдельную версию — покажите ДВИЖЕНИЕ через версии: что окрепло (на
какой правке и за счёт чего), что не двинулось или просело. Учтите советы
наставников ниже — применил ли автор совет и сработало ли это. Опирайтесь на
конкретику: пример было→стало из версий. Хвалу даром не выдавайте.
${protectBlock}${adviceBlock}${intentionBlock(intention)}
Версии фрагмента (по порядку):
${versionBlocks}

${GROWTH_RESPONSE_CONTRACT}`;
}

/** Разбивает содержимое секции на пункты-строки (маркеры -, •, –, — в начале). */
function bulletLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.replace(/^\s*[-•–—]\s*/u, "").trim())
    .filter((line) => line !== "");
}

/**
 * Парсер разбора роста: секции [ГЛАВНОЕ]/[ОКРЕПЛО]/[НАД ЧЕМ ПОРАБОТАТЬ]/
 * [СЛЕДУЮЩИЙ ШАГ] внутри блока ===IRINAOS===…===КОНЕЦ===. undefined при сбое.
 */
export function parseGrowthResponse(raw: string): GrowthReport | undefined {
  const block = /===IRINAOS===([\s\S]*?)===КОНЕЦ===/u.exec(raw);
  if (block === null || block[1] === undefined) return undefined;

  const body = block[1];
  const marker = /\[\s*(ГЛАВНОЕ|ОКРЕПЛО|НАД ЧЕМ ПОРАБОТАТЬ|СЛЕДУЮЩИЙ ШАГ)\s*\]/gu;
  const sections = new Map<string, string>();
  let match = marker.exec(body);
  if (match === null) return undefined;
  while (match !== null) {
    const name = (match[1] ?? "").trim();
    const start = match.index + match[0].length;
    const next = marker.exec(body);
    const end = next === null ? body.length : next.index;
    if (!sections.has(name)) sections.set(name, body.slice(start, end).trim());
    match = next;
  }

  const main = sections.get("ГЛАВНОЕ") ?? "";
  const wins = bulletLines(sections.get("ОКРЕПЛО") ?? "");
  const toWork = bulletLines(sections.get("НАД ЧЕМ ПОРАБОТАТЬ") ?? "");
  const nextStep = sections.get("СЛЕДУЮЩИЙ ШАГ") ?? "";

  if (main === "" && wins.length === 0 && toWork.length === 0) return undefined;
  return { main, wins, toWork, nextStep };
}

// --- «Голос автора»: кросс-текстовый разбор голоса поверх корпуса ---
// docs/ДВА-ПРОЦЕССА.md, Процесс 2. Единица анализа — АВТОР, а не текст: смотрим,
// что общего в голосе на РАЗНЫХ текстах, что уже звучит уверенно, а что ещё
// колеблется от текста к тексту. Озвучивает секретарь (не наставник): он не
// правит и не хвалит даром — он собирает портрет голоса и задаёт направление.

const VOICE_SECRETARY_ROLE = `Вы — внимательный секретарь при столе автора. Железное правило: вы НИКОГДА не
пишете и не переписываете текст за автора и не даёте готовых формулировок. Ваша
работа — не разбор отдельного текста, а портрет ГОЛОСА автора поверх нескольких
её текстов: что в голосе повторяется из текста в текст и уже звучит уверенно, а
что ещё колеблется — где-то есть, где-то пропадает. Говорите словами и примерами
из присланных текстов, не оценками и не баллами. Дежурная похвала запрещена.
Опирайтесь ТОЛЬКО на присланные ниже тексты — ничего из других разговоров,
памяти или файлов; чего нет в этих строках, того для портрета не существует.`;

export const AUTHOR_VOICE_RESPONSE_CONTRACT = `Ответ верните СТРОГО в формате ниже, без текста вне блока.

===IRINAOS===
[ГЛАВНОЕ]
<что за голос складывается поверх этих текстов — одним абзацем, через конкретику ЭТИХ текстов (узнаваемые ходы, интонация, ритм), без дежурных формул>
[УВЕРЕННО]
- <черта голоса, которая повторяется и держится в РАЗНЫХ текстах — с примером-цитатой, откуда именно>
- <ещё черта, если есть>
[КОЛЕБЛЕТСЯ]
- <что в голосе непостоянно: в одном тексте звучит, в другом теряется — с конкретикой откуда>
- <ещё пункт, если есть>
[СЛЕДУЮЩИЙ ШАГ]
<один вопрос-направление автору: куда смотреть, чтобы голос окреп (не готовая правка)>
===КОНЕЦ===`;

export interface AuthorVoicePromptInput {
  texts: Array<{ title: string; text: string; intention?: string }>;
}

export function buildAuthorVoicePrompt({ texts }: AuthorVoicePromptInput): string {
  const textBlocks = texts
    .map((entry, index) => {
      const header = `<<<ТЕКСТ ${index + 1}: ${entry.title}>>>`;
      const intent =
        entry.intention !== undefined && entry.intention.trim() !== ""
          ? `\n(намерение автора: ${entry.intention.trim()})`
          : "";
      return `${header}${intent}\n${entry.text}\n<<<КОНЕЦ: ТЕКСТ ${index + 1}>>>`;
    })
    .join("\n\n");

  return `${VOICE_SECRETARY_ROLE}

Задача — портрет ГОЛОСА автора. Перед вами ${texts.length} её РАЗНЫХ текста,
каждый доведён до финальной версии. Не разбирайте их по отдельности — смотрите,
что у них ОБЩЕГО как у голоса одного автора: какие ходы, интонация, ритм
повторяются и уже звучат уверенно; что колеблется — в одном тексте есть, в
другом пропадает. Опирайтесь на конкретику: цитата из текста, где это видно.
Хвалу даром не выдавайте.

Тексты автора (финальные версии):
${textBlocks}

${AUTHOR_VOICE_RESPONSE_CONTRACT}`;
}

/**
 * Парсер «Голоса автора»: секции [ГЛАВНОЕ]/[УВЕРЕННО]/[КОЛЕБЛЕТСЯ]/[СЛЕДУЮЩИЙ ШАГ]
 * внутри ===IRINAOS===…===КОНЕЦ===. Кладём в тот же GrowthReport: уверенно→wins,
 * колеблется→toWork (показ переиспользует GrowthReview). undefined при сбое.
 */
export function parseAuthorVoiceResponse(raw: string): GrowthReport | undefined {
  const block = /===IRINAOS===([\s\S]*?)===КОНЕЦ===/u.exec(raw);
  if (block === null || block[1] === undefined) return undefined;

  const body = block[1];
  const marker = /\[\s*(ГЛАВНОЕ|УВЕРЕННО|КОЛЕБЛЕТСЯ|СЛЕДУЮЩИЙ ШАГ)\s*\]/gu;
  const sections = new Map<string, string>();
  let match = marker.exec(body);
  if (match === null) return undefined;
  while (match !== null) {
    const name = (match[1] ?? "").trim();
    const start = match.index + match[0].length;
    const next = marker.exec(body);
    const end = next === null ? body.length : next.index;
    if (!sections.has(name)) sections.set(name, body.slice(start, end).trim());
    match = next;
  }

  const main = sections.get("ГЛАВНОЕ") ?? "";
  const wins = bulletLines(sections.get("УВЕРЕННО") ?? "");
  const toWork = bulletLines(sections.get("КОЛЕБЛЕТСЯ") ?? "");
  const nextStep = sections.get("СЛЕДУЮЩИЙ ШАГ") ?? "";

  if (main === "" && wins.length === 0 && toWork.length === 0) return undefined;
  return { main, wins, toWork, nextStep };
}

/** Плоский parsedResult из разбора роста — чтобы сводка/экспорт продолжали работать. */
export function growthReportToParsed(report: GrowthReport): Record<string, string> {
  const parts: string[] = [];
  if (report.main !== "") parts.push(report.main);
  if (report.wins.length > 0) parts.push(`Окрепло: ${report.wins.join("; ")}`);
  if (report.toWork.length > 0) parts.push(`Над чем поработать: ${report.toWork.join("; ")}`);
  const parsed: Record<string, string> = {};
  if (parts.length > 0) parsed["разбор"] = parts.join("\n");
  if (report.nextStep !== "") parsed["точка роста"] = report.nextStep;
  return parsed;
}

/**
 * Парсер по контракту формата: читает только блок ===IRINAOS===…===КОНЕЦ===,
 * секции — по маркерам [СЕКЦИЯ: имя]. Возвращает undefined при сбое —
 * вызывающий код ставит lastParseFailed и сохраняет raw-ответ целиком.
 */
export function parsePromptResponse(raw: string): Record<string, string> | undefined {
  const block = /===IRINAOS===([\s\S]*?)===КОНЕЦ===/u.exec(raw);
  if (block === null || block[1] === undefined) return undefined;

  const body = block[1];
  const sections: Record<string, string> = {};
  const marker = /\[СЕКЦИЯ:\s*([^\]]+)\]/gu;

  let match = marker.exec(body);
  if (match === null) return undefined;

  while (match !== null) {
    const name = (match[1] ?? "").trim();
    const start = match.index + match[0].length;
    const next = marker.exec(body);
    const end = next === null ? body.length : next.index;
    sections[name] = body.slice(start, end).trim();
    match = next;
  }

  return Object.keys(sections).length > 0 ? sections : undefined;
}

/** Точка роста из распарсенного диагноза — сырьё для изысканий (§5.3). */
export function extractGrowthPoint(parsed: Record<string, string>): string | undefined {
  const value = parsed["точка роста"];
  return value !== undefined && value.trim() !== "" ? value.trim() : undefined;
}

// --- Промпты Секретаря (Кабинет) ---

const SECRETARY_ROLE = `Вы — литературный секретарь автора: человек, который знает, как автор пишет,
и наводит для него справки. Вы не пишете и не переписываете тексты автора.
Ваша работа — принести проверенное знание и честно указать границы его надёжности.`;

export interface InquiryPromptInput {
  topic: string;
  sourceGrowthPoint?: string; // если изыскание отправлено от диагноза
}

export function buildInquiryPrompt({ topic, sourceGrowthPoint }: InquiryPromptInput): string {
  const source =
    sourceGrowthPoint !== undefined && sourceGrowthPoint.trim() !== ""
      ? `\nПоводом стала точка роста из редакторского диагноза:\n«${sourceGrowthPoint.trim()}»\n`
      : "";

  return `${SECRETARY_ROLE}

Задача — изыскания по теме: ${topic.trim()}
${source}
Что нужно: что известно об этом с точки зрения науки и серьёзной практики
письма — исследования, разборы, эссе мастеров. Что подтверждает подход автора,
что ставит его под сомнение. Никаких общих слов — только конкретные находки
с указанием источника (автор, работа, год — насколько уверенно помните;
если уверенности нет, честно пометьте).

Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: справка]
(главные находки, по пунктам)
[СЕКЦИЯ: источники]
(список источников с пометками надёжности)
[СЕКЦИЯ: что взять в работу]
(2–3 конкретных приёма или проверки, которые автор может применить сам)
===КОНЕЦ===`;
}

export interface AuditPromptPair {
  notebookTitle: string;
  before: string;
  after: string;
  note?: string;
}

/** Депеша аудита корпуса (LEARNING-LOOP): разбор правок «было ↔ стало». */
export function buildAuditPrompt(pairs: AuditPromptPair[], voiceCore?: string): string {
  const material = pairs
    .map((pair, index) => {
      const note = pair.note !== undefined ? ` (автор: «${pair.note}»)` : "";
      return `Правка ${index + 1} — тетрадь «${pair.notebookTitle}»${note}
БЫЛО:
<<<НАЧАЛО>>>
${pair.before}
<<<КОНЕЦ>>>
СТАЛО:
<<<НАЧАЛО>>>
${pair.after}
<<<КОНЕЦ>>>`;
    })
    .join("\n\n");

  const core =
    voiceCore !== undefined && voiceCore.trim() !== ""
      ? `\nТекущий портрет голоса (подтверждённые механики) — для сверки, не для пересказа:
<<<НАЧАЛО ПОРТРЕТА>>>
${voiceCore.trim()}
<<<КОНЕЦ ПОРТРЕТА>>>\n`
      : "";

  return `${SECRETARY_ROLE}

Задача — аудит корпуса по циклу LEARNING-LOOP. Перед вами правки автора с
прошлого аудита: пары «было ↔ стало». Вы не оцениваете тексты и не советуете,
как писать, — вы наблюдаете, КАК АВТОР ПРАВИТ, и извлекаете из этого знание.

Что нужно:
1. Механики правки — повторяющиеся приёмы. Кандидат в подтверждённые механики
   называется только при 2–3 повторах на разных текстах; единичные наблюдения
   честно помечайте «мало данных».
2. Дрейф голоса — что в правках усиливается, что уходит; наблюдения,
   пригодные для дельта-таблиц компасов.
3. Ревизия анти-паттернов — нет ли в правках следов «прилизанного ИИ-стиля»:
   сглаженная интонация, потеря странности, объясняющие финалы.
${core}
Материал:
${material}

Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: механики]
(кандидаты с числом повторов и примерами из правок)
[СЕКЦИЯ: дрейф голоса]
(что усиливается, что уходит)
[СЕКЦИЯ: анти-паттерны]
(находки — или честное «чисто»)
[СЕКЦИЯ: итог]
(главный вывод аудита в двух-трёх фразах)
===КОНЕЦ===`;
}

/**
 * Депеша «Сверки голоса» (версия 1.0) — лёгкое зеркало: не картотека голоса,
 * а короткий взгляд на то, что повторяется в правках. Без механик-таблиц и
 * дельт — это уже полный «Аудит корпуса», приберегаемый под следующую версию.
 */
export function buildVoiceCheckPrompt(pairs: AuditPromptPair[]): string {
  const material = pairs
    .map((pair, index) => {
      const note = pair.note !== undefined ? ` (автор: «${pair.note}»)` : "";
      return `Правка ${index + 1} — тетрадь «${pair.notebookTitle}»${note}
БЫЛО:
<<<НАЧАЛО>>>
${pair.before}
<<<КОНЕЦ>>>
СТАЛО:
<<<НАЧАЛО>>>
${pair.after}
<<<КОНЕЦ>>>`;
    })
    .join("\n\n");

  return `${SECRETARY_ROLE}

Задача — лёгкая сверка голоса. Перед вами несколько правок автора: пары
«было ↔ стало». Не оценивайте тексты и не советуйте, как писать. Просто
покажите зеркало: что в том, КАК АВТОР ПРАВИТ, повторяется.

Назовите 2–3 черты простыми словами:
— что уже звучит уверенно (повторяется как приём);
— что ещё колеблется (то в одну сторону, то в другую).
Коротко, по делу, без похвалы. Никаких таблиц, списков механик и терминов —
это разговор с автором, а не отчёт.

Материал:
${material}

Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: сверка]
(2–3 черты: что уже уверенно, что ещё колеблется — несколько живых фраз)
===КОНЕЦ===`;
}

export interface DigestPromptInput {
  notebookTitle: string;
  firstVersionText: string;
  lastVersionText: string;
  rounds: Array<{
    label: string;
    intention?: string;
    diagnosis?: string;
    growthPoint?: string;
    versionNote?: string;
  }>;
}

export function buildDigestPrompt(input: DigestPromptInput): string {
  const rounds = input.rounds
    .map((round, index) => {
      const parts = [`Итерация ${index + 1} — ${round.label}`];
      if (round.intention !== undefined) parts.push(`Намерение: ${round.intention}`);
      if (round.diagnosis !== undefined) parts.push(`Разбор: ${round.diagnosis}`);
      if (round.growthPoint !== undefined) parts.push(`Точка роста: ${round.growthPoint}`);
      if (round.versionNote !== undefined) parts.push(`Правка автора: ${round.versionNote}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return `${SECRETARY_ROLE}

Задача — сводка по тетради «${input.notebookTitle}»: несколько итераций работы
над одним фрагментом позади, сведите сделанное. Что реально сдвинулось от первой
версии к последней (по существу, не по мелочи), какие диагнозы подтверждались
повторно, какая линия роста проступает сквозь все итерации. Без пересказа
каждой итерации — только сквозные наблюдения.

Первая версия фрагмента:
<<<НАЧАЛО>>>
${input.firstVersionText}
<<<КОНЕЦ>>>

Последняя версия фрагмента:
<<<НАЧАЛО>>>
${input.lastVersionText}
<<<КОНЕЦ>>>

История итераций:
${rounds}

Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: сводка]
(что сдвинулось и какая линия роста проступает)
[СЕКЦИЯ: точка роста]
(одна главная зона роста на следующий круг)
===КОНЕЦ===`;
}
