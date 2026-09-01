import { describe, it, expect, vi } from "vitest";
import { arxivConnector } from "@/libs/trends/connectors/arxiv";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("arxivConnector", () => {
  it("queries one Atom feed per AI-relevant category and maps entries", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "A Study of Widget Transformers",
          link: "https://arxiv.org/abs/2609.00001",
          contentSnippet: "We study widgets.",
          isoDate: "2026-08-31T00:00:00.000Z",
          id: "https://arxiv.org/abs/2609.00001",
        },
      ],
    });

    const signals = await arxivConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "arxiv",
      sourceType: "research",
      externalId: "https://arxiv.org/abs/2609.00001",
      canonicalUrl: "https://arxiv.org/abs/2609.00001",
      title: "A Study of Widget Transformers",
      categoryHint: "ai",
    });
  });

  it("skips a category that fails to parse and includes items from other categories", async () => {
    // Category 1 (cs.AI) rejects
    // Category 2 (cs.CL) resolves with an item
    // Category 3 (cs.LG) resolves with empty items
    parseURL
      .mockRejectedValueOnce(new Error("feed unavailable"))
      .mockResolvedValueOnce({
        items: [
          {
            title: "Natural Language Processing Study",
            link: "https://arxiv.org/abs/2609.00002",
            contentSnippet: "NLP research",
            isoDate: "2026-08-31T00:00:00.000Z",
            id: "https://arxiv.org/abs/2609.00002",
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    const signals = await arxivConnector.fetchSignals();

    // Verify we got the item from category 2 (cs.CL)
    expect(signals.some((s) => s.title === "Natural Language Processing Study")).toBe(true);
    // Verify the item has correct metadata
    expect(signals.find((s) => s.title === "Natural Language Processing Study")).toMatchObject({
      sourceProvider: "arxiv",
      sourceType: "research",
      categoryHint: "ai",
      canonicalUrl: "https://arxiv.org/abs/2609.00002",
    });
  });
});
