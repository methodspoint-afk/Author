import { describe, expect, it } from "vitest";
import { aiLinkLabel, DEFAULT_AI_LINK, normalizeAiLink } from "../lib/aiLink";

describe("своя ИИ у депеши", () => {
  it("нормализует адрес и достраивает схему", () => {
    expect(normalizeAiLink("https://chatgpt.com/")).toBe("https://chatgpt.com/");
    expect(normalizeAiLink("gemini.google.com/app")).toBe("https://gemini.google.com/app");
    expect(normalizeAiLink("  chat.deepseek.com  ")).toBe("https://chat.deepseek.com/");
  });

  it("мусор не проходит", () => {
    expect(normalizeAiLink("")).toBeUndefined();
    expect(normalizeAiLink("   ")).toBeUndefined();
    expect(normalizeAiLink("javascript:alert(1)")).toBeUndefined();
    expect(normalizeAiLink("просто слова")).toBeUndefined();
  });

  it("подпись — хост без www", () => {
    expect(aiLinkLabel(DEFAULT_AI_LINK)).toBe("claude.ai");
    expect(aiLinkLabel("https://www.chatgpt.com/")).toBe("chatgpt.com");
  });
});
