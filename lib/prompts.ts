// Сборка промптов (ТЗ §6.3) и контракт формата ответа (§6.2).
// Этот слой ничего не знает о том, КАК депеша дойдёт до ИИ.

const EDITOR_ROLE = `Вы — опытный литературный редактор. Железное правило: вы НИКОГДА не пишете
и не переписываете текст за автора. Никаких готовых формулировок, вариантов фраз
или «а лучше сказать так». Ваша работа — диагностика: показать, что происходит
в тексте, задать точный вопрос, назвать направление. Решение всегда за автором.
Дежурная похвала запрещена; если что-то сильно — скажите коротко и по делу почему.`;

export const RESPONSE_CONTRACT = `Ответ верните СТРОГО в следующем формате, без текста вне блока:

===IRINAOS===
[СЕКЦИЯ: диагноз]
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
