/** Single-visitor timeline: sessions and page/track events merged into one
 *  ordered feed — "First visit — facebook / paid-social, viewed homepage,
 *  viewed pricing, signed up, returned through Google organic". Reads go
 *  through the user-scoped client; RLS scopes every table here to the
 *  caller's own sites. */

import { createClient } from "@/libs/supabase/server";
import type { AttributionSnapshot } from "./attribution";

export type JourneyEntry =
  | {
      kind: "session_start";
      at: string;
      sessionId: string;
      channel: string;
      source: string;
      medium: string;
      campaign: string | null;
      landingPath: string | null;
    }
  | {
      kind: "page";
      at: string;
      path: string;
    }
  | {
      kind: "track";
      at: string;
      name: string | null;
      properties: Record<string, unknown>;
    }
  | {
      kind: "identify";
      at: string;
      userId: string | null;
    };

export type VisitorSummary = {
  visitorId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  firstTouch: AttributionSnapshot;
  lastTouch: AttributionSnapshot;
  /** Every user_id this visitor has ever been linked to, most recent first. */
  userIds: string[];
};

export async function listRecentVisitors(
  siteId: string,
  limit = 25,
): Promise<VisitorSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webstats_visitors")
    .select("visitor_id, first_seen_at, last_seen_at, first_touch, last_touch")
    .eq("site_id", siteId)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list visitors: ${error.message}`);

  const rows = (data ?? []) as {
    visitor_id: string;
    first_seen_at: string;
    last_seen_at: string;
    first_touch: AttributionSnapshot;
    last_touch: AttributionSnapshot;
  }[];

  if (rows.length === 0) return [];

  const { data: links, error: linksError } = await supabase
    .from("webstats_identity_links")
    .select("visitor_id, user_id, linked_at")
    .eq("site_id", siteId)
    .in(
      "visitor_id",
      rows.map((r) => r.visitor_id),
    )
    .order("linked_at", { ascending: false });

  if (linksError) throw new Error(`Failed to load identity links: ${linksError.message}`);

  const userIdsByVisitor = new Map<string, string[]>();
  for (const link of (links ?? []) as { visitor_id: string; user_id: string }[]) {
    const existing = userIdsByVisitor.get(link.visitor_id) ?? [];
    if (!existing.includes(link.user_id)) existing.push(link.user_id);
    userIdsByVisitor.set(link.visitor_id, existing);
  }

  return rows.map((row) => ({
    visitorId: row.visitor_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    firstTouch: row.first_touch,
    lastTouch: row.last_touch,
    userIds: userIdsByVisitor.get(row.visitor_id) ?? [],
  }));
}

export async function getVisitorJourney(
  siteId: string,
  visitorId: string,
): Promise<JourneyEntry[]> {
  const supabase = await createClient();

  const [sessionsRes, eventsRes] = await Promise.all([
    supabase
      .from("webstats_sessions")
      .select("session_id, started_at, channel, source, medium, campaign, landing_path")
      .eq("site_id", siteId)
      .eq("visitor_id", visitorId)
      .order("started_at", { ascending: true }),
    supabase
      .from("webstats_identity_events")
      .select("event_type, name, path, properties, client_occurred_at, user_id")
      .eq("site_id", siteId)
      .eq("visitor_id", visitorId)
      .order("client_occurred_at", { ascending: true })
      .limit(2000),
  ]);

  if (sessionsRes.error) {
    throw new Error(`Failed to load sessions: ${sessionsRes.error.message}`);
  }
  if (eventsRes.error) {
    throw new Error(`Failed to load events: ${eventsRes.error.message}`);
  }

  const entries: JourneyEntry[] = [];

  for (const row of (sessionsRes.data ?? []) as {
    session_id: string;
    started_at: string;
    channel: string;
    source: string;
    medium: string;
    campaign: string | null;
    landing_path: string | null;
  }[]) {
    entries.push({
      kind: "session_start",
      at: row.started_at,
      sessionId: row.session_id,
      channel: row.channel,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      landingPath: row.landing_path,
    });
  }

  for (const row of (eventsRes.data ?? []) as {
    event_type: "page" | "track" | "identify";
    name: string | null;
    path: string;
    properties: Record<string, unknown>;
    client_occurred_at: string;
    user_id: string | null;
  }[]) {
    if (row.event_type === "page") {
      entries.push({ kind: "page", at: row.client_occurred_at, path: row.path });
    } else if (row.event_type === "identify") {
      entries.push({ kind: "identify", at: row.client_occurred_at, userId: row.user_id });
    } else {
      entries.push({
        kind: "track",
        at: row.client_occurred_at,
        name: row.name,
        properties: row.properties,
      });
    }
  }

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}
