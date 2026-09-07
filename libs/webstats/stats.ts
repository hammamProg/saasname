/** Dashboard reads.
 *
 *  Everything here queries the rollup tables and never `webstats_events`. The
 *  raw table has RLS on with no policy and no grants, so a user-scoped client
 *  cannot reach it at all — and at event volume a per-row policy check would
 *  be unaffordable anyway. Keeping the dashboard on rollups is also what makes
 *  the storage tier swappable later without touching any of this. */

import { createClient } from "@/libs/supabase/server";
import { seriesFor, summarize, type Summary, type VisitRow } from "./metrics";
import { bucketsFor, type Range } from "./range";

/** Rollup rows are one per visit-hour, so a busy site over 90 days can return
 *  a lot of them. Reads are capped rather than unbounded, and the cap is
 *  reported to the caller — a silently truncated report reads as a traffic
 *  drop. */
const MAX_ROWS = 20_000;
const PAGE = 1_000;

export type Breakdown = { label: string; value: number }[];

export type SiteStats = {
  summary: Summary;
  series: { at: Date; visitors: number; pageviews: number }[];
  bucket: "hour" | "day";
  topPages: Breakdown;
  topSources: Breakdown;
  entryPages: Breakdown;
  countries: Breakdown;
  browsers: Breakdown;
  devices: Breakdown;
  /** True when the row cap was hit, so the numbers are a floor, not a total. */
  truncated: boolean;
};

async function fetchVisitRows(
  siteId: string,
  from: Date,
  to: Date,
): Promise<{ rows: VisitRow[]; truncated: boolean }> {
  const supabase = await createClient();
  const rows: VisitRow[] = [];

  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await supabase
      .from("webstats_visit_hourly")
      .select(
        "hour, visit_id, session_id, views, events, engaged_ms, min_time, max_time, browser, os, device, country, entry_path, exit_path",
      )
      .eq("site_id", siteId)
      .gte("hour", from.toISOString())
      .lte("hour", to.toISOString())
      .order("hour", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Failed to load stats: ${error.message}`);

    const page = (data ?? []) as VisitRow[];
    rows.push(...page);

    if (page.length < PAGE) return { rows, truncated: false };
  }

  return { rows, truncated: true };
}

async function fetchDimension(
  siteId: string,
  kind: string,
  from: Date,
  to: Date,
  limit = 8,
): Promise<Breakdown> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_dim_hourly")
    .select("value, pageviews")
    .eq("site_id", siteId)
    .eq("kind", kind)
    .gte("hour", from.toISOString())
    .lte("hour", to.toISOString())
    .limit(5_000);

  if (error) throw new Error(`Failed to load ${kind}: ${error.message}`);

  // Summed here rather than in SQL because PostgREST cannot group; the row
  // count per site-range is small enough that it does not matter.
  const totals = new Map<string, number>();
  for (const row of (data ?? []) as { value: string; pageviews: number }[]) {
    totals.set(row.value, (totals.get(row.value) ?? 0) + row.pageviews);
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Rank a visit-level attribute by unique visitors.
 *
 *  Only possible for attributes stored on the visit rollup. Dimensions in
 *  `webstats_dim_hourly` are ranked by pageviews instead, because distinct
 *  visitors cannot be summed across hourly buckets without double counting. */
function rankByVisitors(
  rows: VisitRow[],
  pick: (row: VisitRow) => string | null,
  limit = 8,
): Breakdown {
  const sessions = new Map<string, Set<string>>();

  for (const row of rows) {
    if (row.views <= 0) continue;

    const label = pick(row);
    if (!label) continue;

    if (!sessions.has(label)) sessions.set(label, new Set());
    sessions.get(label)!.add(row.session_id);
  }

  return [...sessions.entries()]
    .map(([label, set]) => ({ label, value: set.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function rankEntryPages(rows: VisitRow[], limit = 8): Breakdown {
  // Entry page belongs to the visit, not the visit-hour, so the first row of
  // each visit is the one that carries it.
  const seen = new Set<string>();
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.views <= 0 || !row.entry_path) continue;
    if (seen.has(row.visit_id)) continue;

    seen.add(row.visit_id);
    counts.set(row.entry_path, (counts.get(row.entry_path) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function getSiteStats(
  siteId: string,
  range: Range,
  now: Date = new Date(),
): Promise<SiteStats> {
  const buckets = bucketsFor(range, now);
  const from = buckets[0];
  const to = now;

  const [{ rows, truncated }, topPages, topSources] = await Promise.all([
    fetchVisitRows(siteId, from, to),
    fetchDimension(siteId, "path", from, to),
    fetchDimension(siteId, "referrer_domain", from, to),
  ]);

  return {
    summary: summarize(rows),
    series: seriesFor(rows, buckets, range.bucket),
    bucket: range.bucket,
    topPages,
    topSources,
    entryPages: rankEntryPages(rows),
    countries: rankByVisitors(rows, (r) => r.country),
    browsers: rankByVisitors(rows, (r) => r.browser),
    devices: rankByVisitors(rows, (r) => r.device),
    truncated,
  };
}
