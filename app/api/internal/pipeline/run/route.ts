import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";
import { summarizeTopicsNeedingSummary } from "@/libs/trends/summarize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Runs the three pipeline steps in order (cluster → snapshot/score →
 *  summarize) as a single nightly cron job. Each step is independently
 *  fault-tolerant internally; a step throwing here still lets a subsequent
 *  cron run retry from wherever it left off, since every step is idempotent
 *  over "rows still needing work." */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const clusterResult = await clusterUnclusteredSignals();
    const snapshotResult = await runDailySnapshotAndScore();
    const summaryResult = await summarizeTopicsNeedingSummary();

    return NextResponse.json({ clusterResult, snapshotResult, summaryResult });
  } catch (error) {
    console.error("[pipeline/run]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "pipeline failed" }, { status: 500 });
  }
}
