import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type GitHubItem = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  stargazers_count: number;
  forks_count: number;
};

/** Repos created in roughly the last two weeks, so an hourly run keeps
 *  surfacing the same window rather than scanning all of GitHub history. */
function sinceDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
}

export const githubConnector: Connector = {
  id: "github",

  async fetchSignals(): Promise<RawSignal[]> {
    const since = sinceDate();
    const signals: RawSignal[] = [];
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    // Sequential, not parallel: GitHub's search endpoint allows 10 req/min
    // unauthenticated (30 with a token), and 12 categories fits either way
    // only if the requests are spaced out, not fired in a burst.
    for (const category of CATEGORY_SLUGS) {
      const terms = CATEGORY_SEED_QUERIES[category].join(" OR ");
      const query = encodeURIComponent(`${terms} created:>${since}`);
      const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=10`;

      try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          continue;
        }

        const body = (await response.json()) as { items: GitHubItem[] };

        // Minimal runtime validation: ensure items is an array
        if (!Array.isArray(body.items)) {
          continue;
        }

        for (const item of body.items) {
          signals.push({
            sourceProvider: "github",
            sourceType: "code",
            externalId: String(item.id),
            canonicalUrl: item.html_url,
            publishedAt: item.created_at,
            title: item.full_name,
            textExcerpt: item.description ?? undefined,
            engagementMetrics: {
              stars: item.stargazers_count,
              forks: item.forks_count,
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
