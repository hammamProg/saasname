import { after } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { deriveSessionId, deriveVisitId } from "@/libs/webstats/identity";
import { parsePayload } from "@/libs/webstats/payload";
import { parseLocation, parseReferrer } from "@/libs/webstats/referrer";
import { activeSalts } from "@/libs/webstats/salts";
import { postgresSink } from "@/libs/webstats/sink";
import { isBot, parseUserAgent } from "@/libs/webstats/useragent";
import { overBurstLimit, overMonthlyQuota } from "@/libs/webstats/limits";
import { limitsForPlan, planForAccess } from "@/libs/plans";

/** Node, not Edge. Vercel's docs now recommend migrating off the Edge runtime,
 *  and `runtime = 'edge'` stops being supported in Next 16.3. Node also gets
 *  Fluid Compute's optimized concurrency, which is what makes a beacon that
 *  spends its life waiting on a database insert nearly free. */
export const runtime = "nodejs";

/** Pinned to the database region. Global edge placement would only add a hop
 *  before a write that has exactly one destination. */
export const preferredRegion = ["fra1"];

export const dynamic = "force-dynamic";

/** Every response is a 202 with an empty body.
 *
 *  Rejections are indistinguishable from acceptances on purpose. A beacon that
 *  learns it was refused is a beacon that retries, and this endpoint is called
 *  from other people's websites — it must never be a place where our problems
 *  become their problems. Real failures are logged server-side instead. */
function accepted(): Response {
  return new Response(null, {
    status: 202,
    headers: {
      // The tracker posts text/plain, which is a CORS simple request, so no
      // preflight ever fires. These headers cover the non-simple cases.
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

/** Vercel percent-encodes city names in the header, so `São Paulo` arrives as
 *  `S%C3%A3o%20Paulo` and would otherwise be stored mangled. */
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

  // Left-most entry is the client; Vercel overwrites this header so it cannot
  // be spoofed in production.
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** A beacon is a few hundred bytes. Anything approaching this is not a
 *  browser reporting a pageview, and parsing it would be work done on an
 *  unauthenticated caller's behalf. */
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request): Promise<Response> {
  const userAgent = request.headers.get("user-agent") ?? "";

  // Cheapest rejection first: no parse, no database round trip.
  if (isBot(userAgent)) return accepted();

  const ip = clientIp(request);

  // Before reading the body, so a flood costs as little as possible.
  if (overBurstLimit(ip)) return accepted();

  // Trusting Content-Length alone would be naive, but rejecting on it is
  // free and stops the obvious case before the body is read at all.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return accepted();

  let body: string;
  try {
    body = await request.text();
  } catch {
    return accepted();
  }

  if (body.length > MAX_BODY_BYTES) return accepted();

  const payload = parsePayload(body);
  if (!payload) return accepted();

  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("[webstats] ingest called without service-role credentials");
    return accepted();
  }

  const occurredAt = new Date();

  // The write happens after the response is sent. The visitor's browser never
  // waits on our database, and Fluid Compute does not bill while it waits.
  after(async () => {
    try {
      const { data: site, error } = await admin
        .from("webstats_sites")
        .select("id, domain, owner_id")
        .eq("id", payload.siteId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!site) return;

      const location = parseLocation(payload.url);
      const hostname = (() => {
        try {
          return new URL(payload.url).hostname.toLowerCase();
        } catch {
          return null;
        }
      })();

      // The site id is public — it sits in a script tag on a public page — so
      // the hostname check is what stops someone pointing a firehose at
      // another customer's site. Compared bare so www. does not fail it.
      const bare = hostname?.replace(/^www\./, "");
      if (!bare || bare !== site.domain.replace(/^www\./, "")) return;

      /* Plan quota. The site id is public and the hostname check only proves
         the beacon claims to be from the right domain — anyone who reads a
         customer's HTML can forge them. This is what bounds the cost of that:
         past the plan's monthly events the write is dropped, silently, so a
         traffic spike never makes a working install look broken. */
      const { data: profile } = await admin
        .from("profiles")
        .select("has_access")
        .eq("id", site.owner_id)
        .maybeSingle();

      const plan = planForAccess(profile?.has_access ?? false);
      const { monthlyEventLimit } = limitsForPlan(plan);

      if (await overMonthlyQuota(admin, site.id, monthlyEventLimit)) return;

      const salts = await activeSalts(admin);
      if (salts.length === 0) return;

      const sessionId = deriveSessionId(salts[0], {
        ip,
        userAgent,
        domain: site.domain,
      });

      const ua = parseUserAgent(userAgent);
      const referrer = parseReferrer(payload.referrer, site.domain);

      await postgresSink(admin).ingest([
        {
          siteId: site.id,
          occurredAt,
          sessionId,
          visitId: deriveVisitId(sessionId, occurredAt),
          eventType: payload.eventType,
          eventName: payload.eventName,
          hostname,
          path: location.path,
          query: location.query,
          pageTitle: payload.title,
          referrerDomain: referrer?.domain ?? null,
          referrerPath: referrer?.path ?? null,
          utmSource: location.utm.source,
          utmMedium: location.utm.medium,
          utmCampaign: location.utm.campaign,
          utmContent: location.utm.content,
          utmTerm: location.utm.term,
          browser: ua.browser,
          os: ua.os,
          device: ua.device,
          screen: payload.screen,
          language: payload.language,
          country: request.headers.get("x-vercel-ip-country"),
          region: request.headers.get("x-vercel-ip-country-region"),
          city: decodeHeader(request.headers.get("x-vercel-ip-city")),
          engagedMs: payload.engagedMs,
        },
      ]);
    } catch (error) {
      // Swallowed by design: the response has already gone out, and an ingest
      // failure is our incident, not the visitor's.
      console.error("[webstats] ingest failed", error);
    }
  });

  return accepted();
}
