import { createSupabaseAdmin } from "@/libs/supabase";
import { embedText } from "@/libs/llm/openai-embeddings";
import { numberFromEnv } from "@/libs/trends/env";

/** Cosine similarity above this merges a signal into an existing topic;
 *  below it, the signal seeds a new topic instead.
 *
 *  The original 0.82 was a guess and turned out to be unreachable: measured
 *  over 6,555 real topic pairs, mean similarity was 0.19 and the single most
 *  similar pair in the whole corpus was 0.77, so nothing ever merged and every
 *  signal became its own topic. 0.72 sits just under that genuinely-same-topic
 *  pair and above the 0.60-0.67 band of merely-related ones. Env-tunable
 *  because the right value depends on the signal mix, and it needs to be
 *  adjustable against real output without a deploy. */
const MERGE_THRESHOLD = numberFromEnv("TRENDS_MERGE_THRESHOLD", 0.72);
/** Caps one pipeline run so a slow embedding provider can't blow past the
 *  cron route's maxDuration. Tunable because the nightly ceiling and a
 *  one-off bootstrap have opposite needs: a fresh database can have thousands
 *  of unclustered signals, and at 200 a run it would take weeks of nightly
 *  jobs to work through the backlog. Raise it for a manual
 *  `npm run trends:run`, leave it at the default for cron. */
const BATCH_SIZE = numberFromEnv("TRENDS_CLUSTER_BATCH_SIZE", 200);

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base}-${Date.now().toString(36)}`;
}

/** Embeds every not-yet-clustered signal and either merges it into the
 *  nearest existing topic (via `match_topics`) or creates a new one. Runs
 *  one signal at a time on purpose: each embedding call is independent and a
 *  failure on one signal must not lose progress on the rest. */
export async function clusterUnclusteredSignals(): Promise<{
  clustered: number;
  newTopics: number;
}> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data: signals, error } = await supabase
    .from("signals")
    .select("id, title, text_excerpt, category_hint")
    .is("topic_id", null)
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to load unclustered signals: ${error.message}`);
  }

  // Fetched once per pipeline run (not per-signal) to resolve a connector's
  // `category_hint` slug to the `categories.id` uuid `topics.category_id`
  // expects. Not every connector sets a hint, so lookups can legitimately miss.
  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug");

  if (categoryError) {
    throw new Error(`Failed to load categories: ${categoryError.message}`);
  }

  const categoryIdBySlug = new Map(
    (categoryRows ?? []).map((row) => [row.slug as string, row.id as string])
  );

  let clustered = 0;
  let newTopics = 0;

  for (const signal of signals ?? []) {
    try {
      const embedding = await embedText(
        [signal.title, signal.text_excerpt].filter(Boolean).join(" — ")
      );

      const { data: matches } = await supabase.rpc("match_topics", {
        query_embedding: embedding,
        match_threshold: MERGE_THRESHOLD,
        match_count: 1,
      });

      const best = matches?.[0] as { id: string; similarity: number } | undefined;
      let topicId: string;

      if (best && best.similarity >= MERGE_THRESHOLD) {
        topicId = best.id;

        // Record the new name variant. Duplicates are harmless no-ops via
        // the `(topic_id, alias_text)` unique constraint, so an unconditional
        // upsert is simpler than a canonical-name comparison first.
        // NOTE: the matched topic's embedding centroid is intentionally left
        // untouched here — recomputing/averaging it on merge is deferred;
        // see design doc step 3 for the limitation.
        const { error: aliasError } = await supabase
          .from("topic_aliases")
          .upsert(
            { topic_id: topicId, alias_text: signal.title },
            { onConflict: "topic_id,alias_text", ignoreDuplicates: true }
          );

        if (aliasError) {
          console.error("[cluster] alias insert failed", signal.id, aliasError.message);
        }
      } else {
        const categoryId = signal.category_hint
          ? (categoryIdBySlug.get(signal.category_hint) ?? null)
          : null;

        const { data: created, error: insertError } = await supabase
          .from("topics")
          .insert({
            slug: slugify(signal.title),
            canonical_name: signal.title,
            category_id: categoryId,
            embedding,
            editorial_status: "needs_review",
          })
          .select()
          .single();

        if (insertError || !created) {
          throw new Error(insertError?.message ?? "Insert returned no row");
        }

        topicId = created.id as string;
        newTopics += 1;
      }

      const { error: updateError } = await supabase
        .from("signals")
        .update({ topic_id: topicId })
        .eq("id", signal.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      clustered += 1;
    } catch (clusterError) {
      console.error(
        "[cluster]",
        signal.id,
        clusterError instanceof Error ? clusterError.message : clusterError
      );
    }
  }

  return { clustered, newTopics };
}
