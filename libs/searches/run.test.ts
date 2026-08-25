import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSearchProbes, CONCURRENCY, STALE_RUN_MS } from "@/libs/searches/run";
import { createFakeAdmin, emptyDb, resetIds, type FakeDb } from "@/libs/searches/fake-admin";
import { ProbeError, type PlatformProbe } from "@/libs/probes/types";

const db = vi.hoisted(() => ({ current: null as unknown as FakeDb }));

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => createFakeAdmin(db.current),
}));
vi.mock("@/libs/probes/cache", () => ({
  readCache: vi.fn().mockResolvedValue(null),
  writeCache: vi.fn().mockResolvedValue(undefined),
  CACHE_TTL_DAYS: 7,
}));
vi.mock("@/libs/llm/deepseek", () => ({
  isDeepSeekConfigured: () => false,
  createDeepSeekProvider: () => {
    throw new Error("should not be called");
  },
}));

function seed(names: string[], platforms: string[]) {
  const database = emptyDb();
  database.searches.push({
    id: "search-1",
    user_id: "user-1",
    target_platform: "web",
    status: "pending",
  });
  names.forEach((name, i) => {
    const id = `cand-${i}`;
    database.candidates.push({
      id,
      search_id: "search-1",
      name,
      normalized_name: name.toLowerCase(),
    });
    platforms.forEach((platform) =>
      database.checks.push({ candidate_id: id, platform, status: "pending", signals: {} })
    );
  });
  return database;
}

const okProbe = (id: string): PlatformProbe => ({
  id,
  tier: "core",
  run: async () => ({ signals: { exactMatch: false } }),
});

const failProbe = (id: string, tier: "core" | "best_effort" = "core"): PlatformProbe => ({
  id,
  tier,
  run: async () => {
    throw new ProbeError(`${id} down`);
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  resetIds();
});

describe("runSearchProbes", () => {
  it("marks every check settled and closes the search", async () => {
    db.current = seed(["Alpha", "Beta"], ["p1"]);

    await runSearchProbes("search-1", undefined, [okProbe("p1")]);

    expect(db.current.checks.every((c) => c.status === "ok")).toBe(true);
    expect(db.current.searches[0].status).toBe("complete");
  });

  it("records a verdict on each check and each candidate", async () => {
    db.current = seed(["Alpha"], ["app-store"]);

    await runSearchProbes("search-1", undefined, [okProbe("app-store")]);

    expect(db.current.checks[0].verdict).toBe("clear");
    expect(db.current.candidates[0].verdict).toBeDefined();
  });

  it("refunds one credit per candidate whose core probe failed", async () => {
    db.current = seed(["Alpha", "Beta"], ["p1"]);

    await runSearchProbes("search-1", undefined, [failProbe("p1")]);

    const refunds = db.current.rpcCalls.filter((c) => c.name === "grant_credits");
    expect(refunds).toHaveLength(2);
    expect(String(refunds[0].args.p_reason)).toMatch(/^refund:search-1:/);
  });

  it("does not refund when only a best-effort probe failed", async () => {
    // A best-effort probe that could not answer is expected behaviour, not a
    // service failure the user paid for.
    db.current = seed(["Alpha"], ["p1", "p2"]);

    await runSearchProbes("search-1", undefined, [
      okProbe("p1"),
      failProbe("p2", "best_effort"),
    ]);

    expect(db.current.rpcCalls).toHaveLength(0);
    expect(db.current.searches[0].status).toBe("complete");
  });

  it("marks the search failed only when every candidate was refunded", async () => {
    db.current = seed(["Alpha"], ["p1"]);

    await runSearchProbes("search-1", undefined, [failProbe("p1")]);

    expect(db.current.searches[0].status).toBe("failed");
  });

  it("emits progress for each settled check and a final done event", async () => {
    db.current = seed(["Alpha", "Beta"], ["p1"]);
    const events: unknown[] = [];

    await runSearchProbes("search-1", (e) => events.push(e), [okProbe("p1")]);

    expect(events.filter((e) => (e as { type: string }).type === "check")).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({ type: "done", searchId: "search-1" });
  });

  it("refuses to re-run a finished search", async () => {
    // Two clients opening the stream must not double-charge or double-refund.
    db.current = seed(["Alpha"], ["p1"]);
    db.current.searches[0].status = "complete";
    const run = vi.fn();

    await runSearchProbes("search-1", undefined, [{ id: "p1", tier: "core", run }]);

    expect(run).not.toHaveBeenCalled();
  });

  it("trips the circuit breaker and skips the remainder of that platform", async () => {
    const run = vi.fn().mockRejectedValue(new ProbeError("always down"));
    db.current = seed(
      Array.from({ length: 8 }, (_v, i) => `Name${i}`),
      ["flaky"]
    );

    await runSearchProbes("search-1", undefined, [{ id: "flaky", tier: "core", run }]);

    expect(db.current.checks.filter((c) => c.status === "skipped").length).toBeGreaterThan(0);
    expect(run.mock.calls.length).toBeLessThan(8);
  });

  it("never exceeds the concurrency cap", async () => {
    let inFlight = 0;
    let peak = 0;
    db.current = seed(Array.from({ length: 8 }, (_v, i) => `Name${i}`), ["slow"]);

    await runSearchProbes("search-1", undefined, [
      {
        id: "slow",
        tier: "core",
        run: async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((r) => setTimeout(r, 5));
          inFlight -= 1;
          return { signals: {} };
        },
      },
    ]);

    expect(peak).toBeLessThanOrEqual(CONCURRENCY);
  });

  it("throws for a search that does not exist", async () => {
    db.current = emptyDb();

    await expect(runSearchProbes("nope")).rejects.toThrow(/not found/);
  });
});

describe("concurrent run protection", () => {
  it("leaves a run that is already in flight alone", async () => {
    // Two tabs on the same report would otherwise double the API spend.
    db.current = seed(["Alpha"], ["p1"]);
    db.current.searches[0].status = "running";
    db.current.searches[0].updated_at = new Date().toISOString();
    const run = vi.fn();

    await runSearchProbes("search-1", undefined, [{ id: "p1", tier: "core", run }]);

    expect(run).not.toHaveBeenCalled();
  });

  it("resumes a run that has gone quiet long enough to be dead", async () => {
    // Otherwise a crashed run leaves the search stuck forever.
    db.current = seed(["Alpha"], ["p1"]);
    db.current.searches[0].status = "running";
    db.current.searches[0].updated_at = new Date(Date.now() - STALE_RUN_MS - 1000).toISOString();

    await runSearchProbes("search-1", undefined, [okProbe("p1")]);

    expect(db.current.checks[0].status).toBe("ok");
  });
});
