import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { verifyCronRequest } from "@/libs/trends/verify-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual trigger for the analytics maintenance job.
 *
 *  Nothing schedules this. The job runs on `pg_cron` inside Postgres every
 *  five minutes (see 027_webstats_pg_cron.sql) because it is pure SQL: that
 *  works on any Vercel plan, costs no function invocations, and keeps running
 *  when the app does not. This route exists so the same work can be forced by
 *  hand during a backfill or while debugging. */
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
    // Same entry point pg_cron calls, so a manual run and a scheduled run
    // cannot drift apart.
    const { data, error } = await admin.rpc("webstats_maintenance");

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "[webstats/rollup]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "rollup failed" }, { status: 500 });
  }
}
