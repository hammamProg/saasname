import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/libs/supabase";
import type { RawSignal } from "@/libs/trends/types";

/** Same source + same external id is always the same evidence, so the hash
 *  is deterministic on those two fields alone — re-ingesting an unchanged
 *  item is a no-op, not a duplicate row. */
function contentHash(signal: RawSignal): string {
  return createHash("sha256")
    .update(`${signal.sourceProvider}:${signal.externalId}`)
    .digest("hex");
}

/** Writes a connector's fetched signals to `signals`, skipping anything
 *  already stored. Uses `ON CONFLICT ... DO NOTHING` via Supabase's
 *  `ignoreDuplicates` upsert so re-running a connector never errors on
 *  overlap — the `.select()` after upsert returns only the rows Postgres
 *  actually inserted, which is how `inserted` vs `skipped` is derived
 *  without a second query. */
export async function ingestSignals(
  connectorId: string,
  signals: RawSignal[]
): Promise<{ inserted: number; skipped: number }> {
  if (signals.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const rows = signals.map((signal) => ({
    source_provider: signal.sourceProvider,
    source_type: signal.sourceType,
    external_id: signal.externalId,
    canonical_url: signal.canonicalUrl,
    published_at: signal.publishedAt,
    language: signal.language ?? null,
    country_or_region: signal.countryOrRegion ?? null,
    title: signal.title,
    text_excerpt: signal.textExcerpt ?? null,
    engagement_metrics: signal.engagementMetrics ?? {},
    raw_metrics: signal.rawMetrics ?? {},
    category_hint: signal.categoryHint ?? null,
    content_hash: contentHash(signal),
  }));

  const { data, error } = await supabase
    .from("signals")
    .upsert(rows, { onConflict: "content_hash", ignoreDuplicates: true })
    .select();

  if (error) {
    throw new Error(`[${connectorId}] Failed to write signals: ${error.message}`);
  }

  const inserted = data?.length ?? 0;

  return { inserted, skipped: signals.length - inserted };
}
