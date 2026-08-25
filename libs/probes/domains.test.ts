import { describe, it, expect, vi, afterEach } from "vitest";
import { domainsProbe } from "@/libs/probes/domains";
import { ProbeError } from "@/libs/probes/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function respondPerUrl(map: Record<string, number>) {
  return vi.fn(async (url: string) => {
    const tld = url.slice(url.lastIndexOf(".") + 1);
    const status = map[tld] ?? 404;
    if (status === 200) {
      return {
        ok: true,
        status,
        json: async () => ({
          ldhName: "EXAMPLE.COM",
          events: [
            { eventAction: "registration", eventDate: "1997-09-15T04:00:00Z" },
            { eventAction: "expiration", eventDate: "2028-09-14T04:00:00Z" },
          ],
        }),
      } as unknown as Response;
    }
    return { ok: false, status, json: async () => ({}) } as unknown as Response;
  });
}

describe("domainsProbe", () => {
  it("is a core probe", () => {
    expect(domainsProbe.tier).toBe("core");
    expect(domainsProbe.id).toBe("domains");
  });

  it("reports 404 as available and 200 as taken", async () => {
    vi.stubGlobal("fetch", respondPerUrl({ com: 200, io: 404, ai: 404, dev: 404, app: 200 }));

    const { signals } = await domainsProbe.run("NameLoop", {});

    expect(signals.com).toBe("taken");
    expect(signals.io).toBe("available");
    expect(signals.ai).toBe("available");
    expect(signals.dev).toBe("available");
    expect(signals.app).toBe("taken");
  });

  it("queries the normalized name, so spacing and case cannot change the answer", async () => {
    const fetchMock = respondPerUrl({ com: 404, io: 404, ai: 404, dev: 404, app: 404 });
    vi.stubGlobal("fetch", fetchMock);

    await domainsProbe.run("  Name Loop  ", {});

    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.endsWith("/domain/nameloop.com"))).toBe(true);
    expect(urls.every((u) => !u.includes(" "))).toBe(true);
  });

  it("reports unknown, never available, when a registry returns 5xx", async () => {
    vi.stubGlobal("fetch", respondPerUrl({ com: 503, io: 404, ai: 404, dev: 404, app: 404 }));

    const { signals } = await domainsProbe.run("NameLoop", {});

    expect(signals.com).toBe("unknown");
  });

  it("reports unknown, never available, when a request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(".com")) throw new Error("network down");
        return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      })
    );

    const { signals } = await domainsProbe.run("NameLoop", {});

    expect(signals.com).toBe("unknown");
    expect(signals.io).toBe("available");
  });

  it("captures the .com registration and expiration dates for later recency scoring", async () => {
    vi.stubGlobal("fetch", respondPerUrl({ com: 200, io: 404, ai: 404, dev: 404, app: 404 }));

    const { signals } = await domainsProbe.run("NameLoop", {});

    expect(signals.comRegisteredAt).toBe("1997-09-15T04:00:00Z");
    expect(signals.comExpiresAt).toBe("2028-09-14T04:00:00Z");
  });

  it("omits the date signals when the .com is available", async () => {
    vi.stubGlobal("fetch", respondPerUrl({ com: 404, io: 404, ai: 404, dev: 404, app: 404 }));

    const { signals } = await domainsProbe.run("NameLoop", {});

    expect(signals.comRegisteredAt).toBeUndefined();
  });

  it("fails the check when every registry was unreachable", async () => {
    // All-unknown means we charged a credit for a check we could not perform.
    // Failing here refunds it rather than presenting five shrugs as a result.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    await expect(domainsProbe.run("NameLoop", {})).rejects.toBeInstanceOf(ProbeError);
  });

  it("rejects a name that normalizes to nothing", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(domainsProbe.run("!!!", {})).rejects.toBeInstanceOf(ProbeError);
  });
});
