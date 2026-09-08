/** Acquisition reporting for the identity/attribution pipeline: unique
 *  visitors, sessions, events, new vs. returning, identified vs. anonymous,
 *  and breakdowns by channel/source/medium/campaign. Reads go through the
 *  user-scoped client — RLS is what actually enforces "your sites only"
 *  (036_webstats_identity_attribution.sql), the siteId parameter alone is
 *  not what makes this safe. */

import { createClient } from "@/libs/supabase/server";

export type AcquisitionSummary = {
  uniqueVisitors: number;
  sessions: number;
  pageviews: number;
  events: number;
  newVisitors: number;
  returningVisitors: number;
  identifiedSessions: number;
  anonymousSessions: number;
};

export type Breakdown = { label: string; sessions: number }[];

type SessionRow = {
  session_id: string;
  visitor_id: string;
  user_id: string | null;
  started_at: string;
  channel: string;
  source: string;
  medium: string;
  campaign: string | null;
  referrer_hostname: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  landing_path: string | null;
};

async function fetchSessions(
  siteId: string,
  from: Date,
  to: Date,
): Promise<SessionRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_sessions")
    .select(
      "session_id, visitor_id, user_id, started_at, channel, source, medium, campaign, referrer_hostname, country, device, browser, landing_path",
    )
    .eq("site_id", siteId)
    .gte("started_at", from.toISOString())
    .lte("started_at", to.toISOString())
    .limit(20_000);

  if (error) throw new Error(`Failed to load sessions: ${error.message}`);

  return (data ?? []) as SessionRow[];
}

export async function getAcquisitionSummary(
  siteId: string,
  from: Date,
  to: Date,
): Promise<AcquisitionSummary> {
  const supabase = await createClient();

  const sessions = await fetchSessions(siteId, from, to);
  const visitorIds = new Set(sessions.map((s) => s.visitor_id));

  const [{ count: pageviews }, { count: events }] = await Promise.all([
    supabase
      .from("webstats_identity_events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("event_type", "page")
      .gte("client_occurred_at", from.toISOString())
      .lte("client_occurred_at", to.toISOString()),
    supabase
      .from("webstats_identity_events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .gte("client_occurred_at", from.toISOString())
      .lte("client_occurred_at", to.toISOString()),
  ]);

  // "New" = this visitor's first-ever session started inside the range.
  // Requires a lookup against webstats_visitors, batched to avoid an
  // unbounded IN clause on a very active site.
  let newVisitors = 0;
  if (visitorIds.size > 0) {
    const ids = [...visitorIds];
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("webstats_visitors")
        .select("visitor_id, first_seen_at")
        .eq("site_id", siteId)
        .in("visitor_id", ids.slice(i, i + CHUNK));

      if (error) throw new Error(`Failed to load visitors: ${error.message}`);

      for (const row of (data ?? []) as { visitor_id: string; first_seen_at: string }[]) {
        const firstSeen = new Date(row.first_seen_at);
        if (firstSeen >= from && firstSeen <= to) newVisitors += 1;
      }
    }
  }

  const identifiedSessions = sessions.filter((s) => s.user_id).length;

  return {
    uniqueVisitors: visitorIds.size,
    sessions: sessions.length,
    pageviews: pageviews ?? 0,
    events: events ?? 0,
    newVisitors,
    returningVisitors: Math.max(0, visitorIds.size - newVisitors),
    identifiedSessions,
    anonymousSessions: sessions.length - identifiedSessions,
  };
}

function breakdownBy(
  sessions: SessionRow[],
  pick: (row: SessionRow) => string | null,
  limit = 10,
): Breakdown {
  const counts = new Map<string, number>();
  for (const row of sessions) {
    const label = pick(row) || "(none)";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, sessionsCount]) => ({ label, sessions: sessionsCount }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

export type AcquisitionBreakdowns = {
  channel: Breakdown;
  source: Breakdown;
  medium: Breakdown;
  campaign: Breakdown;
  referrer: Breakdown;
  country: Breakdown;
  device: Breakdown;
  browser: Breakdown;
  landingPage: Breakdown;
};

export async function getAcquisitionBreakdowns(
  siteId: string,
  from: Date,
  to: Date,
): Promise<AcquisitionBreakdowns> {
  const sessions = await fetchSessions(siteId, from, to);

  return {
    channel: breakdownBy(sessions, (s) => s.channel),
    source: breakdownBy(sessions, (s) => s.source),
    medium: breakdownBy(sessions, (s) => s.medium),
    campaign: breakdownBy(sessions, (s) => s.campaign),
    referrer: breakdownBy(sessions, (s) => s.referrer_hostname),
    country: breakdownBy(sessions, (s) => s.country),
    device: breakdownBy(sessions, (s) => s.device),
    browser: breakdownBy(sessions, (s) => s.browser),
    landingPage: breakdownBy(sessions, (s) => s.landing_path),
  };
}
