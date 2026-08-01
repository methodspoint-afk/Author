// Счётчик объёма текста — рабочий инструмент пишущего (лимиты журналов,
// конкурсов, колонок). Тихая строка, не виджет. Знаки — с пробелами.

// Ориентир по объёму фрагмента: от него считается «осталось знаков». Значение
// по умолчанию; в следующих версиях сделаем настраиваемым под тетрадь.
export const FRAGMENT_CHAR_LIMIT = 12000;

export interface TextStats {
  words: number;
  chars: number;
}

export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  return {
    words: trimmed === "" ? 0 : trimmed.split(/\s+/u).length,
    chars: trimmed.length,
  };
}
