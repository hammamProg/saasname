/** Reading a site's trend matches for the dashboard. */

import { createClient } from "@/libs/supabase/server";
import { lockedTopicIds } from "@/libs/trends/locked-topics";
import type { PlanId } from "@/libs/plans";

export type SiteTopic = {
  topicId: string;
  slug: string;
  name: string;
  stage: string;
  trendScore: number;
  matchScore: number;
  source: "alias" | "semantic";
  evidence: string | null;
  /** True when the paywall hides this trend's detail for the current plan. */
  locked: boolean;
};

type Row = {
  topic_id: string;
  match_score: number;
  source: "alias" | "semantic";
  evidence: string | null;
  topics: {
    slug: string;
    canonical_name: string;
    stage: string;
    trend_score: number;
  } | null;
};

/** Trends this site's traffic touches, strongest match first.
 *
 *  Reuses the existing paywall rather than reimplementing it: which topics are
 *  locked is decided in one place (libs/trends/locked-topics.ts) so the two
 *  products cannot drift into disagreeing about what a free account can see. */
export async function getSiteTopics(
  siteId: string,
  plan: PlanId,
  limit = 6,
): Promise<SiteTopic[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_site_topics")
    .select(
      "topic_id, match_score, source, evidence, topics!inner(slug, canonical_name, stage, trend_score)",
    )
    .eq("site_id", siteId)
    .order("match_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load site topics: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const locked = await lockedTopicIds(plan);

  return rows
    .filter((row): row is Row & { topics: NonNullable<Row["topics"]> } =>
      Boolean(row.topics),
    )
    .map((row) => ({
      topicId: row.topic_id,
      slug: row.topics.slug,
      name: row.topics.canonical_name,
      stage: row.topics.stage,
      trendScore: Number(row.topics.trend_score),
      matchScore: Number(row.match_score),
      source: row.source,
      evidence: row.evidence,
      locked: locked.has(row.topic_id),
    }));
}
