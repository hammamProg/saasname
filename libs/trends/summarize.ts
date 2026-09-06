import { createSupabaseAdmin } from "@/libs/supabase";
import { createOpenAiProvider, isOpenAiConfigured } from "@/libs/llm/openai";
import { numberFromEnv } from "@/libs/trends/env";

/** Overridable so the model can be changed without a deploy — the default is
 *  a small, cheap chat model, and summaries are one sentence each. */
const MODEL = process.env.TRENDS_SUMMARY_MODEL?.trim() || "gpt-4.1-mini";

/** Topics summarized per run. Bounded so the nightly cron stays inside its
 *  maxDuration; raise it for a one-off backlog pass. */
const SUMMARY_BATCH_SIZE = numberFromEnv("TRENDS_SUMMARY_BATCH_SIZE", 50);
const SYSTEM_PROMPT =
  "You write one-sentence, plain-language trend summaries from evidence titles. " +
  "Never state a fact not implied by the titles given. Respond as JSON: " +
  '{"description": string, "whyTrending": string}. Both fields are one sentence.';

type Summary = { description: string; whyTrending: string };

function parseSummary(raw: string): Summary | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Summary>;
    if (typeof parsed.description === "string" && typeof parsed.whyTrending === "string") {
      return { description: parsed.description, whyTrending: parsed.whyTrending };
    }
    return null;
  } catch {
    return null;
  }
}

/** Summarizes topics missing a description — runs once per topic on score
 *  change (design doc's cost-control principle), never per page view. The
 *  summary is always generated from stored signal titles, so it can always
 *  be traced back to linked evidence (blueprint §29.1's trust rule). */
export async function summarizeTopicsNeedingSummary(): Promise<{ summarized: number }> {
  if (!isOpenAiConfigured()) {
    return { summarized: 0 };
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, canonical_name")
    .is("description", null)
    .limit(SUMMARY_BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to load topics needing summary: ${error.message}`);
  }

  const provider = createOpenAiProvider();
  let summarized = 0;

  for (const topic of topics ?? []) {
    try {
      const { data: signals, error: signalsError } = await supabase
        .from("signals")
        .select("title, canonical_url")
        .eq("topic_id", topic.id)
        .limit(5);

      if (signalsError) throw new Error(signalsError.message);

      const evidence = (signals ?? []).map((s) => `- ${s.title}`).join("\n");
      const raw = await provider.complete({
        system: SYSTEM_PROMPT,
        user: `Topic: ${topic.canonical_name}\nEvidence titles:\n${evidence}`,
        model: MODEL,
        json: true,
        maxOutputTokens: 200,
      });

      const summary = parseSummary(raw);
      if (!summary) continue;

      const { error: updateError } = await supabase
        .from("topics")
        .update({ description: summary.description, why_trending: summary.whyTrending })
        .eq("id", topic.id);

      if (updateError) throw new Error(updateError.message);

      summarized += 1;
    } catch (summaryError) {
      console.error(
        "[summarize]",
        topic.id,
        summaryError instanceof Error ? summaryError.message : summaryError
      );
    }
  }

  return { summarized };
}
