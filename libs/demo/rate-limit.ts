import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/libs/supabase";

/** Per source, per rolling window. Enough to try a couple of names you care
 *  about, not enough to use the demo instead of the product. */
export const PER_IP_LIMIT = 3;

/** A ceiling on what an unauthenticated internet can spend of our API quota in
 *  a day. Without it the demo is an open faucet on someone else's bill. */
export const GLOBAL_DAILY_LIMIT = 400;

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: "per_ip" | "global" };

/** Salted digest, never the address itself. Counting requests from one source
 *  does not require keeping something that identifies the person.
 *
 *  The salt has its own variable rather than borrowing NEXTAUTH_SECRET: this
 *  app authenticates through Supabase, so that name is a leftover, and tying a
 *  live privacy control to a dead variable is how it ends up unset in
 *  production. Unset falls back to a constant, which still prevents a plain
 *  rainbow-table lookup of the address space but is worth setting properly. */
export function hashIp(ip: string): string {
  const salt = process.env.DEMO_IP_SALT ?? "saasname-demo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Best-effort client address. Behind Vercel the left-most x-forwarded-for
 *  entry is the client; everything after it is proxy hops. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Checks both limits before any probe runs.
 *
 * Fails closed. If the ledger cannot be read we cannot know how much has
 * already been spent, and the safe answer for a route that costs money is no.
 */
export async function checkDemoRateLimit(ipHash: string): Promise<RateLimitResult> {
  const admin = createSupabaseAdmin();
  if (!admin) return { allowed: false, reason: "global" };

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const [perIp, global] = await Promise.all([
    admin
      .from("demo_checks")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since),
    admin
      .from("demo_checks")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  if (perIp.error || global.error) {
    return { allowed: false, reason: "global" };
  }

  if ((global.count ?? 0) >= GLOBAL_DAILY_LIMIT) {
    return { allowed: false, reason: "global" };
  }

  const used = perIp.count ?? 0;
  if (used >= PER_IP_LIMIT) {
    return { allowed: false, reason: "per_ip" };
  }

  return { allowed: true, remaining: PER_IP_LIMIT - used - 1 };
}

/** Recorded after a successful run, so a failure that cost nothing does not
 *  consume the visitor's allowance. */
export async function recordDemoCheck(
  ipHash: string,
  normalizedName: string
): Promise<void> {
  const admin = createSupabaseAdmin();
  if (!admin) return;

  await admin
    .from("demo_checks")
    .insert({ ip_hash: ipHash, normalized_name: normalizedName });
}
