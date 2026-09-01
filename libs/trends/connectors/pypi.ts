import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";

const FEED_URL = "https://pypi.org/rss/packages.xml";

export const pypiConnector: Connector = {
  id: "pypi",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    const signals: RawSignal[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      signals.push({
        sourceProvider: "pypi",
        sourceType: "code",
        externalId: item.guid ?? item.link,
        canonicalUrl: item.link,
        publishedAt: item.isoDate ?? new Date().toISOString(),
        title: item.title,
        textExcerpt: item.contentSnippet,
      });
    }

    return signals;
  },
};
