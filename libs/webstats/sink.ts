/** Where accepted events go.
 *
 *  The interface exists so the storage tier can be replaced without touching
 *  ingest or the dashboard. Postgres is correct up to roughly 10M events a
 *  month; past that the raw tier moves to a columnar store (Tinybird, or
 *  ClickHouse directly) while the rollup tables and every query above them
 *  stay exactly as they are. Keeping that a swap rather than a rewrite is the
 *  entire reason this file is one function wide. */

import type { SupabaseClient } from "@supabase/supabase-js";

export type WebstatsEvent = {
  siteId: string;
  occurredAt: Date;
  sessionId: string;
  visitId: string;
  eventType: 1 | 2 | 3;
  eventName: string | null;
  hostname: string | null;
  path: string;
  query: string | null;
  pageTitle: string | null;
  referrerDomain: string | null;
  referrerPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  screen: string | null;
  language: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  engagedMs: number | null;
};

export interface EventSink {
  ingest(events: WebstatsEvent[]): Promise<void>;
}

function toRow(event: WebstatsEvent) {
  return {
    site_id: event.siteId,
    occurred_at: event.occurredAt.toISOString(),
    session_id: event.sessionId,
    visit_id: event.visitId,
    event_type: event.eventType,
    event_name: event.eventName,
    hostname: event.hostname,
    path: event.path,
    query: event.query,
    page_title: event.pageTitle,
    referrer_domain: event.referrerDomain,
    referrer_path: event.referrerPath,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    utm_content: event.utmContent,
    utm_term: event.utmTerm,
    browser: event.browser,
    os: event.os,
    device: event.device,
    screen: event.screen,
    language: event.language,
    country: event.country,
    region: event.region,
    city: event.city,
    engaged_ms: event.engagedMs,
  };
}

/** One row per beacon, written with the service role.
 *
 *  No batching: at MVP volume this is a couple of writes a second, and
 *  buffering in module scope on serverless is unreliable — instances are
 *  recycled without warning and the buffered tail is lost silently. Batching
 *  belongs in a long-lived process, which is a Phase 2 concern. */
export function postgresSink(admin: SupabaseClient): EventSink {
  return {
    async ingest(events) {
      if (events.length === 0) return;

      const { error } = await admin
        .from("webstats_events")
        .insert(events.map(toRow));

      if (error) {
        throw new Error(`Failed to write events: ${error.message}`);
      }
    },
  };
}
