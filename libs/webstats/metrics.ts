/** Turning rollup rows into the numbers a dashboard shows.
 *
 *  Kept pure and separate from the queries so the definitions are testable.
 *  These are the definitions, and they are not obvious:
 *
 *  - A visit is a `visit_id`, not a row. The rollup is keyed
 *    (site, hour, visit), so a visit crossing an hour boundary is two rows.
 *  - A visit with zero pageviews is not a visit. Those rows exist because an
 *    engagement event can land in a later hour than the pageview it belongs
 *    to; the row carries real engaged time but counting it would inflate
 *    visits and bounces.
 *  - A bounce is a visit with exactly one pageview and no custom events, and
 *    it is judged over the whole visit rather than one hour of it.
 *  - Duration prefers measured engagement. Last-event minus first-event makes
 *    every single-pageview visit exactly zero seconds, which is why the
 *    tracker reports engaged time at all. */

import { truncate, type Bucket } from "./range";

export type VisitRow = {
  hour: string;
  visit_id: string;
  session_id: string;
  views: number;
  events: number;
  engaged_ms: number;
  min_time: string;
  max_time: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  entry_path: string | null;
  exit_path: string | null;
};

export type Summary = {
  visitors: number;
  visits: number;
  pageviews: number;
  /** 0–1. Zero when there are no visits to divide by. */
  bounceRate: number;
  avgDurationMs: number;
};

type Visit = {
  sessionId: string;
  views: number;
  events: number;
  engagedMs: number;
  minTime: number;
  maxTime: number;
};

/** Fold rows into one entry per visit. Exported because the time series needs
 *  the same folding per bucket. */
export function foldVisits(rows: VisitRow[]): Map<string, Visit> {
  const visits = new Map<string, Visit>();

  for (const row of rows) {
    const existing = visits.get(row.visit_id);
    const minTime = Date.parse(row.min_time);
    const maxTime = Date.parse(row.max_time);

    if (!existing) {
      visits.set(row.visit_id, {
        sessionId: row.session_id,
        views: row.views,
        events: row.events,
        engagedMs: row.engaged_ms,
        minTime,
        maxTime,
      });
      continue;
    }

    existing.views += row.views;
    existing.events += row.events;
    existing.engagedMs += row.engaged_ms;
    existing.minTime = Math.min(existing.minTime, minTime);
    existing.maxTime = Math.max(existing.maxTime, maxTime);
  }

  return visits;
}

function durationOf(visit: Visit): number {
  if (visit.engagedMs > 0) return visit.engagedMs;

  return Math.max(0, visit.maxTime - visit.minTime);
}

export function summarize(rows: VisitRow[]): Summary {
  const visits = [...foldVisits(rows).values()].filter((v) => v.views > 0);

  if (visits.length === 0) {
    return {
      visitors: 0,
      visits: 0,
      pageviews: 0,
      bounceRate: 0,
      avgDurationMs: 0,
    };
  }

  const visitors = new Set(visits.map((v) => v.sessionId)).size;
  const pageviews = visits.reduce((sum, v) => sum + v.views, 0);
  const bounces = visits.filter((v) => v.views === 1 && v.events === 0).length;
  const duration = visits.reduce((sum, v) => sum + durationOf(v), 0);

  return {
    visitors,
    visits: visits.length,
    pageviews,
    bounceRate: bounces / visits.length,
    avgDurationMs: Math.round(duration / visits.length),
  };
}

/** Visitors and pageviews per bucket.
 *
 *  A visit spanning a bucket boundary is counted in each bucket it appears in,
 *  which is what a time series should show: the person was present in both.
 *  The headline numbers above deduplicate; these deliberately do not. */
export function seriesFor(
  rows: VisitRow[],
  buckets: Date[],
  bucket: Bucket,
): { at: Date; visitors: number; pageviews: number }[] {
  // Same snapping the buckets themselves were generated with, so a row always
  // lands in a bucket that exists rather than silently disappearing.
  const keyOf = (iso: string) => truncate(new Date(iso), bucket).getTime();

  const sessions = new Map<number, Set<string>>();
  const views = new Map<number, number>();

  for (const row of rows) {
    if (row.views <= 0) continue;

    const key = keyOf(row.hour);
    if (!sessions.has(key)) sessions.set(key, new Set());
    sessions.get(key)!.add(row.session_id);
    views.set(key, (views.get(key) ?? 0) + row.views);
  }

  return buckets.map((at) => ({
    at,
    visitors: sessions.get(at.getTime())?.size ?? 0,
    pageviews: views.get(at.getTime()) ?? 0,
  }));
}
