import type { Connector, RawSignal } from "@/libs/trends/types";

const BASE_URL = "https://hacker-news.firebaseio.com/v0";
/** Enough to cover meaningful daily movement without hammering the
 *  unauthenticated Firebase endpoint on every hourly run. */
const MAX_ITEMS = 60;

type HnItem = {
  id: number;
  title?: string;
  url?: string;
  time?: number;
  score?: number;
  descendants?: number;
};

async function fetchItem(id: number): Promise<HnItem | null> {
  try {
    const response = await fetch(`${BASE_URL}/item/${id}.json`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;

    // Minimal runtime validation of response shape
    if (typeof (data as Record<string, unknown>).id !== "number") {
      return null;
    }

    return data as HnItem;
  } catch {
    // Network error, timeout, DNS failure, etc. — gracefully degrade
    return null;
  }
}

export const hackerNewsConnector: Connector = {
  id: "hacker_news",

  async fetchSignals(): Promise<RawSignal[]> {
    const response = await fetch(`${BASE_URL}/topstories.json`);

    if (!response.ok) {
      throw new Error(`Hacker News topstories returned ${response.status}`);
    }

    const data = (await response.json()) as unknown;

    // Minimal validation: ensure it's an array
    if (!Array.isArray(data)) {
      throw new Error("Hacker News topstories returned non-array response");
    }

    const ids = (data as number[]).slice(0, MAX_ITEMS);
    const items = await Promise.all(ids.map(fetchItem));
    const signals: RawSignal[] = [];

    for (const item of items) {
      if (!item?.id || !item.title || !item.time) continue;

      signals.push({
        sourceProvider: "hacker_news",
        sourceType: "launch",
        externalId: String(item.id),
        canonicalUrl: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        publishedAt: new Date(item.time * 1000).toISOString(),
        title: item.title,
        engagementMetrics: {
          score: item.score ?? 0,
          comments: item.descendants ?? 0,
        },
      });
    }

    return signals;
  },
};
