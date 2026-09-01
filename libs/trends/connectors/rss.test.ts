import { describe, it, expect, vi } from "vitest";
import { rssConnector } from "@/libs/trends/connectors/rss";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("rssConnector", () => {
  it("parses every configured feed and tags items with their category hint", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "New release",
          link: "https://example.com/post",
          contentSnippet: "Details",
          isoDate: "2026-08-31T00:00:00.000Z",
          guid: "https://example.com/post",
        },
      ],
    });

    const signals = await rssConnector.fetchSignals();

    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]).toMatchObject({
      sourceProvider: "rss",
      sourceType: "news",
      title: "New release",
      canonicalUrl: "https://example.com/post",
    });
    expect(signals[0].categoryHint).toBeDefined();
  });

  it("skips a feed that fails to parse rather than throwing", async () => {
    parseURL
      .mockRejectedValueOnce(new Error("bad feed"))
      .mockResolvedValue({ items: [] });

    await expect(rssConnector.fetchSignals()).resolves.toBeDefined();
  });
});
