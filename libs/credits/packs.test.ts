import { describe, it, expect } from "vitest";
import { getCreditPacks, creditsForPriceId } from "@/libs/credits/packs";

describe("getCreditPacks", () => {
  it("returns only packs that have a configured price ID", () => {
    const packs = getCreditPacks();
    expect(packs.every((p) => p.priceId.length > 0)).toBe(true);
  });

  it("never returns a pack with a non-positive credit count", () => {
    expect(getCreditPacks().every((p) => p.credits > 0)).toBe(true);
  });
});

describe("creditsForPriceId", () => {
  it("returns null for an unknown price ID", () => {
    expect(creditsForPriceId("pri_does_not_exist")).toBeNull();
  });

  it("returns null for an empty price ID", () => {
    expect(creditsForPriceId("")).toBeNull();
  });
});
