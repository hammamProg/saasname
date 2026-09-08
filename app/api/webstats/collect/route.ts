import { after } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { parseCollectPayload } from "@/libs/webstats/collect-payload";
import { ingestCollectEvent } from "@/libs/webstats/collect";
import { isBot, parseUserAgent } from "@/libs/webstats/useragent";
import { overBurstLimit } from "@/libs/webstats/limits";

/** Collection endpoint for the identity/attribution/goal pipeline —
 *  `analytics.page()/track()/goal()/identify()`.
 *
 *  Deliberately separate from /api/webstats/event, which keeps powering the
 *  existing cookieless dashboard untouched. This endpoint writes to
 *  webstats_visitors/sessions/identity_links/identity_events/goal_completions
 *  only — see libs/webstats/collect.ts. */

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];
export const dynamic = "force-dynamic";

function accepted(): Response {
  return new Response(null, {
    status: 202,
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** Same cap philosophy as /event: a beacon carrying custom properties is
 *  still small. Larger than this is not analytics data. */
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request): Promise<Response> {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return accepted();

  const ip = clientIp(request);
  if (overBurstLimit(ip)) return accepted();

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return accepted();

  let body: string;
  try {
    body = await request.text();
  } catch {
    return accepted();
  }
  if (body.length > MAX_BODY_BYTES) return accepted();

  const payload = parseCollectPayload(body);
  if (!payload) return accepted();

  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("[webstats] collect called without service-role credentials");
    return accepted();
  }

  // Read once, outside `after()`, so the values are still the request's own
  // and not whatever they happen to be by the time the response has already
  // gone out.
  const geo = {
    country: request.headers.get("x-vercel-ip-country"),
    region: request.headers.get("x-vercel-ip-country-region"),
    city: decodeHeader(request.headers.get("x-vercel-ip-city")),
  };
  const ua = parseUserAgent(userAgent);

  after(async () => {
    try {
      const { data: site, error } = await admin
        .from("webstats_sites")
        .select("id, domain, ignored_referrer_domains")
        .eq("id", payload.siteId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!site) return;

      // Same hostname check as /event: the site id is public, so this is
      // what stops someone pointing a firehose at another customer's site.
      const hostname = (() => {
        try {
          return new URL(payload.url).hostname.toLowerCase();
        } catch {
          return null;
        }
      })();
      const bare = hostname?.replace(/^www\./, "");
      if (!bare || bare !== site.domain.replace(/^www\./, "")) return;

      await ingestCollectEvent(
        admin,
        payload,
        site.domain,
        (site.ignored_referrer_domains as string[] | null) ?? [],
        geo,
        ua,
      );
    } catch (error) {
      console.error("[webstats] collect ingest failed", error);
    }
  });

  return accepted();
}
