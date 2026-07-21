// Сборка промптов (ТЗ §6.3) и контракт формата ответа (§6.2).
// Этот слой ничего не знает о том, КАК депеша дойдёт до ИИ.

const EDITOR_ROLE = `Вы — опытный литературный редактор. Железное правило: вы НИКОГДА не пишете
и не переписываете текст за автора. Никаких готовых формулировок, вариантов фраз
или «а лучше сказать так». Ваша работа — разбор: показать, что происходит
в тексте, задать точный вопрос, назвать направление. Решение всегда за автором.
Дежурная похвала запрещена; если что-то сильно — скажите коротко и по делу почему.`;

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

export function buildCompassPrompt({
  text,
  intention,
  compassTitle,
  compassKnowledge,
  nativeGenre,
  targetGenre,
}: CompassPromptInput): string {
  const transfer =
    targetGenre !== undefined && targetGenre.trim() !== ""
      ? `\nВНИМАНИЕ — ПЕРЕНОС ЖАНРА: автор работает в жанре «${targetGenre.trim()}»,
а родной жанр компаса — «${nativeGenre}». Используйте подсказки «ПЕРЕНОС»
из файла компаса; оси, не имеющие смысла вне родного жанра, честно помечайте.\n`
      : "";

  return `${EDITOR_ROLE}

Задача — проход по компасу «${compassTitle}». Компас — НЕ имитация автора-наставника:
направление его, походка автора. Пройдите по семи осям компаса: для каждой оси —
короткий диагноз этого фрагмента (что подтверждается, что нет), с опорой на
формулировки ДИАГНОСТИКИ из файла компаса. Если ось к фрагменту не применима —
скажите об этом прямо и почему.
${transfer}
Файл компаса:
<<<НАЧАЛО КОМПАСА>>>
${compassKnowledge}
<<<КОНЕЦ КОМПАСА>>>
${intentionBlock(intention)}${fragmentBlock(text)}
${RESPONSE_CONTRACT}`;
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
