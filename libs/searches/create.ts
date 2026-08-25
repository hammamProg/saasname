import { createSupabaseAdmin } from "@/libs/supabase";
import { spendCredits } from "@/libs/credits/spend";
import { normalizeName } from "@/libs/names/normalize";
import { runProbe, type SettledCheck } from "@/libs/probes/run";
import { CORE_PROBES } from "@/libs/probes/registry";
import type { PlatformProbe } from "@/libs/probes/types";
import type { TargetPlatform } from "@/libs/names/generate";

export const MAX_CANDIDATES = 8;
/** Simultaneous outbound probes across the whole run. */
export const CONCURRENCY = 6;
/** Consecutive failures on one platform before the rest are skipped. */
export const CIRCUIT_BREAKER_THRESHOLD = 3;

export type CandidateInput = {
  name: string;
  rationale?: string;
};

export type CreateSearchArgs = {
  userId: string;
  mode: "generate" | "check";
  ideaText?: string;
  seedName?: string;
  targetPlatform: TargetPlatform;
  candidates: CandidateInput[];
  probes?: readonly PlatformProbe[];
};

/** Runs `tasks` with at most `limit` in flight, preserving result order. */
async function pooled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker)
  );

  return results;
}

/** De-duplicates by normalized name and drops anything unusable. */
function prepareCandidates(input: CandidateInput[]) {
  const seen = new Set<string>();
  const prepared: Array<{ name: string; normalizedName: string; rationale?: string }> = [];

  for (const candidate of input) {
    const name = candidate.name?.trim() ?? "";
    const normalizedName = normalizeName(name);

    if (!name || !normalizedName || seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    prepared.push({ name, normalizedName, rationale: candidate.rationale });
  }

  return prepared.slice(0, MAX_CANDIDATES);
}

/**
 * Creates a search, spends one credit per candidate, runs the core probes, and
 * refunds any candidate whose core probes did not all succeed.
 *
 * Credits are spent before any work begins so a run cannot start unfunded. The
 * refund is a new positive ledger row, never an edit — `014`'s append-only
 * trigger enforces that at the database level regardless of what this code does.
 */
export async function createSearch(
  args: CreateSearchArgs
): Promise<{ searchId: string }> {
  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error(
      "Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const candidates = prepareCandidates(args.candidates);

  if (candidates.length === 0) {
    throw new Error("No usable candidates");
  }

  const probes = args.probes ?? CORE_PROBES;

  // Throws InsufficientCreditsError before a single row is written, so a
  // failed payment leaves nothing behind to clean up.
  await spendCredits({
    userId: args.userId,
    amount: candidates.length,
    reason: "search",
  });

  const { data: search, error: searchError } = await admin
    .from("searches")
    .insert({
      user_id: args.userId,
      mode: args.mode,
      idea_text: args.ideaText ?? null,
      seed_name: args.seedName ?? null,
      target_platform: args.targetPlatform,
      status: "running",
      credits_spent: candidates.length,
    })
    .select("id")
    .single();

  if (searchError || !search) {
    throw new Error(`Failed to create search: ${searchError?.message}`);
  }

  const searchId = search.id as string;

  const { data: rows, error: candidateError } = await admin
    .from("candidates")
    .insert(
      candidates.map((c) => ({
        search_id: searchId,
        name: c.name,
        normalized_name: c.normalizedName,
        rationale: c.rationale ?? null,
      }))
    )
    .select("id, name, normalized_name");

  if (candidateError || !rows) {
    throw new Error(`Failed to create candidates: ${candidateError?.message}`);
  }

  // One consecutive-failure counter per platform. Once a platform trips, its
  // remaining checks are skipped rather than spending the budget re-confirming
  // that it is down.
  //
  // The breaker can only skip work that has not started. Anything already in
  // flight runs to completion, so with fewer tasks than CONCURRENCY it never
  // engages at all. That is the intended trade: it exists to stop a long run
  // from hammering a dead platform, not to abort requests mid-flight.
  const consecutiveFailures = new Map<string, number>();
  const tripped = new Set<string>();

  const tasks = rows.flatMap((row) =>
    probes.map((probe) => async () => {
      if (tripped.has(probe.id)) {
        return {
          candidateId: row.id as string,
          settled: {
            platform: probe.id,
            status: "skipped" as const,
            signals: {},
            cached: false,
          },
        };
      }

      const settled = await runProbe(probe, row.name as string);

      if (settled.status === "failed") {
        const count = (consecutiveFailures.get(probe.id) ?? 0) + 1;
        consecutiveFailures.set(probe.id, count);
        if (count >= CIRCUIT_BREAKER_THRESHOLD) tripped.add(probe.id);
      } else {
        consecutiveFailures.set(probe.id, 0);
      }

      return { candidateId: row.id as string, settled };
    })
  );

  const settledAll = await pooled(tasks, CONCURRENCY);

  await admin.from("checks").insert(
    settledAll.map(({ candidateId, settled }) => ({
      candidate_id: candidateId,
      platform: settled.platform,
      status: settled.status,
      signals: settled.signals,
      evidence_url: (settled as SettledCheck).evidenceUrl ?? null,
      error: (settled as SettledCheck).error ?? null,
      fetched_at: new Date().toISOString(),
    }))
  );

  // A candidate is refunded when any core probe did not succeed: the user paid
  // for a verdict on that name and did not get a complete one.
  const coreIds = new Set(probes.filter((p) => p.tier === "core").map((p) => p.id));
  const refunded = rows.filter((row) =>
    settledAll.some(
      ({ candidateId, settled }) =>
        candidateId === row.id &&
        coreIds.has(settled.platform) &&
        settled.status !== "ok"
    )
  );

  for (const row of refunded) {
    await admin.rpc("grant_credits", {
      p_user_id: args.userId,
      p_amount: 1,
      p_reason: `refund:${searchId}:${row.normalized_name}`,
    });
  }

  await admin
    .from("searches")
    .update({
      status: refunded.length === rows.length ? "failed" : "complete",
    })
    .eq("id", searchId);

  return { searchId };
}
