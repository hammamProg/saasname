import { normalizeName } from "@/libs/names/normalize";
import {
  ProbeError,
  type PlatformProbe,
  type ProbeContext,
  type ProbeResult,
  type ProbeSignals,
} from "@/libs/probes/types";

/** Undocumented internal endpoint of a government SPA. The legacy USPTO
 *  Developer Hub was decommissioned 2026-06-05 and the Open Data Portal
 *  exposes no trademark *search*, so this is the only route that answers the
 *  question. It has no stability guarantee and no published rate limit. */
const TMSEARCH_URL = "https://tmsearch.uspto.gov/prod-stage-v1-0-0/tmsearch";

/** Classes a software product actually competes in. A live mark in an
 *  unrelated class is a soft signal, not a hard blocker. */
export const SOFTWARE_CLASSES = ["009", "042"];

type Hit = {
  source?: {
    wordmark?: string;
    ownerName?: string[];
    alive?: boolean;
    internationalClass?: string[];
    filedDate?: string;
  };
};

function classNumbers(classes: string[] | undefined): string[] {
  // Arrives as "IC 009"; the digits are what matter.
  return (classes ?? []).map((c) => c.replace(/\D/g, "").padStart(3, "0"));
}

/** USPTO trademark presence for the exact wordmark.
 *
 *  Uses the exact `term` query, because the hard-blocker decision turns on an
 *  exact mark rather than a fuzzy one. `alive` is the signal that matters, not
 *  the hit count: a search for "slack" returns 115 exact marks of which only 37
 *  are live, and a cancelled or abandoned mark blocks nothing. */
export const trademarkProbe: PlatformProbe = {
  id: "trademark",
  tier: "best_effort",
  timeoutMs: 12_000,

  async run(name: string, ctx: ProbeContext): Promise<ProbeResult> {
    const term = normalizeName(name);

    if (!term) {
      throw new ProbeError(`Name does not normalize to a wordmark: ${name}`);
    }

    let body: {
      hits?: { totalValue?: number; hits?: Hit[] };
      aggregations?: {
        alive?: { buckets?: Array<{ key_as_string?: string; doc_count?: number }> };
      };
    };

    try {
      const response = await fetch(TMSEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: { bool: { must: [{ term: { WM: term } }] } },
          size: 5,
          from: 0,
          track_total_hits: true,
          _source: [
            "wordmark",
            "ownerName",
            "alive",
            "internationalClass",
            "filedDate",
          ],
          aggs: { alive: { terms: { field: "alive" } } },
        }),
        signal: ctx.signal,
      });

      if (!response.ok) {
        throw new ProbeError(
          `USPTO tmsearch returned ${response.status}`,
          response.status
        );
      }

      body = (await response.json()) as typeof body;
    } catch (error) {
      if (error instanceof ProbeError) throw error;
      throw new ProbeError(error instanceof Error ? error.message : String(error));
    }

    // Anything without a parseable hits object is unknown, never "no conflict".
    if (!body.hits || typeof body.hits.totalValue !== "number") {
      throw new ProbeError("USPTO tmsearch returned an unreadable response");
    }

    const buckets = body.aggregations?.alive?.buckets ?? [];
    const liveMarks =
      buckets.find((b) => b.key_as_string === "true")?.doc_count ?? 0;
    const deadMarks =
      buckets.find((b) => b.key_as_string === "false")?.doc_count ?? 0;

    const hits = body.hits.hits ?? [];
    const liveHits = hits.filter((h) => h.source?.alive === true);
    const liveInSoftware = liveHits.filter((h) =>
      classNumbers(h.source?.internationalClass).some((c) =>
        SOFTWARE_CLASSES.includes(c)
      )
    );

    const headline = liveInSoftware[0] ?? liveHits[0];

    const signals: ProbeSignals = {
      exactMarks: body.hits.totalValue,
      liveMarks,
      deadMarks,
      // Whether any live mark sits in a software class decides hard blocker
      // versus advisory, so it is recorded rather than inferred later.
      liveInSoftwareClass: liveInSoftware.length > 0,
    };

    if (headline?.source) {
      signals.topWordmark = headline.source.wordmark ?? null;
      signals.topOwner = headline.source.ownerName?.[0] ?? null;
      signals.topClass = (headline.source.internationalClass ?? []).join(", ") || null;
      signals.topFiledDate = headline.source.filedDate ?? null;
    }

    return {
      signals,
      evidenceUrl: `https://tmsearch.uspto.gov/search/search-information?q=${encodeURIComponent(term)}`,
    };
  },
};
