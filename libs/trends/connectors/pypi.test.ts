import { describe, it, expect, vi } from "vitest";
import { pypiConnector } from "@/libs/trends/connectors/pypi";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("pypiConnector", () => {
  it("parses the PyPI new-packages RSS feed into RawSignals", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "widget-ml",
          link: "https://pypi.org/project/widget-ml/",
          contentSnippet: "Machine learning widgets",
          isoDate: "2026-08-31T10:00:00.000Z",
          guid: "https://pypi.org/project/widget-ml/",
        },
      ],
    });

    const signals = await pypiConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "pypi",
      sourceType: "code",
      externalId: "https://pypi.org/project/widget-ml/",
      canonicalUrl: "https://pypi.org/project/widget-ml/",
      title: "widget-ml",
      textExcerpt: "Machine learning widgets",
    });
  });
});
