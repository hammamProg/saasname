import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

/** Hard daily cap on keyword lookups (design doc's cost-control principle).
 *  One request covers all seed keywords, so this bounds the keyword list,
 *  not the request count. */
const MAX_KEYWORDS = 40;

type DataForSeoResult = {
  tasks: Array<{
    result: Array<{
      keyword: string;
      search_volume: number | null;
      competition: number | null;
      cpc: number | null;
    }> | null;
  }>;
};

export const dataForSeoConnector: Connector = {
  id: "dataforseo",

  async fetchSignals(): Promise<RawSignal[]> {
    const login = process.env.DATAFORSEO_LOGIN?.trim();
    const password = process.env.DATAFORSEO_PASSWORD?.trim();

    if (!login || !password) {
      return [];
    }

    const keywords = Object.values(CATEGORY_SEED_QUERIES)
      .flat()
      .slice(0, MAX_KEYWORDS);

    const response = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        },
        body: JSON.stringify([{ keywords, location_code: 2840, language_code: "en" }]),
      }
    );

    if (!response.ok) {
      throw new Error(`DataForSEO returned ${response.status}`);
    }

    const body = (await response.json()) as DataForSeoResult;

    // Runtime shape guard: tasks must be an array
    if (!Array.isArray(body.tasks)) {
      throw new Error(
        `DataForSEO response malformed: expected tasks to be an array, got ${typeof body.tasks}`
      );
    }

    const results = body.tasks.flatMap((task) => task.result ?? []);
    const now = new Date().toISOString();

    return results
      .filter((result) => result.search_volume !== null)
      .map((result) => ({
        sourceProvider: "dataforseo",
        sourceType: "search",
        externalId: result.keyword,
        canonicalUrl: `https://www.google.com/search?q=${encodeURIComponent(result.keyword)}`,
        publishedAt: now,
        title: result.keyword,
        engagementMetrics: {
          searchVolume: result.search_volume ?? 0,
          competition: result.competition ?? 0,
          cpc: result.cpc ?? 0,
        },
      }));
  },
};
