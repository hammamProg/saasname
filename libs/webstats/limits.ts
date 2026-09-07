/** Abuse controls for the public ingest endpoint.
 *
 *  `/api/webstats/event` is unauthenticated, CORS-open, and writes to the
 *  database on every accepted call. A site id is public by design — it sits in
 *  a script tag on a public page — so anyone who reads a customer's HTML can
 *  forge beacons for that domain. The hostname check stops them writing into a
 *  *different* tenant, but nothing stopped them writing without limit.
 *
 *  Two controls, deliberately different in kind:
 *
 *  1. A per-IP burst limiter, in memory. Cheap, and it blunts a single
 *     attacker hammering the endpoint.
 *  2. A per-site monthly quota, from the plan. This is the one that actually
 *     bounds cost, because it survives an attacker rotating IPs.
 *
 *  Neither is a substitute for an edge rate limit. Vercel's WAF has a free
 *  fixed-window rule that should also be pointed at this path; these run after
 *  the request has already reached a function, so they cap damage rather than
 *  preventing the invocation. */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Per-IP burst window. Generous, because a real visitor on a busy SPA can
 *  legitimately fire a pageview plus several engagement beacons in a minute,
 *  and several people can share one NAT address. */
const BURST_WINDOW_MS = 60_000;
const BURST_MAX = 120;

/** How long a quota verdict is trusted before re-checking. The check is a
 *  database round trip, so doing it per beacon would cost more than the write
 *  it guards. A site can overshoot by at most one instance-minute of traffic. */
const QUOTA_TTL_MS = 60_000;

type Bucket = { count: number; resetAt: number };

/* Module scope, so this is per serverless instance rather than global. That is
   a real weakness — an attacker spread across instances gets a higher
   effective ceiling — and the reason the per-site quota exists alongside it.
   A shared store (Redis) would be exact, and is the upgrade when it matters. */
const buckets = new Map<string, Bucket>();
const quota = new Map<string, { overQuota: boolean; checkedAt: number }>();

/** Whether this IP has exceeded its burst allowance. */
export function overBurstLimit(ip: string, now = Date.now()): boolean {
  const existing = buckets.get(ip);

  if (!existing || now >= existing.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + BURST_WINDOW_MS });

    // Opportunistic sweep. Without it the map grows for every IP ever seen and
    // becomes its own memory-exhaustion vector.
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) {
        if (now >= bucket.resetAt) buckets.delete(key);
      }
    }

    return false;
  }

  existing.count += 1;

  return existing.count > BURST_MAX;
}

/** Whether the site has used up its plan's monthly events.
 *
 *  Errors resolve to "not over quota". Losing a customer's data because the
 *  quota check itself failed is worse than briefly exceeding a limit. */
export async function overMonthlyQuota(
  admin: SupabaseClient,
  siteId: string,
  limit: number,
  now = Date.now(),
): Promise<boolean> {
  const cached = quota.get(siteId);

  if (cached && now - cached.checkedAt < QUOTA_TTL_MS) {
    return cached.overQuota;
  }

  try {
    const { data, error } = await admin.rpc("webstats_month_events", {
      p_site_id: siteId,
    });

    if (error) throw new Error(error.message);

    const used = Number(data ?? 0);
    const overQuota = used >= limit;

    quota.set(siteId, { overQuota, checkedAt: now });

    return overQuota;
  } catch (error) {
    console.error("[webstats] quota check failed", error);
    return false;
  }
}

/** Test seam. The caches are module state, which would otherwise leak between
 *  cases and make the tests order-dependent. */
export function resetLimitsForTest(): void {
  buckets.clear();
  quota.clear();
}
