import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { getLiveVisitors } from "@/libs/webstats/live";
import { overBurstLimit } from "@/libs/webstats/limits";

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
 *  since unlike the dashboard's version this has no session behind it. */
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
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (siteError || !site) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
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
