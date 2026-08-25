import { describe, it, expect, vi, afterEach } from "vitest";
import { appStoreProbe } from "@/libs/probes/app-store";
import { ProbeError } from "@/libs/probes/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function itunes(results: Array<Record<string, unknown>>) {
  return vi.fn(
    async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ resultCount: results.length, results }),
      }) as unknown as Response
  );
}

const notion = {
  trackName: "Notion: Notes, Tasks, AI",
  sellerName: "Notion Labs, Incorporated",
  userRatingCount: 89864,
  averageUserRating: 4.77,
  currentVersionReleaseDate: "2026-08-25T12:00:00Z",
  trackViewUrl: "https://apps.apple.com/app/id577135059",
};

const exactNameloop = {
  trackName: "Nameloop",
  sellerName: "Someone Ltd",
  userRatingCount: 12,
  averageUserRating: 3.2,
  currentVersionReleaseDate: "2016-04-02T12:00:00Z",
  trackViewUrl: "https://apps.apple.com/app/id111",
};

describe("appStoreProbe", () => {
  it("is a core probe", () => {
    expect(appStoreProbe.tier).toBe("core");
    expect(appStoreProbe.id).toBe("app-store");
  });

  it("counts results and reports no exact match when none of the titles match", async () => {
    vi.stubGlobal("fetch", itunes([notion]));

    const { signals } = await appStoreProbe.run("Nameloop", {});

    expect(signals.resultCount).toBe(1);
    expect(signals.exactMatch).toBe(false);
  });

  it("extracts the incumbent's strength signals from an exact match", async () => {
    vi.stubGlobal("fetch", itunes([notion, exactNameloop]));

    const { signals, evidenceUrl } = await appStoreProbe.run("Nameloop", {});

    expect(signals.exactMatch).toBe(true);
    expect(signals.topRatingCount).toBe(12);
    expect(signals.topRatingAverage).toBe(3.2);
    expect(signals.topLastUpdated).toBe("2016-04-02T12:00:00Z");
    expect(signals.topSeller).toBe("Someone Ltd");
    expect(evidenceUrl).toBe("https://apps.apple.com/app/id111");
  });

  it("matches a \"Name: tagline\" title, which is how most apps are listed", async () => {
    // A live query for "Notion" returns "Notion: Notes, Tasks, AI". Comparing
    // only the whole title would report no exact match on the very incumbent
    // the user needs to know about.
    vi.stubGlobal("fetch", itunes([notion]));

    const { signals } = await appStoreProbe.run("Notion", {});

    expect(signals.exactMatch).toBe(true);
    expect(signals.topRatingCount).toBe(89864);
  });

  it("matches a \"Name - tagline\" title too", async () => {
    vi.stubGlobal("fetch", itunes([{ ...exactNameloop, trackName: "Nameloop - the naming app" }]));

    const { signals } = await appStoreProbe.run("Nameloop", {});

    expect(signals.exactMatch).toBe(true);
  });

  it("does not match when only a prefix of the leading segment matches", async () => {
    vi.stubGlobal("fetch", itunes([{ ...exactNameloop, trackName: "Nameloopy: close but no" }]));

    const { signals } = await appStoreProbe.run("Nameloop", {});

    expect(signals.exactMatch).toBe(false);
  });

  it("matches titles ignoring case, spacing and punctuation", async () => {
    vi.stubGlobal("fetch", itunes([{ ...exactNameloop, trackName: "  name-LOOP " }]));

    const { signals } = await appStoreProbe.run("NameLoop", {});

    expect(signals.exactMatch).toBe(true);
  });

  it("handles an empty catalogue without inventing an incumbent", async () => {
    vi.stubGlobal("fetch", itunes([]));

    const { signals } = await appStoreProbe.run("Nameloop", {});

    expect(signals.resultCount).toBe(0);
    expect(signals.exactMatch).toBe(false);
    expect(signals.topRatingCount).toBeUndefined();
  });

  it("raises ProbeError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response)
    );

    await expect(appStoreProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("raises ProbeError when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    await expect(appStoreProbe.run("Nameloop", {})).rejects.toBeInstanceOf(ProbeError);
  });
});
