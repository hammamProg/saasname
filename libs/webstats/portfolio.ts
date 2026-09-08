/** Rollup across every site an account tracks, for the "all sites" dashboard.
 *
 *  Reuses `getSiteStats` per site rather than a new SQL aggregate: summing
 *  `summary.visitors` across sites is safe because each site's visitor
 *  identity is salted with its own site id, so the same real person hashes to
 *  different, non-overlapping session ids per site — unlike summing visitors
 *  across time buckets *within* one site, which double-counts returners. */

import type { Range } from "./range";
import { getSiteStats } from "./stats";
import type { Site } from "./sites";
import type { SiteOverview } from "./overview";

export type TopSite = {
  id: string;
  name: string;
  domain: string;
  visitors: number;
};

export type PortfolioStats = {
  totalVisitors: number;
  totalPageviews: number;
  onlineNow: number;
  topSite: TopSite | null;
  /** True if any one site's report hit its row cap — the totals below are a
   *  floor, not a total, same caveat `getSiteStats` reports per site. */
  truncated: boolean;
};

export async function getPortfolioStats(
  sites: Site[],
  overview: Record<string, SiteOverview>,
  range: Range,
): Promise<PortfolioStats> {
  // Sites with no events yet have nothing for getSiteStats to read; skipping
  // them turns an all-empty portfolio into zero queries instead of N wasted
  // ones.
  const connected = sites.filter((site) => overview[site.id]?.connected);

  const results = await Promise.all(
    connected.map(async (site) => ({
      site,
      stats: await getSiteStats(site.id, range),
    })),
  );

  let totalVisitors = 0;
  let totalPageviews = 0;
  let truncated = false;
  let topSite: TopSite | null = null;

  for (const { site, stats } of results) {
    totalVisitors += stats.summary.visitors;
    totalPageviews += stats.summary.pageviews;
    if (stats.truncated) truncated = true;

    if (!topSite || stats.summary.visitors > topSite.visitors) {
      topSite = {
        id: site.id,
        name: site.name,
        domain: site.domain,
        visitors: stats.summary.visitors,
      };
    }
  }

  // Online now ignores the selected range — "now" is not a period, same as
  // the single-site live tile — so it comes straight from the overview RPC
  // rather than from the ranged reports above.
  const onlineNow = sites.reduce(
    (sum, site) => sum + (overview[site.id]?.onlineVisitors ?? 0),
    0,
  );

  return { totalVisitors, totalPageviews, onlineNow, topSite, truncated };
}
