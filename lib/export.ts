import type { FragmentVersion, Notebook } from "./types";

// Экспорт тетради без тяжёлых зависимостей: Word — через RTF (Word открывает
// нативно, кириллица через \u-эскейпы), TXT — простой текст, PDF — печатью
// браузера. Экспортируем чистовик: заголовок + финальная версия фрагмента.

export interface Manuscript {
  title: string;
  body: string;
}

export function buildManuscript(notebook: Notebook, versions: FragmentVersion[]): Manuscript {
  const byId = new Map(versions.map((version) => [version.id, version]));
  const ordered = notebook.versionIds
    .map((id) => byId.get(id))
    .filter((version): version is FragmentVersion => version !== undefined);
  const last = ordered[ordered.length - 1];
  return { title: notebook.title, body: last?.text ?? "" };
}

/** Плоский текст: заголовок, пустая строка, тело. */
export function toPlainText({ title, body }: Manuscript): string {
  return body.trim() === "" ? `${title}\n` : `${title}\n\n${body}\n`;
}

/** Экранирование одной строки текста в RTF (кириллица — как \uN?). */
function rtfEscape(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const ch = text[i];
    if (ch === "\\") out += "\\\\";
    else if (ch === "{") out += "\\{";
    else if (ch === "}") out += "\\}";
    else if (ch === "\n") out += "\\par\n";
    else if (ch === "\r") continue;
    else if (code > 127) {
      // RTF \u принимает знаковое 16-битное число; ? — ASCII-замена для старых читалок.
      const signed = code > 32767 ? code - 65536 : code;
      out += `\\u${signed}?`;
    } else out += ch;
  }
  return out;
}

/** RTF-документ: заголовок жирным, затем тело абзацами. Шрифт — Georgia. */
export function toRtf({ title, body }: Manuscript): string {
  const head = `{\\b\\fs32 ${rtfEscape(title)}}\\par\\par`;
  const text = body.trim() === "" ? "" : `${rtfEscape(body)}\\par`;
  return `{\\rtf1\\ansi\\ansicpg1251\\deff0{\\fonttbl{\\f0 Georgia;}}\\f0\\fs24\n${head}\n${text}\n}`;
}

/** Безопасное имя файла из заголовка: только буквы/цифры/пробел-дефис. */
export function safeFileName(title: string, ext: string): string {
  const base = title
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 60);
  return `${base === "" ? "тетрадь" : base}.${ext}`;
}
