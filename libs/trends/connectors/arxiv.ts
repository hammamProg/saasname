import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";

/** arXiv categories relevant to the product's scope (blueprint §2.1). Every
 *  result is tagged "ai" — arXiv doesn't map cleanly onto the other 11
 *  categories, and forcing it would misclassify research signals. */
const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"];
const MAX_RESULTS = 25;

export const arxivConnector: Connector = {
  id: "arxiv",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const signals: RawSignal[] = [];

    for (const category of ARXIV_CATEGORIES) {
      const url =
        `http://export.arxiv.org/api/query?search_query=cat:${category}` +
        `&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;

      try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          signals.push({
            sourceProvider: "arxiv",
            sourceType: "research",
            externalId: item.id ?? item.link,
            canonicalUrl: item.link,
            publishedAt: item.isoDate ?? new Date().toISOString(),
            title: item.title.replace(/\s+/g, " ").trim(),
            textExcerpt: item.contentSnippet,
            categoryHint: "ai",
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
