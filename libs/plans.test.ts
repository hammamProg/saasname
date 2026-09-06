import { describe, it, expect } from "vitest";
import { limitsForPlan, planForAccess } from "@/libs/plans";

describe("planForAccess", () => {
  it("maps a paid profile to pro and everything else to free", () => {
    expect(planForAccess(true)).toBe("pro");
    expect(planForAccess(false)).toBe("free");
  });
});

describe("limitsForPlan", () => {
  it("locks the strongest trends for free and nothing for pro", () => {
    expect(limitsForPlan("free").lockedTopN).toBeGreaterThan(0);
    expect(limitsForPlan("pro").lockedTopN).toBe(0);
  });

  it("caps free follows and leaves pro uncapped", () => {
    expect(limitsForPlan("free").followLimit).toBe(3);
    expect(limitsForPlan("pro").followLimit).toBeNull();
  });

  it("gives pro a strictly larger feed than free", () => {
    const free = limitsForPlan("free");
    const pro = limitsForPlan("pro");

    expect(pro.forYouLimit).toBeGreaterThan(free.forYouLimit);
    expect(pro.risingFastLimit).toBeGreaterThan(free.risingFastLimit);
  });

  it("still shows free users a feed — locking must not empty it", () => {
    const free = limitsForPlan("free");

    expect(free.forYouLimit).toBeGreaterThan(free.lockedTopN);
  });
});
