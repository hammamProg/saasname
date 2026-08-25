import { describe, it, expect, vi, beforeEach } from "vitest";
import { runProbe } from "@/libs/probes/run";
import { ProbeError, type PlatformProbe } from "@/libs/probes/types";

const readCache = vi.hoisted(() => vi.fn());
const writeCache = vi.hoisted(() => vi.fn());

vi.mock("@/libs/probes/cache", () => ({
  readCache,
  writeCache,
  CACHE_TTL_DAYS: 7,
}));

beforeEach(() => {
  vi.clearAllMocks();
  readCache.mockResolvedValue(null);
  writeCache.mockResolvedValue(undefined);
});

function probeOf(
  run: PlatformProbe["run"],
  overrides: Partial<PlatformProbe> = {}
): PlatformProbe {
  return { id: "test-probe", tier: "core", run, ...overrides };
}

describe("runProbe", () => {
  it("returns ok with the probe's signals", async () => {
    const probe = probeOf(async () => ({
      signals: { resultCount: 3 },
      evidenceUrl: "https://example.com",
    }));

    const settled = await runProbe(probe, "Nameloop");

    expect(settled).toMatchObject({
      platform: "test-probe",
      status: "ok",
      signals: { resultCount: 3 },
      evidenceUrl: "https://example.com",
      cached: false,
    });
  });

  it("writes the result to the cache under the normalized name", async () => {
    const probe = probeOf(async () => ({ signals: { a: 1 } }));

    await runProbe(probe, "  Name Loop ");

    expect(writeCache).toHaveBeenCalledWith("test-probe", "nameloop", {
      signals: { a: 1 },
    });
  });

  it("serves a cache hit without running the probe", async () => {
    readCache.mockResolvedValue({ signals: { cachedValue: true } });
    const run = vi.fn();
    const probe = probeOf(run);

    const settled = await runProbe(probe, "Nameloop");

    expect(run).not.toHaveBeenCalled();
    expect(settled.cached).toBe(true);
    expect(settled.signals).toEqual({ cachedValue: true });
    expect(writeCache).not.toHaveBeenCalled();
  });

  it("captures a thrown probe as failed rather than rejecting", async () => {
    // One bad source must never reject the whole run.
    const probe = probeOf(async () => {
      throw new ProbeError("registry exploded");
    });

    const settled = await runProbe(probe, "Nameloop");

    expect(settled.status).toBe("failed");
    expect(settled.error).toContain("registry exploded");
    expect(settled.signals).toEqual({});
  });

  it("does not cache a failed probe", async () => {
    const probe = probeOf(async () => {
      throw new ProbeError("nope");
    });

    await runProbe(probe, "Nameloop");

    expect(writeCache).not.toHaveBeenCalled();
  });

  it("retries once on a 5xx and succeeds", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new ProbeError("upstream", 503))
      .mockResolvedValueOnce({ signals: { ok: true } });

    const settled = await runProbe(probeOf(run), "Nameloop");

    expect(run).toHaveBeenCalledTimes(2);
    expect(settled.status).toBe("ok");
  });

  it("does not retry a 4xx", async () => {
    // A rejected key or bad request is a definite answer; retrying burns quota.
    const run = vi.fn().mockRejectedValue(new ProbeError("bad request", 400));

    const settled = await runProbe(probeOf(run), "Nameloop");

    expect(run).toHaveBeenCalledTimes(1);
    expect(settled.status).toBe("failed");
  });

  it("does not retry an error carrying no status", async () => {
    const run = vi.fn().mockRejectedValue(new ProbeError("timed out"));

    await runProbe(probeOf(run), "Nameloop");

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("fails the check when the probe exceeds its budget", async () => {
    const probe = probeOf(
      (_name, ctx) =>
        new Promise((_resolve, reject) => {
          ctx.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
      { timeoutMs: 20 }
    );

    const settled = await runProbe(probe, "Nameloop");

    expect(settled.status).toBe("failed");
    expect(settled.error).toMatch(/timed out/i);
  });

  it("honours a probe's own timeout override", async () => {
    const probe = probeOf(
      (_name, ctx) =>
        new Promise((resolve, reject) => {
          const t = setTimeout(() => resolve({ signals: { slow: true } }), 40);
          ctx.signal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new Error("aborted"));
          });
        }),
      { timeoutMs: 500 }
    );

    const settled = await runProbe(probe, "Nameloop");

    expect(settled.status).toBe("ok");
  });

  it("skips the cache entirely for a name that normalizes to nothing", async () => {
    const probe = probeOf(async () => ({ signals: {} }));

    await runProbe(probe, "!!!");

    expect(readCache).not.toHaveBeenCalled();
    expect(writeCache).not.toHaveBeenCalled();
  });
});
