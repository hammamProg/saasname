import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type NpmSearchResult = {
  objects: Array<{
    package: {
      name: string;
      description?: string;
      date: string;
      links: { npm?: string };
    };
    score: { detail: { popularity: number } };
  }>;
};

export const npmConnector: Connector = {
  id: "npm",

  async fetchSignals(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    for (const category of CATEGORY_SLUGS) {
      const text = encodeURIComponent(CATEGORY_SEED_QUERIES[category][0]);
      const url = `https://registry.npmjs.org/-/v1/search?text=${text}&size=10&popularity=1.0`;

      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const body = (await response.json()) as NpmSearchResult;

        // Minimal runtime validation: ensure objects is an array
        if (!Array.isArray(body.objects)) {
          continue;
        }

        for (const entry of body.objects) {
          signals.push({
            sourceProvider: "npm",
            sourceType: "code",
            externalId: entry.package.name,
            canonicalUrl:
              entry.package.links.npm ??
              `https://www.npmjs.com/package/${entry.package.name}`,
            publishedAt: entry.package.date,
            title: entry.package.name,
            textExcerpt: entry.package.description,
            engagementMetrics: { popularity: entry.score.detail.popularity },
            rawMetrics: entry as unknown as Record<string, unknown>,
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
