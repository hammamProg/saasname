/** Write path for the identity/attribution pipeline.
 *
 *  Called from both the public collection endpoint
 *  (app/api/webstats/collect/route.ts) and the server-side identify endpoint
 *  (app/api/webstats/identify/route.ts) so the two never disagree about what
 *  an identify() call actually does. Always goes through the service-role
 *  client — these tables have no `authenticated`/`anon` write policy, same
 *  trust model as `webstats_events`. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveAttribution, type AttributionSnapshot } from "./attribution";
import { sanitizeUrl } from "./sanitize";
import type { CollectPayload } from "./collect-payload";

export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

export type UaInfo = {
  browser: string | null;
  os: string | null;
  device: string | null;
};

type VisitorRow = {
  first_touch: AttributionSnapshot;
  last_non_direct: AttributionSnapshot | null;
};

/** Insert-or-update a visitor. First-touch is written once, on insert, and
 *  never touched again. Last-touch is overwritten by every new session,
 *  including direct ones. Last-non-direct is overwritten only when the new
 *  session is not Direct, so a later direct visit can never erase it. */
async function upsertVisitor(
  admin: SupabaseClient,
  siteId: string,
  visitorId: string,
  snapshot: AttributionSnapshot | null,
  now: string,
): Promise<void> {
  if (!snapshot) {
    // Not a new session: just extend last_seen_at. Ignored if the visitor
    // row does not exist yet — that would mean a page/track call arrived
    // before its session's first "newSession" call, which the SDK never
    // does, but a malformed/replayed request should not throw.
    await admin
      .from("webstats_visitors")
      .update({ last_seen_at: now })
      .eq("site_id", siteId)
      .eq("visitor_id", visitorId);
    return;
  }

  const { data: existing } = await admin
    .from("webstats_visitors")
    .select("first_touch, last_non_direct")
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId)
    .maybeSingle<VisitorRow>();

  const isDirect = snapshot.channel === "Direct";

  if (!existing) {
    await admin.from("webstats_visitors").insert({
      site_id: siteId,
      visitor_id: visitorId,
      first_seen_at: now,
      last_seen_at: now,
      first_touch: snapshot,
      last_touch: snapshot,
      last_non_direct: isDirect ? null : snapshot,
    });
    return;
  }

  await admin
    .from("webstats_visitors")
    .update({
      last_seen_at: now,
      last_touch: snapshot,
      ...(isDirect ? {} : { last_non_direct: snapshot }),
    })
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId);
}

/** First write wins. A retried "new session" beacon must not re-derive or
 *  overwrite a session's already-stored source. */
async function insertSession(
  admin: SupabaseClient,
  payload: CollectPayload,
  snapshot: AttributionSnapshot,
  geo: GeoInfo,
  ua: UaInfo,
  startedAt: string,
): Promise<void> {
  await admin.from("webstats_sessions").upsert(
    {
      session_id: payload.sessionId,
      site_id: payload.siteId,
      visitor_id: payload.visitorId,
      user_id: payload.userId,
      started_at: startedAt,
      last_activity_at: startedAt,
      landing_url: snapshot.landingUrl,
      landing_path: snapshot.landingPath,
      referrer_url: snapshot.referrerUrl,
      referrer_hostname: snapshot.referrerHostname,
      utm_source: snapshot.raw.utmSource,
      utm_medium: snapshot.raw.utmMedium,
      utm_campaign: snapshot.raw.utmCampaign,
      utm_term: snapshot.raw.utmTerm,
      utm_content: snapshot.raw.utmContent,
      click_ids: snapshot.clickIds,
      source: snapshot.source,
      medium: snapshot.medium,
      campaign: snapshot.campaign,
      channel: snapshot.channel,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
    },
    { onConflict: "site_id,session_id", ignoreDuplicates: true },
  );
}

async function touchSession(
  admin: SupabaseClient,
  siteId: string,
  sessionId: string,
  now: string,
): Promise<void> {
  await admin
    .from("webstats_sessions")
    .update({ last_activity_at: now })
    .eq("site_id", siteId)
    .eq("session_id", sessionId);
}

