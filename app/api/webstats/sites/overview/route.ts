import { NextResponse } from "next/server";
import { getServerUser } from "@/libs/supabase/get-server-user";
import { getSiteOverviews } from "@/libs/webstats/overview";

export const dynamic = "force-dynamic";

/** Status for every site the caller owns, for the list's live refresh.
 *
 *  No site id in the path: the underlying function already scopes to the
 *  signed-in user, and one call for the whole list is the point. */
export async function GET() {
  const user = await getServerUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      { sites: await getSiteOverviews() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[webstats/overview]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
