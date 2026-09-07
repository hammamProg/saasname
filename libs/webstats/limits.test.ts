import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  overBurstLimit,
  overMonthlyQuota,
  resetLimitsForTest,
} from "./limits";

beforeEach(() => resetLimitsForTest());

describe("overBurstLimit", () => {
  it("allows traffic under the limit", () => {
    for (let i = 0; i < 120; i += 1) {
      expect(overBurstLimit("1.2.3.4")).toBe(false);
    }
  });

  it("blocks once the limit is passed", () => {
    for (let i = 0; i < 120; i += 1) overBurstLimit("1.2.3.4");

    expect(overBurstLimit("1.2.3.4")).toBe(true);
  });

  it("counts each address separately", () => {
    for (let i = 0; i < 200; i += 1) overBurstLimit("1.2.3.4");

    expect(overBurstLimit("5.6.7.8")).toBe(false);
  });

  it("lets an address through again in the next window", () => {
    const start = 1_000_000;
    for (let i = 0; i < 200; i += 1) overBurstLimit("1.2.3.4", start);

    expect(overBurstLimit("1.2.3.4", start)).toBe(true);
    expect(overBurstLimit("1.2.3.4", start + 60_001)).toBe(false);
  });
});

function admin(used: number | null, error?: string) {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: used,
      error: error ? { message: error } : null,
    }),
  } as never;
}

describe("overMonthlyQuota", () => {
  it("is under quota below the limit", async () => {
    expect(await overMonthlyQuota(admin(9_999), "site", 10_000)).toBe(false);
  });

  it("is over quota at the limit", async () => {
    // The limit is what the plan includes, so reaching it means it is used up.
    expect(await overMonthlyQuota(admin(10_000), "site", 10_000)).toBe(true);
  });

  it("caches the verdict rather than querying per beacon", async () => {
    const client = admin(0);

    await overMonthlyQuota(client, "site", 10_000);
    await overMonthlyQuota(client, "site", 10_000);
    await overMonthlyQuota(client, "site", 10_000);

    expect((client as unknown as { rpc: { mock: { calls: unknown[] } } }).rpc.mock.calls)
      .toHaveLength(1);
  });

  it("re-checks once the cache expires", async () => {
    const client = admin(0);
    const start = 5_000_000;

    await overMonthlyQuota(client, "site", 10_000, start);
    await overMonthlyQuota(client, "site", 10_000, start + 60_001);

    expect((client as unknown as { rpc: { mock: { calls: unknown[] } } }).rpc.mock.calls)
      .toHaveLength(2);
  });

  it("keeps sites separate", async () => {
    const client = admin(20_000);

    expect(await overMonthlyQuota(client, "a", 10_000)).toBe(true);
    expect(await overMonthlyQuota(client, "b", 100_000)).toBe(false);
  });

  it("fails open when the check itself errors", async () => {
    // Dropping a customer's data because our own quota query broke is worse
    // than briefly serving past a limit.
    expect(await overMonthlyQuota(admin(null, "boom"), "site", 10)).toBe(false);
  });
});
