import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/libs/supabase";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { matchTopicsForAllSites } from "@/libs/webstats/topic-match";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Recompute which trend topics each site's traffic is touching.
 *
 *  Weekly, not nightly: topic embeddings move slowly and a site's page mix
 *  moves slower still, so a daily run would spend an embedding call per site
 *  to produce the same answer. Scheduled from pg_cron via pg_net like the
 *  other ingest jobs — see docs/SCHEDULED_JOBS.md. */
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
    const results = await matchTopicsForAllSites(admin);

    return NextResponse.json({
      sites: results.length,
      alias: results.reduce((n, r) => n + r.aliasMatches, 0),
      semantic: results.reduce((n, r) => n + r.semanticMatches, 0),
      skipped: results.filter((r) => r.skipped).length,
    });
  } catch (error) {
    console.error(
      "[webstats/match-topics]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "match failed" }, { status: 500 });
  }
}
