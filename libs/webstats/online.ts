/** Visitors active right now.
 *
 *  Reads `webstats_events` directly rather than the rollups, and that is the
 *  whole point: the rollup runs on a five-minute schedule with a one-minute
 *  safety lag, so a rollup-derived "online" figure would report zero for up to
 *  six minutes after someone arrived — which is the one number where being
 *  stale makes it worthless.
 *
 *  The raw table has RLS on with no policy for `authenticated`, so this goes
 *  through the service-role client. Callers must check ownership first, as
 *  both current callers do via `getSite`. */

import { createSupabaseAdmin } from "@/libs/supabase";

/** The window that counts as "now". Five minutes is the industry convention
 *  and matches what the tracker can support: a visitor reading one page sends
 *  nothing after the initial beacon until they leave, so a shorter window
 *  would drop people who are still reading. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function getOnlineVisitors(siteId: string): Promise<number> {
  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Failed to count online visitors: service role not configured");
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  const { data, error } = await admin
    .from("webstats_events")
    .select("session_id")
    .eq("site_id", siteId)
    .gte("occurred_at", since)
    // A page that is genuinely busy does not need an exact number, and an
    // unbounded read on the firehose is not worth one.
    .limit(2_000);

  if (error) {
    throw new Error(`Failed to count online visitors: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.session_id as string)).size;
}
