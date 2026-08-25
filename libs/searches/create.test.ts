import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearch, CONCURRENCY } from "@/libs/searches/create";
import { InsufficientCreditsError } from "@/libs/credits/errors";
import { ProbeError, type PlatformProbe } from "@/libs/probes/types";

const spendCredits = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const inserted = vi.hoisted(() => ({ checks: [] as Record<string, unknown>[] }));
const updates = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));

vi.mock("@/libs/credits/spend", () => ({ spendCredits }));
vi.mock("@/libs/probes/cache", () => ({
  readCache: vi.fn().mockResolvedValue(null),
  writeCache: vi.fn().mockResolvedValue(undefined),
  CACHE_TTL_DAYS: 7,
}));

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({
    rpc,
    from(table: string) {
      return {
        insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
          if (table === "checks") {
            inserted.checks.push(...(payload as Record<string, unknown>[]));
            return Promise.resolve({ data: null, error: null });
          }
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "search-1" }, error: null }),
              then: (resolve: (v: unknown) => void) =>
                resolve({
                  data: (payload as Record<string, unknown>[]).map((c, i) => ({
                    id: `cand-${i}`,
                    name: c.name,
                    normalized_name: c.normalized_name,
                  })),
                  error: null,
                }),
            }),
          };
        },
        update(payload: Record<string, unknown>) {
          updates.last = payload;
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
      };
    },
  }),
}));

function probe(id: string, run: PlatformProbe["run"]): PlatformProbe {
  return { id, tier: "core", run };
}

const okProbe = (id: string) => probe(id, async () => ({ signals: { ok: true } }));
const failProbe = (id: string) =>
  probe(id, async () => {
    throw new ProbeError(`${id} down`);
  });

const base = {
  userId: "user-1",
  mode: "generate" as const,
  targetPlatform: "web" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  inserted.checks = [];
  updates.last = null;
  spendCredits.mockResolvedValue(10);
  rpc.mockResolvedValue({ data: 1, error: null });
});

describe("createSearch", () => {
  it("spends one credit per candidate", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }, { name: "Beta" }, { name: "Gamma" }],
      probes: [okProbe("p1")],
    });

    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", amount: 3 })
    );
  });

  it("de-duplicates candidates by normalized name before charging", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Data Flow" }, { name: "data-flow" }, { name: "Other" }],
      probes: [okProbe("p1")],
    });

    expect(spendCredits).toHaveBeenCalledWith(expect.objectContaining({ amount: 2 }));
  });

  it("propagates InsufficientCreditsError without writing anything", async () => {
    spendCredits.mockRejectedValue(new InsufficientCreditsError());

    await expect(
      createSearch({ ...base, candidates: [{ name: "Alpha" }], probes: [okProbe("p1")] })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);

    expect(inserted.checks).toHaveLength(0);
  });

  it("refunds nothing when every core probe succeeds", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }, { name: "Beta" }],
      probes: [okProbe("p1"), okProbe("p2")],
    });

    expect(rpc).not.toHaveBeenCalled();
    expect(updates.last).toMatchObject({ status: "complete" });
  });

  it("refunds exactly one credit per candidate whose core probe failed", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }, { name: "Beta" }],
      probes: [okProbe("p1"), failProbe("p2")],
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    for (const call of rpc.mock.calls) {
      expect(call[0]).toBe("grant_credits");
      expect(call[1]).toMatchObject({ p_user_id: "user-1", p_amount: 1 });
      expect(String(call[1].p_reason)).toMatch(/^refund:search-1:/);
    }
  });

  it("marks the search failed only when every candidate was refunded", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }],
      probes: [failProbe("p1")],
    });

    expect(updates.last).toMatchObject({ status: "failed" });
  });

  it("records a failed check with its reason rather than empty success", async () => {
    await createSearch({
      ...base,
      candidates: [{ name: "Alpha" }],
      probes: [failProbe("p1")],
    });

    expect(inserted.checks[0]).toMatchObject({
      platform: "p1",
      status: "failed",
    });
    expect(String(inserted.checks[0].error)).toContain("p1 down");
  });

  it("trips the circuit breaker and skips the rest of that platform", async () => {
    const run = vi.fn().mockRejectedValue(new ProbeError("always down"));

    // Needs more tasks than the concurrency cap. The breaker can only skip work
    // that has not started yet, so with 6 or fewer tasks everything is already
    // in flight before the third failure is recorded.
    await createSearch({
      ...base,
      candidates: Array.from({ length: 8 }, (_v, i) => ({ name: `Name${i}` })),
      probes: [probe("flaky", run)],
    });

    const skipped = inserted.checks.filter((c) => c.status === "skipped");
    expect(skipped.length).toBeGreaterThan(0);
    expect(run.mock.calls.length).toBeLessThan(8);
  });

  it("never runs more than the concurrency cap at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const slow = probe("slow", async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return { signals: {} };
    });

    await createSearch({
      ...base,
      candidates: Array.from({ length: 8 }, (_v, i) => ({ name: `Name${i}` })),
      probes: [slow],
    });

    expect(peak).toBeLessThanOrEqual(CONCURRENCY);
  });

  it("rejects when no candidate is usable", async () => {
    await expect(
      createSearch({ ...base, candidates: [{ name: "!!!" }], probes: [okProbe("p1")] })
    ).rejects.toThrow(/No usable candidates/);

    expect(spendCredits).not.toHaveBeenCalled();
  });
});
