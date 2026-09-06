/**
 * Runs the whole trend pipeline once, on demand.
 *
 * In production every step is a Vercel Cron hitting a route. That leaves no
 * way to populate a fresh database — a new environment shows an empty feed
 * until the first nightly run, which is indistinguishable from a broken
 * install. This script is that missing first run.
 *
 *   npm run trends:run          # ingest everything, then cluster/score/summarize
 *   npm run trends:run -- --ingest-only
 *   npm run trends:run -- --pipeline-only
 *
 * Reads .env.local via node's --env-file (see the npm script), so it uses the
 * same credentials the app does. Safe to re-run: ingestion dedupes on
 * content_hash and every pipeline step is idempotent over "rows still needing
 * work".
 */
import { ALL_CONNECTORS } from "@/libs/trends/connectors/registry";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { ingestSignals } from "@/libs/trends/ingest";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";
import { summarizeTopicsNeedingSummary } from "@/libs/trends/summarize";

function log(...parts: unknown[]) {
  // A CLI script is exactly the place console output belongs.
  // eslint-disable-next-line no-console
  console.log(...parts);
}

async function ingestAll(): Promise<number> {
  log("\n── Ingest ─────────────────────────────────────────────");
  let total = 0;

  for (const connector of ALL_CONNECTORS) {
    if (!isConnectorEnabled(connector.id)) {
      log(`  ${connector.id.padEnd(15)} skipped (kill switch)`);
      continue;
    }

    const startedAt = Date.now();

    try {
      const signals = await connector.fetchSignals();
      const { inserted, skipped } = await ingestSignals(connector.id, signals);
      total += inserted;
      log(
        `  ${connector.id.padEnd(15)} ${String(inserted).padStart(4)} new, ` +
          `${String(skipped).padStart(4)} dupe  (${Date.now() - startedAt}ms)`
      );
    } catch (error) {
      // One source failing must never stop the others — same contract the
      // cron routes have.
      log(
        `  ${connector.id.padEnd(15)} FAILED: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  log(`  ${"total".padEnd(15)} ${total} new signals`);
  return total;
}

async function runPipeline() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    log(
      "\n✗ OPENAI_API_KEY is not set.\n" +
        "  Clustering turns signals into topics using embeddings, so without it\n" +
        "  signals are stored but no topic is ever created and the feed stays\n" +
        "  empty. Add OPENAI_API_KEY to .env.local and re-run."
    );
    process.exitCode = 1;
    return;
  }

  log("\n── Cluster ────────────────────────────────────────────");
  const cluster = await clusterUnclusteredSignals();
  log(`  ${cluster.clustered} signals clustered, ${cluster.newTopics} new topics`);

  log("\n── Snapshot + score ───────────────────────────────────");
  const snapshot = await runDailySnapshotAndScore();
  log(`  ${snapshot.topicsProcessed} topics scored`);

  log("\n── Summarize ──────────────────────────────────────────");
  const summary = await summarizeTopicsNeedingSummary();
  log(`  ${summary.summarized} topics summarized`);
}

async function main() {
  const args = process.argv.slice(2);
  const ingestOnly = args.includes("--ingest-only");
  const pipelineOnly = args.includes("--pipeline-only");

  if (!pipelineOnly) {
    await ingestAll();
  }

  if (!ingestOnly) {
    await runPipeline();
  }

  log("\nDone.\n");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("\nPipeline run failed:", error);
  process.exit(1);
});
