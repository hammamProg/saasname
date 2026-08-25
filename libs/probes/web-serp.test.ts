import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webSerpProbe } from "@/libs/probes/web-serp";
import { ProbeError } from "@/libs/probes/types";

const KEY = "fc-test-key";

beforeEach(() => {
  vi.stubEnv("FIRECRAWL_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function firecrawl(web: Array<{ title?: string; url?: string }>) {
  return vi.fn(
    async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { web } }),
      }) as unknown as Response
  );
}

describe("webSerpProbe", () => {
  it("is a core probe", () => {
    expect(webSerpProbe.tier).toBe("core");
    expect(webSerpProbe.id).toBe("web-serp");
  });

  it("counts results and exact title matches", async () => {
    vi.stubGlobal(
      "fetch",
      firecrawl([
        { title: "Nameloop", url: "https://nameloop.com" },
        { title: "Nameloop - Crunchbase", url: "https://crunchbase.com/x" },
        { title: "Something else", url: "https://example.com" },
      ])
    );

    const { signals } = await webSerpProbe.run("Nameloop", {});

    expect(signals.resultCount).toBe(3);
    expect(signals.exactTitleMatches).toBe(1);
  });

  it("detects an exact-name domain among the results", async () => {
    vi.stubGlobal(
      "fetch",
      firecrawl([{ title: "Home", url: "https://www.nameloop.com/pricing" }])
    );

    const { signals } = await webSerpProbe.run("Name Loop", {});

    expect(signals.hasExactDomain).toBe(true);
  });

  it("does not mistake a substring for an exact domain", async () => {
    vi.stubGlobal(
      "fetch",
      firecrawl([{ title: "x", url: "https://nameloopstudios.com" }])
    );

    const { signals } = await webSerpProbe.run("Nameloop", {});

    expect(signals.hasExactDomain).toBe(false);
  });

  it("reports an empty SERP without inventing findings", async () => {
    vi.stubGlobal("fetch", firecrawl([]));

    const { signals } = await webSerpProbe.run("Nameloop", {});

    expect(signals.resultCount).toBe(0);
    expect(signals.hasExactDomain).toBe(false);
    expect(signals.topUrl).toBeNull();
  });

  it("searches the quoted name so the engine does not loosen the match", async () => {
    const fetchMock = firecrawl([]);
    vi.stubGlobal("fetch", fetchMock);

    await webSerpProbe.run("Nameloop", {});

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe('"Nameloop"');
  });

  it("raises ProbeError when the key is missing", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");
    vi.stubGlobal("fetch", firecrawl([]));

    await expect(webSerpProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("raises ProbeError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as Response)
    );

    await expect(webSerpProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("raises ProbeError when Firecrawl reports failure in a 200 body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({ ok: true, status: 200, json: async () => ({ success: false, error: "nope" }) }) as unknown as Response
      )
    );

    await expect(webSerpProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("never leaks the API key in an error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, text: async () => `bad key ${KEY}` }) as unknown as Response)
    );

    await expect(webSerpProbe.run("Nameloop", {})).rejects.toSatisfy(
      (e: Error) => !e.message.includes(KEY)
    );
  });
});
