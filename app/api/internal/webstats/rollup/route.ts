import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { destroyExpiredSalts } from "@/libs/webstats/salts";
import { verifyCronRequest } from "@/libs/trends/verify-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Rolls raw events into the tables the dashboard reads, and destroys salts
 *  past their 48-hour window.
 *
 *  Scheduled rather than done on the write path: the aggregation is a handful
 *  of statements over a few minutes of data, and doing it per beacon would put
 *  a grouped query in front of every visitor's pageview.
 *
 *  Salt destruction rides along here because it belongs on a schedule and
 *  running it from ingest would make the hot path pay for housekeeping. */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 500 },
    );
  }

  try {
    const { data, error } = await admin.rpc("webstats_rollup");

    if (error) throw new Error(error.message);

    // The next month's partition is created a few days ahead of time, so a
    // month boundary never arrives to find nowhere to write.
    await admin.rpc("webstats_ensure_partition", {
      at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const saltsDestroyed = await destroyExpiredSalts(admin);

    return NextResponse.json({ rollup: data, saltsDestroyed });
  } catch (error) {
    console.error(
      "[webstats/rollup]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "rollup failed" }, { status: 500 });
  }
}
