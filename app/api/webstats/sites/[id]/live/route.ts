import { NextResponse } from "next/server";
import { getServerUser } from "@/libs/supabase/get-server-user";
import { getSite } from "@/libs/webstats/sites";
import { getLiveVisitors } from "@/libs/webstats/live";

export const dynamic = "force-dynamic";

/** Live-visitor detail for the badge panel's preview — count, per-minute
 *  activity and a country breakdown. Same ownership pattern as
 *  /sites/[id]/online: loaded through the user-scoped client first, so
 *  someone else's site id reads as a 404 rather than leaking a live count. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id);

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const live = await getLiveVisitors(id);
    return NextResponse.json(live, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(
      "[webstats/live]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
