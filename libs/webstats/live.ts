/** Live-visitor detail for the badge panel's preview: the same "online now"
 *  figure as OnlineTile, plus a per-minute activity shape and a country
 *  breakdown for the visitors making up that count.
 *
 *  Reads `webstats_events` directly, same rationale as libs/webstats/online.ts:
 *  the rollup lags by up to six minutes, which is worthless for a number
 *  whose entire point is being current right now. Service-role only — the
 *  raw table has no RLS policy for `authenticated`; callers must check
 *  ownership first via `getSite`, as the route calling this does. */

import { createSupabaseAdmin } from "@/libs/supabase";
import { ONLINE_WINDOW_MS } from "./online";
import { countryName } from "./icons";

const BUCKET_MS = 60_000;
const BUCKET_COUNT = ONLINE_WINDOW_MS / BUCKET_MS;

export type LiveVisitors = {
  count: number;
  /** One entry per minute of the window, oldest first, ending now. */
  series: number[];
  countries: { code: string; name: string; count: number }[];
};

export async function getLiveVisitors(siteId: string): Promise<LiveVisitors> {
  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Failed to load live visitors: service role not configured");
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  const { data, error } = await admin
    .from("webstats_events")
    .select("session_id, occurred_at, country")
    .eq("site_id", siteId)
    .gte("occurred_at", since.toISOString())
    // Same bound as getOnlineVisitors: a busy site does not need an exact
    // read, and an unbounded scan of the firehose is not worth one.
    .limit(5_000);

  if (error) {
    throw new Error(`Failed to load live visitors: ${error.message}`);
  }

  const rows = (data ?? []) as {
    session_id: string;
    occurred_at: string;
    country: string | null;
  }[];

  const count = new Set(rows.map((r) => r.session_id)).size;

  const series = new Array(BUCKET_COUNT).fill(0) as number[];
  const now = Date.now();
  for (const row of rows) {
    const age = now - new Date(row.occurred_at).getTime();
    const bucketFromEnd = Math.floor(age / BUCKET_MS);
    const index = BUCKET_COUNT - 1 - bucketFromEnd;
    if (index >= 0 && index < BUCKET_COUNT) series[index] += 1;
  }

  const sessionsByCountry = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.country) continue;
    if (!sessionsByCountry.has(row.country)) {
      sessionsByCountry.set(row.country, new Set());
    }
    sessionsByCountry.get(row.country)!.add(row.session_id);
  }

  const countries = [...sessionsByCountry.entries()]
    .map(([code, sessions]) => ({ code, name: countryName(code), count: sessions.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { count, series, countries };
}
