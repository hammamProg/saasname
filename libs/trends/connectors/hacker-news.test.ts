import { describe, it, expect, vi, beforeEach } from "vitest";
import { hackerNewsConnector } from "@/libs/trends/connectors/hacker-news";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("hackerNewsConnector", () => {
  it("fetches top story ids then maps each item into a RawSignal", async () => {
    const fetchMock = vi
      .fn()
      // topstories
      .mockResolvedValueOnce({ ok: true, json: async () => [1, 2] })
      // item 1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: "Show HN: A thing",
          url: "https://example.com/thing",
          time: 1893456000,
          score: 120,
          descendants: 30,
        }),
      })
      // item 2
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          title: "Ask HN: something",
          time: 1893456100,
          score: 5,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await hackerNewsConnector.fetchSignals();

    expect(signals).toHaveLength(2);
    expect(signals[0]).toMatchObject({
      sourceProvider: "hacker_news",
      sourceType: "launch",
      externalId: "1",
      canonicalUrl: "https://example.com/thing",
      title: "Show HN: A thing",
      engagementMetrics: { score: 120, comments: 30 },
    });
    // No url on the raw item falls back to the HN discussion page.
    expect(signals[1].canonicalUrl).toBe("https://news.ycombinator.com/item?id=2");
  });

  it("skips items that fail to fetch instead of throwing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [1] })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await hackerNewsConnector.fetchSignals();

    expect(signals).toEqual([]);
  });

  it("handles network-level errors (rejected fetch) gracefully", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [1, 2] })
      // Item 1: network error (fetch rejects)
      .mockRejectedValueOnce(new Error("Network timeout"))
      // Item 2: success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          title: "Ask HN: something",
          time: 1893456100,
          score: 5,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await hackerNewsConnector.fetchSignals();

    // Should return only the successful item, skipping the network error
    expect(signals).toHaveLength(1);
    expect(signals[0].externalId).toBe("2");
  });
});
