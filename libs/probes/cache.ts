import { createSupabaseAdmin } from "@/libs/supabase";
import type { ProbeResult } from "@/libs/probes/types";

export const CACHE_TTL_DAYS = 7;

/** Global probe cache.
 *
 *  Keyed by (platform, normalized_name) across all users, not per user. The
 *  second person to check a given name on a given platform costs nothing in
 *  outbound API spend, which the design spec calls the largest margin lever in
 *  the system.
 *
 *  Every function here swallows its own errors. A cache that is down must slow
 *  the product, never break it. */

export async function readCache(
  platform: string,
  normalizedName: string
): Promise<ProbeResult | null> {
  const admin = createSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data, error } = await admin
      .from("platform_cache")
      .select("payload, expires_at")
      .eq("platform", platform)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (error || !data) return null;

    // Expired rows are left for a later sweep rather than deleted on the read
    // path; deleting here would add a write to every cache miss.
    if (new Date(data.expires_at as string).getTime() <= Date.now()) {
      return null;
    }

    return data.payload as ProbeResult;
  } catch {
    return null;
  }
}

export async function writeCache(
  platform: string,
  normalizedName: string,
  result: ProbeResult
): Promise<void> {
  const admin = createSupabaseAdmin();
  if (!admin) return;

  const expiresAt = new Date(
    Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    await admin.from("platform_cache").upsert(
      {
        platform,
        normalized_name: normalizedName,
        payload: result,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "platform,normalized_name" }
    );
  } catch {
    // A failed cache write costs one repeated lookup. It must not fail a run.
  }
}
