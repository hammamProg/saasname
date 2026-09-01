import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type SeQuestion = {
  question_id: number;
  title: string;
  link: string;
  creation_date: number;
  score: number;
  answer_count: number;
  view_count: number;
};

export const stackExchangeConnector: Connector = {
  id: "stack_exchange",

  async fetchSignals(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    for (const category of CATEGORY_SLUGS) {
      const tag = encodeURIComponent(
        CATEGORY_SEED_QUERIES[category][0].split(" ")[0]
      );
      const url =
        `https://api.stackexchange.com/2.3/questions?order=desc&sort=activity` +
        `&tagged=${tag}&site=stackoverflow&pagesize=10`;

      try {
        // Modern fetch (undici) decodes the API's gzip response transparently.
        const response = await fetch(url);
        if (!response.ok) continue;

        const body = (await response.json()) as { items: SeQuestion[] };

        // Minimal runtime validation: ensure items is an array
        if (!Array.isArray(body.items)) {
          continue;
        }

        for (const item of body.items) {
          signals.push({
            sourceProvider: "stack_exchange",
            sourceType: "search",
            externalId: String(item.question_id),
            canonicalUrl: item.link,
            publishedAt: new Date(item.creation_date * 1000).toISOString(),
            title: item.title,
            engagementMetrics: {
              score: item.score,
              answers: item.answer_count,
              views: item.view_count,
            },
            categoryHint: category,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
