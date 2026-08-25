import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearch } from "@/libs/searches/create";
import { InsufficientCreditsError } from "@/libs/credits/errors";
import { createFakeAdmin, emptyDb, resetIds, type FakeDb } from "@/libs/searches/fake-admin";
import type { PlatformProbe } from "@/libs/probes/types";

const spendCredits = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({ current: null as unknown as FakeDb }));

vi.mock("@/libs/credits/spend", () => ({ spendCredits }));
vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => createFakeAdmin(db.current),
}));

const probe = (id: string): PlatformProbe => ({
  id,
  tier: "core",
  run: async () => ({ signals: {} }),
});

const base = {
  userId: "user-1",
  mode: "generate" as const,
  targetPlatform: "web" as const,
  probes: [probe("p1"), probe("p2")],
};

beforeEach(() => {
  vi.clearAllMocks();
  resetIds();
  db.current = emptyDb();
  spendCredits.mockResolvedValue(10);
});

describe("createSearch", () => {
  it("spends one credit per candidate", async () => {
    await createSearch({ ...base, candidates: [{ name: "Alpha" }, { name: "Beta" }] });

    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", amount: 2 })
    );
  });

  it("de-duplicates by normalized name before charging", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Data Flow" }, { name: "data-flow" }, { name: "Other" }],
    });

    expect(spendCredits).toHaveBeenCalledWith(expect.objectContaining({ amount: 2 }));
    expect(db.current.candidates).toHaveLength(2);
  });

  it("writes one pending check per candidate and platform", async () => {
    const { total } = await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }, { name: "Beta" }],
    });

    expect(total).toBe(4);
    expect(db.current.checks).toHaveLength(4);
    expect(db.current.checks.every((c) => c.status === "pending")).toBe(true);
  });

  it("leaves the search pending, since it runs no probes itself", async () => {
    await createSearch({ ...base, candidates: [{ name: "Alpha" }] });

    expect(db.current.searches[0].status).toBe("pending");
  });

  it("runs no probes at all", async () => {
    const run = vi.fn();
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }],
      probes: [{ id: "p1", tier: "core", run }],
    });

    expect(run).not.toHaveBeenCalled();
  });

  it("propagates InsufficientCreditsError without writing anything", async () => {
    spendCredits.mockRejectedValue(new InsufficientCreditsError());

    await expect(
      createSearch({ ...base, candidates: [{ name: "Alpha" }] })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);

    expect(db.current.searches).toHaveLength(0);
    expect(db.current.checks).toHaveLength(0);
  });

  it("caps the batch at the maximum", async () => {
    await createSearch({
      ...base,
      candidates: Array.from({ length: 20 }, (_v, i) => ({ name: `Name${i}` })),
    });

    expect(spendCredits).toHaveBeenCalledWith(expect.objectContaining({ amount: 8 }));
  });

  it("rejects when nothing usable was submitted, before charging", async () => {
    await expect(
      createSearch({ ...base, candidates: [{ name: "!!!" }] })
    ).rejects.toThrow(/No usable candidates/);

    expect(spendCredits).not.toHaveBeenCalled();
  });
});
