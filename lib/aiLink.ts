// Куда автор носит депеши (ТЗ §6.4: ручная доставка — «вы сами носите депеши
// в свою ИИ»). Система не навязывает конкретную ИИ: адрес хранится в браузере
// автора, по умолчанию — claude.ai. Ключ у нас не хранится никогда.

export const AI_LINK_KEY = "irinaos:ai-link";
export const DEFAULT_AI_LINK = "https://claude.ai/new";

/** Нормализация адреса: только http(s), схема достраивается. Мусор — undefined. */
export function normalizeAiLink(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const withScheme = /^https?:\/\//u.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Подпись ссылки — хост без www: claude.ai, chatgpt.com, gemini.google.com… */
export function aiLinkLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./u, "");
  } catch {
    return href;
  }
}
