/** Matching a site's traffic against the trend topics this app already
 *  clusters.
 *
 *  Two matchers, cheapest first:
 *
 *  1. Aliases. Exact, free, and runs on every site. Scores 1.
 *  2. Embedding similarity. One model call per site, so it runs on a weekly
 *     schedule and only for sites that actually have traffic.
 *
 *  Service-role only: it reads the raw dimension rollups across sites and
 *  writes `webstats_site_topics`, which is read-only to owners. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/libs/llm/openai-embeddings";
import { matchAliases, siteProfile, termsFrom } from "./topic-terms";

/** Below this, a semantic match is a coincidence rather than a signal. Set
 *  deliberately higher than the clustering threshold in libs/trends/cluster.ts:
 *  a wrong cluster is invisible, a wrong "this trend is about your site" is the
 *  feature failing in public. */
const SEMANTIC_THRESHOLD = 0.78;
const SEMANTIC_LIMIT = 10;

/** How much traffic history informs the match. */
const LOOKBACK_DAYS = 30;

export type MatchResult = {
  siteId: string;
  aliasMatches: number;
  semanticMatches: number;
  skipped: "no-traffic" | "no-profile" | null;
};

type DimRow = { kind: string; value: string; pageviews: number };

async function siteSignals(
  admin: SupabaseClient,
  siteId: string,
): Promise<{ paths: string[]; titles: string[] }> {
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("webstats_dim_hourly")
    .select("kind, value, pageviews")
    .eq("site_id", siteId)
    .in("kind", ["path", "page_title"])
    .gte("hour", since)
    .limit(5_000);

  if (error) throw new Error(`Failed to read site signals: ${error.message}`);

  const totals = new Map<string, Map<string, number>>();
  for (const row of (data ?? []) as DimRow[]) {
    if (!totals.has(row.kind)) totals.set(row.kind, new Map());
    const bucket = totals.get(row.kind)!;
    bucket.set(row.value, (bucket.get(row.value) ?? 0) + row.pageviews);
  }

  const top = (kind: string, n: number) =>
    [...(totals.get(kind) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value]) => value);

  return { paths: top("path", 50), titles: top("page_title", 30) };
}

/** Recompute the topic matches for one site. */
export async function matchTopicsForSite(
  admin: SupabaseClient,
  siteId: string,
): Promise<MatchResult> {
  const { paths, titles } = await siteSignals(admin, siteId);

  if (paths.length === 0 && titles.length === 0) {
    return { siteId, aliasMatches: 0, semanticMatches: 0, skipped: "no-traffic" };
  }

  const terms = termsFrom([...paths, ...titles]);

  // Aliases of published topics only. An unpublished topic is one the
  // editorial pipeline has not vouched for, and surfacing it here would leak
  // it through a side door the trends feed deliberately closes.
  const { data: aliasRows, error: aliasError } = await admin
    .from("topic_aliases")
    .select("topic_id, alias_text, topics!inner(editorial_status)")
    .eq("topics.editorial_status", "published")
    .limit(5_000);

  if (aliasError) throw new Error(`Failed to read aliases: ${aliasError.message}`);

  const aliases = ((aliasRows ?? []) as unknown as {
    topic_id: string;
    alias_text: string;
  }[]).map((r) => ({ topicId: r.topic_id, alias: r.alias_text }));

  const hits = matchAliases(terms, aliases);

  const rows = new Map<
    string,
    { topic_id: string; match_score: number; source: string; evidence: string }
  >();

  for (const hit of hits) {
    rows.set(hit.topicId, {
      topic_id: hit.topicId,
      match_score: 1,
      source: "alias",
      evidence: hit.evidence,
    });
  }

  // Semantic pass. Skipped when there is nothing to describe the site with,
  // and when the embedding provider is unconfigured — a missing key should
  // degrade this feature, not fail the job that also writes alias matches.
  const profile = siteProfile(titles, terms);
  let semanticMatches = 0;

  if (profile) {
    try {
      const embedding = await embedText(profile);

      const { data: matches, error } = await admin.rpc("match_topics", {
        query_embedding: embedding,
        match_threshold: SEMANTIC_THRESHOLD,
        match_count: SEMANTIC_LIMIT,
      });

      if (error) throw new Error(error.message);

      const ids = ((matches ?? []) as { id: string; similarity: number }[]);

      if (ids.length > 0) {
        const { data: published } = await admin
          .from("topics")
          .select("id")
          .in("id", ids.map((m) => m.id))
          .eq("editorial_status", "published");

        const allowed = new Set((published ?? []).map((t) => t.id as string));

        for (const match of ids) {
          // Re-checked here even though the RPC now filters. It silently
          // ignored this threshold until 031, and a matcher whose whole claim
          // is relevance should not depend on a remote function keeping a
          // promise its signature makes. Same guard cluster.ts already had.
          if (match.similarity < SEMANTIC_THRESHOLD) continue;
          if (!allowed.has(match.id)) continue;
          // An alias hit already earned a score of 1; do not downgrade it.
          if (rows.has(match.id)) continue;

          rows.set(match.id, {
            topic_id: match.id,
            match_score: Number(match.similarity.toFixed(4)),
            source: "semantic",
            evidence: titles[0] ?? terms.slice(0, 3).join(", "),
          });
          semanticMatches += 1;
        }
      }
    } catch (error) {
      console.error("[webstats] semantic match failed", error);
    }
  }

  // Replace rather than merge: a topic that no longer matches should stop
  // being claimed, and a stale match is worse than none.
  const { error: deleteError } = await admin
    .from("webstats_site_topics")
    .delete()
    .eq("site_id", siteId);

  if (deleteError) throw new Error(`Failed to clear matches: ${deleteError.message}`);

  if (rows.size > 0) {
    const { error: insertError } = await admin
      .from("webstats_site_topics")
      .insert([...rows.values()].map((r) => ({ site_id: siteId, ...r })));

    if (insertError) {
      throw new Error(`Failed to write matches: ${insertError.message}`);
    }
  }

  return {
    siteId,
    aliasMatches: hits.length,
    semanticMatches,
    skipped: profile ? null : "no-profile",
  };
}

/** Recompute matches for every live site that has traffic. */
export async function matchTopicsForAllSites(
  admin: SupabaseClient,
): Promise<MatchResult[]> {
  const { data, error } = await admin
    .from("webstats_sites")
    .select("id")
    .is("deleted_at", null);

  if (error) throw new Error(`Failed to list sites: ${error.message}`);

  const results: MatchResult[] = [];

  // Sequential on purpose: this runs weekly, and one embedding call per site
  // in parallel would spike the provider's rate limit for no benefit.
  for (const site of data ?? []) {
    try {
      results.push(await matchTopicsForSite(admin, site.id as string));
    } catch (error) {
      console.error(`[webstats] match failed for ${site.id}`, error);
    }
  }

  return results;
}
