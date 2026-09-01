import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";
import { RSS_FEEDS } from "@/libs/trends/rss-feeds";

export const rssConnector: Connector = {
  id: "rss",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const signals: RawSignal[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const result = await parser.parseURL(feed.url);

        for (const item of result.items) {
          if (!item.title || !item.link) continue;

          signals.push({
            sourceProvider: "rss",
            sourceType: "news",
            externalId: item.guid ?? item.link,
            canonicalUrl: item.link,
            publishedAt: item.isoDate ?? new Date().toISOString(),
            title: item.title,
            textExcerpt: item.contentSnippet,
            categoryHint: feed.categoryHint,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
