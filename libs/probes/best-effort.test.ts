import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { socialsProbe, SOCIAL_PLATFORMS } from "@/libs/probes/socials";
import { trademarkProbe } from "@/libs/probes/trademark";
import { googlePlayProbe } from "@/libs/probes/google-play";
import { ProbeError } from "@/libs/probes/types";

beforeEach(() => {
  vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("socialsProbe", () => {
  it("is best-effort, so its failure never costs a credit", () => {
    expect(socialsProbe.tier).toBe("best_effort");
  });

  it("omits platforms that cannot distinguish a free handle", () => {
    // Instagram and TikTok return an identical wall for both cases.
    const keys = SOCIAL_PLATFORMS.map((p) => p.key);
    expect(keys).not.toContain("instagram");
    expect(keys).not.toContain("tiktok");
  });

  it("reads 404 as available and 200 as taken", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      ({ status: url.includes("github") ? 404 : 200 }) as unknown as Response
    ));

    const { signals } = await socialsProbe.run("Nameloop", {});

    expect(signals.github).toBe("available");
    expect(signals.x).toBe("taken");
  });

  it("treats a LinkedIn 301 alias redirect as taken, not an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 301 }) as unknown as Response));

    const { signals } = await socialsProbe.run("Nameloop", {});

    expect(signals.linkedin).toBe("taken");
  });

  it("does not follow redirects, which would lose the alias signal", async () => {
    const fetchMock = vi.fn(async () => ({ status: 200 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await socialsProbe.run("Nameloop", {});

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.redirect).toBe("manual");
  });

  it("maps a throttle or block to unknown, never to available", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      ({ status: url.includes("github") ? 429 : 404 }) as unknown as Response
    ));

    const { signals } = await socialsProbe.run("Nameloop", {});

    expect(signals.github).toBe("unknown");
    expect(signals.x).toBe("available");
  });

  it("fails when no platform could be reached at all", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    await expect(socialsProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });
});

function tmResponse(live: number, dead: number, hits: unknown[] = []) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      hits: { totalValue: live + dead, hits },
      aggregations: {
        alive: {
          buckets: [
            { key_as_string: "true", doc_count: live },
            { key_as_string: "false", doc_count: dead },
          ],
        },
      },
    }),
  }) as unknown as Response);
}

describe("trademarkProbe", () => {
  it("is best-effort despite being the hardest blocker", () => {
    expect(trademarkProbe.tier).toBe("best_effort");
  });

  it("counts live and dead marks separately", async () => {
    vi.stubGlobal("fetch", tmResponse(37, 78));

    const { signals } = await trademarkProbe.run("Slack", {});

    expect(signals.exactMarks).toBe(115);
    expect(signals.liveMarks).toBe(37);
    expect(signals.deadMarks).toBe(78);
  });

  it("flags a live mark sitting in a software class", async () => {
    vi.stubGlobal(
      "fetch",
      tmResponse(1, 0, [
        { source: { wordmark: "NAMELOOP", alive: true, internationalClass: ["IC 042"], ownerName: ["Acme"] } },
      ])
    );

    const { signals } = await trademarkProbe.run("Nameloop", {});

    expect(signals.liveInSoftwareClass).toBe(true);
    expect(signals.topOwner).toBe("Acme");
  });

  it("does not flag a live mark in an unrelated class", async () => {
    vi.stubGlobal(
      "fetch",
      tmResponse(1, 0, [
        { source: { wordmark: "NAMELOOP", alive: true, internationalClass: ["IC 025"] } },
      ])
    );

    const { signals } = await trademarkProbe.run("Nameloop", {});

    expect(signals.liveInSoftwareClass).toBe(false);
  });

  it("ignores dead marks when picking the headline", async () => {
    vi.stubGlobal(
      "fetch",
      tmResponse(0, 2, [
        { source: { wordmark: "OLD", alive: false, internationalClass: ["IC 042"] } },
      ])
    );

    const { signals } = await trademarkProbe.run("Nameloop", {});

    expect(signals.liveInSoftwareClass).toBe(false);
    expect(signals.topWordmark).toBeUndefined();
  });

  it("fails rather than reporting no conflict on an unreadable response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ garbage: true }) }) as unknown as Response)
    );

    await expect(trademarkProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("fails on a non-2xx rather than reporting no conflict", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response));

    await expect(trademarkProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });
});

function fcScrape(markdown: string, statusCode = 200) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { markdown, metadata: { statusCode } } }),
  }) as unknown as Response);
}

describe("googlePlayProbe", () => {
  it("is best-effort", () => {
    expect(googlePlayProbe.tier).toBe("best_effort");
  });

  it("detects an exact-name app among the results", async () => {
    vi.stubGlobal("fetch", fcScrape("[Nameloop](https://play.google.com/x) [Other App](https://y)"));

    const { signals } = await googlePlayProbe.run("Nameloop", {});

    expect(signals.exactMatch).toBe(true);
    expect(signals.topTitle).toBe("Nameloop");
  });

  it("matches a Name: tagline listing", async () => {
    vi.stubGlobal("fetch", fcScrape("[Nameloop: find your name](https://play.google.com/x)"));

    expect((await googlePlayProbe.run("Nameloop", {})).signals.exactMatch).toBe(true);
  });

  it("reports no match without inventing one", async () => {
    vi.stubGlobal("fetch", fcScrape("[Something Else](https://y)"));

    expect((await googlePlayProbe.run("Nameloop", {})).signals.exactMatch).toBe(false);
  });

  it("fails when the upstream page did not return 200", async () => {
    // Firecrawl answers 200 with a body even when Play 404s. Trusting its own
    // status would read a missing page as an empty result set.
    vi.stubGlobal("fetch", fcScrape("", 404));

    await expect(googlePlayProbe.run("Nameloop", {})).rejects.toThrow(/404/);
  });

  it("fails when the key is missing", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");

    await expect(googlePlayProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });
});
