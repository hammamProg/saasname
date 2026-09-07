import { NextResponse } from "next/server";
import { getServerUser } from "@/libs/supabase/get-server-user";
import { getSite } from "@/libs/webstats/sites";
import { getOnlineVisitors } from "@/libs/webstats/online";

export const dynamic = "force-dynamic";

/** How many visitors are on the site right now.
 *
 *  Ownership is enforced by loading the site through the user-scoped client
 *  first: RLS answers "not yours" as "not found", so someone else's site id
 *  reads as a 404 rather than leaking a live visitor count. */
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
    return NextResponse.json(
      { online: await getOnlineVisitors(id) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[webstats/online]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
