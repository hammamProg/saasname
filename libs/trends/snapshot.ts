import { createSupabaseAdmin } from "@/libs/supabase";
import { computeTrendScore, type SnapshotInput } from "@/libs/trends/score";

/** A topic is auto-published once it clears both bars — cross-source
 *  confirmation and a minimum confidence — rather than by human review
 *  (design doc: no editorial console this slice). */
const PUBLISH_CONFIDENCE_THRESHOLD = 40;
const PUBLISH_MIN_SOURCES = 2;

function sumEngagement(metrics: Record<string, number>): number {
  return Object.values(metrics).reduce((total, value) => total + (value || 0), 0);
}

/** Runs once nightly (cron, Task 15). For every topic with unscored recent
 *  activity, aggregates the last 24h of signals into a snapshot row, scores
 *  the topic against its most recent prior snapshot, and flips
 *  `editorial_status` to `published` once thresholds clear. */
export async function runDailySnapshotAndScore(): Promise<{ topicsProcessed: number }> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Every topic gets a fresh snapshot each run, regardless of
  // editorial_status — a `needs_review` topic still needs its score updated
  // so it has a chance to clear the publish threshold on a later run.
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id")
    .limit(500);

  if (topicsError) {
    throw new Error(`Failed to load topics: ${topicsError.message}`);
  }

  let processed = 0;

  for (const topic of topics ?? []) {
    try {
      const { data: signals, error: signalsError } = await supabase
        .from("signals")
        .select("source_provider, engagement_metrics")
        .eq("topic_id", topic.id)
        .gte("retrieved_at", since);

      if (signalsError) throw new Error(signalsError.message);

      const rows = signals ?? [];
      const current: SnapshotInput = {
        signalCount: rows.length,
        engagementSum: rows.reduce(
          (total, row) => total + sumEngagement(row.engagement_metrics ?? {}),
          0
        ),
        sourceCount: new Set(rows.map((row) => row.source_provider)).size,
      };

      const { data: previousRows, error: previousError } = await supabase
        .from("topic_snapshots")
        .select("signal_count, engagement_sum")
        .eq("topic_id", topic.id)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (previousError) throw new Error(previousError.message);

      const previous = previousRows?.[0]
        ? {
            signalCount: previousRows[0].signal_count,
            engagementSum: previousRows[0].engagement_sum,
            sourceCount: current.sourceCount,
          }
        : null;

      const { trendScore, confidenceScore, stage } = computeTrendScore(current, previous);

      const { error: upsertError } = await supabase.from("topic_snapshots").upsert(
        {
          topic_id: topic.id,
          snapshot_date: today,
          signal_count: current.signalCount,
          engagement_sum: current.engagementSum,
          momentum: previous ? current.signalCount - previous.signalCount : 0,
          stage,
        },
        { onConflict: "topic_id,snapshot_date" }
      );

      if (upsertError) throw new Error(upsertError.message);

      const shouldPublish =
        confidenceScore >= PUBLISH_CONFIDENCE_THRESHOLD &&
        current.sourceCount >= PUBLISH_MIN_SOURCES;

      const { error: updateError } = await supabase
        .from("topics")
        .update({
          trend_score: trendScore,
          confidence_score: confidenceScore,
          stage,
          last_updated_at: new Date().toISOString(),
          ...(shouldPublish ? { editorial_status: "published", is_public: true } : {}),
        })
        .eq("id", topic.id);

      if (updateError) throw new Error(updateError.message);

      processed += 1;
    } catch (topicError) {
      console.error(
        "[snapshot]",
        topic.id,
        topicError instanceof Error ? topicError.message : topicError
      );
    }
  }

  return { topicsProcessed: processed };
}
