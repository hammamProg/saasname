import { normalizeName } from "@/libs/names/normalize";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

const SEARCH_URL = "https://itunes.apple.com/search";
const LIMIT = 10;

/** App Store titles are routinely "Name: tagline" or "Name - tagline".
 *  Comparing only the whole title misses the incumbent that matters: a live
 *  query for "Notion" returns "Notion: Notes, Tasks, AI", which is plainly the
 *  same product. Compare the full title and the leading segment. */
function titleMatches(title: string, target: string): boolean {
  if (normalizeName(title) === target) {
    return true;
  }

  const lead = title.split(/[:\u2013\u2014\-|]/)[0];
  return !!lead && normalizeName(lead) === target;
}

type ItunesResult = {
  trackName?: string;
  sellerName?: string;
  userRatingCount?: number;
  averageUserRating?: number;
  currentVersionReleaseDate?: string;
  trackViewUrl?: string;
};

/** App Store presence via the iTunes Search API.
 *
 *  Free, official, and needs no key. Emits the incumbent-strength signals the
 *  Phase 4 rollup expects: how many ratings, what average, and crucially when
 *  the app was last updated -- an app with 200 ratings last touched in 2016 is
 *  an abandoned squatter, not a competitor. */
export const appStoreProbe: PlatformProbe = {
  id: "app-store",
  tier: "core",

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const url = `${SEARCH_URL}?term=${encodeURIComponent(name)}&entity=software&limit=${LIMIT}&country=us`;

    let body: { resultCount?: number; results?: ItunesResult[] };

    try {
      const response = await fetch(url, { signal: ctx.signal });

      if (!response.ok) {
        throw new ProbeError(
          `iTunes Search returned ${response.status}`,
          response.status
        );
      }

      body = (await response.json()) as typeof body;
    } catch (error) {
      if (error instanceof ProbeError) throw error;
      throw new ProbeError(
        error instanceof Error ? error.message : String(error)
      );
    }

    const results = body.results ?? [];
    const target = normalizeName(name);
    const exact = results.find((r) => titleMatches(r.trackName ?? "", target));

    const signals: ProbeSignals = {
      resultCount: results.length,
      exactMatch: !!exact,
    };

    if (exact) {
      signals.topTrackName = exact.trackName ?? null;
      signals.topSeller = exact.sellerName ?? null;
      signals.topRatingCount = exact.userRatingCount ?? 0;
      signals.topRatingAverage = exact.averageUserRating ?? 0;
      signals.topLastUpdated = exact.currentVersionReleaseDate ?? null;
    }

    return {
      signals,
      evidenceUrl: exact?.trackViewUrl,
    };
  },
};
