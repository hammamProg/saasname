import { NextResponse } from "next/server";
import { getServerUser } from "@/libs/supabase/get-server-user";
import { getSite, hasReceivedEvents } from "@/libs/webstats/sites";

/** Has this site received any traffic yet? Polled by the install screen.
 *
 *  Ownership is enforced by RLS through the user-scoped client, so a site that
 *  belongs to someone else reads as missing rather than forbidden. */
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

  return NextResponse.json({ installed: await hasReceivedEvents(id) });
}
