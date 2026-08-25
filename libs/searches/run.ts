import { createSupabaseAdmin } from "@/libs/supabase";
import { runProbe } from "@/libs/probes/run";
import { ALL_PROBES } from "@/libs/probes/registry";
import type { PlatformProbe } from "@/libs/probes/types";
import { rollUp, scoreCheck, type ScoredCheck } from "@/libs/scoring/verdict";
import { explainVerdicts } from "@/libs/scoring/explain";
import { createDeepSeekProvider, isDeepSeekConfigured } from "@/libs/llm/deepseek";
import type { TargetPlatform } from "@/libs/names/generate";

export const CONCURRENCY = 6;
export const CIRCUIT_BREAKER_THRESHOLD = 3;
/** A run untouched for this long is treated as dead and may be resumed. */
export const STALE_RUN_MS = 2 * 60 * 1000;

export type ProgressEvent =
  | { type: "check"; candidateId: string; platform: string; status: string; done: number; total: number }
  | { type: "done"; searchId: string; refunded: number };

/** Runs `tasks` with at most `limit` in flight. */
async function pooled<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/**
 * Executes every pending check for a search, then scores, explains, refunds and
 * closes it out.
 *
 * Split out of creation so the POST can return a search id immediately and the
 * work can happen on a connection the user is not blocked on. Six probes across
 * eight candidates is 48 outbound calls, which does not fit in one request.
 *
 * `onProgress` is best-effort telemetry for the client. Every result is written
 * to the database first, so a disconnected client loses the live view and
 * nothing else.
 */
export async function runSearchProbes(
  searchId: string,
  onProgress?: (event: ProgressEvent) => void,
  probes: readonly PlatformProbe[] = ALL_PROBES
): Promise<{ refunded: number }> {
  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Supabase admin client unavailable");
  }

  const { data: search } = await admin
    .from("searches")
    .select("id, user_id, target_platform, status, updated_at")
    .eq("id", searchId)
    .maybeSingle();

  if (!search) throw new Error(`Search ${searchId} not found`);

  if (search.status === "complete" || search.status === "failed") {
    return { refunded: 0 };
  }

  // Two tabs on the same report would otherwise both drive the run and double
  // the outbound API spend. A run already in flight is left alone -- unless it
  // has gone quiet long enough to be considered dead, in which case a reload
  // is allowed to resume it rather than leaving the search stuck forever.
  if (search.status === "running") {
    const lastTouched = new Date(String(search.updated_at)).getTime();
    if (Number.isFinite(lastTouched) && Date.now() - lastTouched < STALE_RUN_MS) {
      return { refunded: 0 };
    }
  }

  await admin.from("searches").update({ status: "running" }).eq("id", searchId);

  const { data: rows } = await admin
    .from("candidates")
    .select("id, name, normalized_name")
    .eq("search_id", searchId);

  const candidates = rows ?? [];

  const consecutiveFailures = new Map<string, number>();
  const tripped = new Set<string>();
  const total = candidates.length * probes.length;
  let done = 0;

  const tasks = candidates.flatMap((row) =>
    probes.map((probe) => async () => {
      const settled = tripped.has(probe.id)
        ? { platform: probe.id, status: "skipped" as const, signals: {}, cached: false }
        : await runProbe(probe, row.name as string);

      if (settled.status === "failed") {
        const count = (consecutiveFailures.get(probe.id) ?? 0) + 1;
        consecutiveFailures.set(probe.id, count);
        if (count >= CIRCUIT_BREAKER_THRESHOLD) tripped.add(probe.id);
      } else if (settled.status === "ok") {
        consecutiveFailures.set(probe.id, 0);
      }

      const scored = scoreCheck(settled as ScoredCheck);

      // Written before the event is emitted, so the database is the source of
      // truth and a dropped connection costs only the live view.
      await admin
        .from("checks")
        .update({
          status: settled.status,
          signals: settled.signals,
          verdict: scored.verdict,
          strength: scored.strength,
          evidence_url: "evidenceUrl" in settled ? (settled.evidenceUrl ?? null) : null,
          error: "error" in settled ? (settled.error ?? null) : null,
          fetched_at: new Date().toISOString(),
        })
        .eq("candidate_id", row.id as string)
        .eq("platform", probe.id);

      done += 1;
      onProgress?.({
        type: "check",
        candidateId: row.id as string,
        platform: probe.id,
        status: settled.status,
        done,
        total,
      });

      return { candidateId: row.id as string, settled };
    })
  );

  const settledAll = await pooled(tasks, CONCURRENCY);

  const verdicts = candidates.map((row) => ({
    row,
    verdict: rollUp(
      settledAll
        .filter((s) => s.candidateId === row.id)
        .map(({ settled }) => settled as ScoredCheck),
      search.target_platform as TargetPlatform
    ),
  }));

  const explanations = isDeepSeekConfigured()
    ? await explainVerdicts(
        createDeepSeekProvider(),
        verdicts.map((v) => ({ name: v.row.name as string, verdict: v.verdict }))
      )
    : new Map<string, string>();

  for (const { row, verdict } of verdicts) {
    await admin
      .from("candidates")
      .update({
        verdict: verdict.verdict,
        score: verdict.score,
        explanation: explanations.get(row.name as string) ?? null,
      })
      .eq("id", row.id as string);
  }

  // Only core failures are refundable. A best-effort probe that could not
  // answer is expected behaviour, not a service failure the user paid for.
  const coreIds = new Set(probes.filter((p) => p.tier === "core").map((p) => p.id));
  const refundedRows = candidates.filter((row) =>
    settledAll.some(
      ({ candidateId, settled }) =>
        candidateId === row.id &&
        coreIds.has(settled.platform) &&
        settled.status !== "ok"
    )
  );

  for (const row of refundedRows) {
    await admin.rpc("grant_credits", {
      p_user_id: search.user_id as string,
      p_amount: 1,
      p_reason: `refund:${searchId}:${row.normalized_name}`,
    });
  }

  await admin
    .from("searches")
    .update({
      status:
        refundedRows.length === candidates.length && candidates.length > 0
          ? "failed"
          : "complete",
    })
    .eq("id", searchId);

  onProgress?.({ type: "done", searchId, refunded: refundedRows.length });

  return { refunded: refundedRows.length };
}
