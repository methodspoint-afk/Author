import { describe, expect, it } from "vitest";
import { diffWords } from "../lib/diff";

describe("diffWords", () => {
  it("находит замену слова", () => {
    const parts = diffWords("она была хорошенькая", "она была прехорошенькая");
    expect(parts).toBeDefined();
    const removed = parts!.filter((part) => part.kind === "removed").map((part) => part.text);
    const added = parts!.filter((part) => part.kind === "added").map((part) => part.text);
    expect(removed.join("")).toContain("хорошенькая");
    expect(added.join("")).toContain("прехорошенькая");
  });

  it("одинаковые тексты — только same", () => {
    const parts = diffWords("тот же текст", "тот же текст");
    expect(parts!.every((part) => part.kind === "same")).toBe(true);
  });

  it("слишком большой текст — честный отказ", () => {
    const big = Array.from({ length: 4000 }, (_, index) => `слово${index}`).join(" ");
    expect(diffWords(big, big + " хвост")).toBeUndefined();
  });
});