/** Append-only: a repeat identify() for the same (visitor, user) pair is a
 *  no-op thanks to the unique index on that pair (038_webstats_identity_links_index_fix.sql),
 *  not a new row. */
async function linkIdentity(
  admin: SupabaseClient,
  siteId: string,
  visitorId: string,
  userId: string,
): Promise<void> {
  await admin.from("webstats_identity_links").upsert(
    { site_id: siteId, visitor_id: visitorId, user_id: userId },
    { onConflict: "site_id,visitor_id,user_id", ignoreDuplicates: true },
  );
}

/** Stamps the session's user_id the first time identify() fires during it.
 *  Never overwrites an existing value — a session belongs to one user for
 *  its whole duration, and a mid-session identify() should not silently
 *  reassign a session that already had a user (an app calling identify()
 *  again for the same person is idempotent by construction here, since the
 *  value would be identical; this guard exists for the shared-device case,
 *  where reset() should have been called before a different identify()). */
async function stampSessionUserIfUnset(
  admin: SupabaseClient,
  siteId: string,
  sessionId: string,
  userId: string,
): Promise<void> {
  await admin
    .from("webstats_sessions")
    .update({ user_id: userId })
    .eq("site_id", siteId)
    .eq("session_id", sessionId)
    .is("user_id", null);
}

async function insertIdentityEvent(
  admin: SupabaseClient,
  payload: CollectPayload,
  cleanUrl: string,
): Promise<void> {
  let path = "/";
  try {
    path = new URL(cleanUrl).pathname || "/";
  } catch {
    // Keep the default.
  }

  await admin.from("webstats_identity_events").upsert(
    {
      site_id: payload.siteId,
      visitor_id: payload.visitorId,
      session_id: payload.sessionId,
      user_id: payload.userId,
      event_type: payload.type,
      name: payload.type === "track" ? payload.name : null,
      path,
      url: cleanUrl,
      properties: payload.properties ?? {},
      event_id: payload.eventId,
      client_occurred_at: new Date(payload.clientTimestamp).toISOString(),
    },
    { onConflict: "site_id,event_id", ignoreDuplicates: true },
  );
}

export async function ingestCollectEvent(
  admin: SupabaseClient,
  payload: CollectPayload,
  siteDomain: string,
  ignoredReferrerDomains: string[],
  geo: GeoInfo,
  ua: UaInfo,
): Promise<void> {
  const cleanUrl = sanitizeUrl(payload.url) ?? payload.url;
  const cleanReferrer = payload.referrer ? sanitizeUrl(payload.referrer) : null;
  const now = new Date(payload.clientTimestamp).toISOString();

  const snapshot = payload.newSession
    ? deriveAttribution({
        pageUrl: cleanUrl,
        referrerUrl: cleanReferrer,
        siteDomain,
        ignoredReferrerDomains,
      })
    : null;

  await upsertVisitor(admin, payload.siteId, payload.visitorId, snapshot, now);

  if (snapshot) {
    await insertSession(admin, payload, snapshot, geo, ua, now);
  } else {
    await touchSession(admin, payload.siteId, payload.sessionId, now);
  }

  if (payload.userId) {
    await linkIdentity(admin, payload.siteId, payload.visitorId, payload.userId);
    await stampSessionUserIfUnset(admin, payload.siteId, payload.sessionId, payload.userId);
  }

  await insertIdentityEvent(admin, payload, cleanUrl);
}

/** Server-side identify(): the same identity link + session-stamping logic
 *  as a client identify() call, without a page/event to attach. Used by
 *  app/api/webstats/identify/route.ts. */
export async function serverIdentify(
  admin: SupabaseClient,
  siteId: string,
  visitorId: string,
  userId: string,
): Promise<void> {
  await linkIdentity(admin, siteId, visitorId, userId);

  const now = new Date().toISOString();
  await admin
    .from("webstats_visitors")
    .update({ last_seen_at: now })
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId);
}
