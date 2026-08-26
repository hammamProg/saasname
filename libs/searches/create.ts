import { createSupabaseAdmin } from "@/libs/supabase";
import { spendCredits } from "@/libs/credits/spend";
import { normalizeName } from "@/libs/names/normalize";
import { ALL_PROBES } from "@/libs/probes/registry";
import type { PlatformProbe } from "@/libs/probes/types";
import type { TargetPlatform } from "@/libs/names/generate";

export const MAX_CANDIDATES = 8;

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
 * Spends the credits and writes the search, its candidates, and one pending
 * check per candidate x platform. Runs no probes.
 *
 * Creation and execution are separate so the request that spends money returns
 * in milliseconds and the user gets a page to watch, rather than holding a
 * connection open across as many as 48 outbound calls.
 *
 * Credits are spent before any row is written, so a run cannot start unfunded
 * and a failed payment leaves nothing to clean up.
 */
export async function createSearch(
  args: CreateSearchArgs
): Promise<{
  searchId: string;
  total: number;
  candidates: Array<{ id: string; name: string }>;
}> {
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

  const probes = args.probes ?? ALL_PROBES;

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
      status: "pending",
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
    .select("id, name");

  if (candidateError || !rows) {
    throw new Error(`Failed to create candidates: ${candidateError?.message}`);
  }

  // Pending checks are written up front so the report can show the whole grid
  // immediately, with each cell filling in as its probe settles.
  const checks = rows.flatMap((row) =>
    probes.map((probe) => ({
      candidate_id: row.id as string,
      platform: probe.id,
      status: "pending",
      signals: {},
    }))
  );

  const { error: checkError } = await admin.from("checks").insert(checks);

  if (checkError) {
    throw new Error(`Failed to create checks: ${checkError.message}`);
  }

  return {
    searchId,
    total: checks.length,
    candidates: rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
  };
}
