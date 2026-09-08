import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { getLiveVisitors } from "@/libs/webstats/live";
import { overBurstLimit } from "@/libs/webstats/limits";
import {
  getEmbedAllowlist,
  isEmbedHostAllowed,
  refererHostname,
} from "@/libs/webstats/embed-domains";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** Public counterpart to /sites/[id]/live, read by the embeddable widget at
 *  app/embed/live/[id] — the one a customer pastes onto their own site, where
 *  there is no dashboard session to check ownership against.
 *
 *  No owner check on purpose: a site id is already public the moment the
 *  tracking snippet ships in the page's source, and what this returns (a
 *  count, a per-minute shape, country names) carries no more than that
 *  snippet already implies. Rate-limited per IP, same budget as /event,
 *  since unlike the dashboard's version this has no session behind it.
 *
 *  Referer-gated like the embed page, but against a different baseline: this
 *  is always fetched from *inside* our own iframe document, so a legitimate
 *  call's Referer is our own origin, not the customer's — the page already
 *  did the real check before rendering the widget that makes this call. What
 *  this guards against is someone skipping the page entirely and pointing
 *  their own site's JS straight at this URL; that request's Referer is their
 *  page, which has to clear the same allowlist the embed page uses. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(request);
  if (overBurstLimit(ip)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const { id } = await params;
  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }

  const { data: site, error: siteError } = await admin
    .from("webstats_sites")
    .select("id, domain")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; domain: string }>();

  if (siteError || !site) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const refererHost = refererHostname(request.headers.get("referer"));
  const requestHost = refererHostname(`https://${request.headers.get("host") ?? ""}`);
  const sameOrigin = refererHost !== null && refererHost === requestHost;

  if (!sameOrigin) {
    const allowlist = await getEmbedAllowlist(site.id);
    if (!isEmbedHostAllowed(refererHost, site.domain, allowlist)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  try {
    const live = await getLiveVisitors(id);
    return NextResponse.json(live, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(
      "[webstats/embed-live]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
