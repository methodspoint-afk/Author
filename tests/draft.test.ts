import { describe, expect, it } from "vitest";
import { draftKey, shouldRestoreDraft } from "../lib/draft";

describe("автосейв черновика", () => {
  it("ключ привязан к тетради", () => {
    expect(draftKey("nb1")).toBe("irinaos:draft:nb1");
    expect(draftKey("nb1")).not.toBe(draftKey("nb2"));
  });

  it("восстанавливаем только осмысленный черновик, отличный от последней версии", () => {
    expect(shouldRestoreDraft("правка", "оригинал")).toBe(true);
    expect(shouldRestoreDraft(null, "оригинал")).toBe(false);
    expect(shouldRestoreDraft("   ", "оригинал")).toBe(false);
    expect(shouldRestoreDraft("оригинал", "оригинал")).toBe(false);
  });

  it("в пустой тетради непустой черновик восстанавливается", () => {
    expect(shouldRestoreDraft("начатый текст", undefined)).toBe(true);
  });
});
