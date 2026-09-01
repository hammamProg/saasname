import { createClient } from "@/libs/supabase/server";

export type TopicDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  whyTrending: string | null;
  stage: string;
  trendScore: number;
  confidenceScore: number;
  snapshots: Array<{ snapshotDate: string; signalCount: number; momentum: number }>;
  evidence: Array<{ title: string; url: string; source: string }>;
};

export async function getTopicDetail(slug: string): Promise<TopicDetail | null> {
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select(
      "id, slug, canonical_name, description, why_trending, stage, trend_score, confidence_score"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!topic) {
    return null;
  }

  const [{ data: snapshotRows }, { data: signalRows }] = await Promise.all([
    supabase
      .from("topic_snapshots")
      .select("snapshot_date, signal_count, momentum")
      .eq("topic_id", topic.id)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("signals")
      .select("title, canonical_url, source_provider")
      .eq("topic_id", topic.id)
      .limit(10),
  ]);

  return {
    id: topic.id,
    slug: topic.slug,
    name: topic.canonical_name,
    description: topic.description,
    whyTrending: topic.why_trending,
    stage: topic.stage,
    trendScore: topic.trend_score,
    confidenceScore: topic.confidence_score,
    snapshots: (snapshotRows ?? []).map((row) => ({
      snapshotDate: row.snapshot_date,
      signalCount: row.signal_count,
      momentum: row.momentum,
    })),
    evidence: (signalRows ?? []).map((row) => ({
      title: row.title,
      url: row.canonical_url,
      source: row.source_provider,
    })),
  };
}
