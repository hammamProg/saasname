import { LlmError, type LlmProvider } from "@/libs/llm/provider";
import type { CandidateVerdict } from "@/libs/scoring/verdict";

export const EXPLAIN_MODEL = "deepseek-v4-flash";

/** Runaway guard, deliberately generous -- NOT a cost optimization.
 *
 *  deepseek-v4-flash is a reasoning model: reasoning tokens are billed as
 *  output and count against max_tokens, so the cap must cover thinking *and*
 *  answer. Squeezing it does not save money, it destroys the result. A cap of
 *  220 on a 2-candidate batch produced 220 reasoning tokens and an empty
 *  answer -- full price, nothing delivered.
 *
 *  Worse, the reasoning length is not stable. The same 3-candidate prompt was
 *  measured at 144, 474, 659, 725 and 765 reasoning tokens across runs. Any cap
 *  near the observed need fails intermittently, which is the most expensive
 *  outcome of all. Uncapped runs produced ~60 output tokens every time.
 *
 *  So the cap sits far above observed need and exists only to stop a runaway.
 *  The real levers are input size and batching, both applied above: one call
 *  per search, short keys, at most two facts per candidate. */
export function outputBudget(candidateCount: number): number {
  return 1200 + 100 * candidateCount;
}

export type ExplainInput = {
  name: string;
  verdict: CandidateVerdict;
};

/**
 * The prompt is deliberately terse and the payload is compressed.
 *
 * Cost scales with tokens in and out, so the model is sent a compact digest
 * rather than raw probe signals: a verdict letter, a score, and at most two
 * facts per candidate. One call covers the whole batch, so the instruction
 * overhead is paid once rather than per name.
 *
 * The model writes prose and nothing else. It never sees enough to invent a
 * signal, and its output is never read back as a verdict -- the rollup already
 * decided that, deterministically, and this text only describes it.
 */
const SYSTEM = [
  "Explain SaaS name check results.",
  "Reply JSON: {e:[{n,t}]} where n=name, t=one sentence under 18 words.",
  // Observed inventing counts ("contested with 24 similar entities") that were
  // never in the payload. The rollup owns every fact; this model only phrases
  // them, and a fabricated number in a trust product is worse than no prose.
  "Use ONLY the given facts. Never invent numbers, counts, or names.",
  "Describe findings only. Never call a name safe, free, or available to use.",
  "No advice, no hedging, no preamble.",
].join(" ");

/** Compresses a verdict into the few facts worth explaining.
 *
 *  Deliberately carries no numbers. Internal scores are scoring artifacts, not
 *  user-facing facts, and the model quotes back whatever it is given -- early
 *  versions produced "brand strength 41" and "an exact-name app at 20/100",
 *  which mean nothing to a founder. Omitting them also shrinks the prompt. */
function digest(input: ExplainInput): Record<string, unknown> {
  const facts: string[] = [];

  for (const p of input.verdict.platforms) {
    if (p.verdict === "clear") continue;

    if (p.verdict === "unknown") {
      facts.push(`${p.platform}: could not check`);
    } else if (p.platform === "app-store") {
      facts.push(`app store: an app already uses this exact name`);
    } else if (p.platform === "domains") {
      facts.push(`domains: ${p.verdict}`);
    } else if (p.platform === "web-serp") {
      facts.push(`web: ${p.verdict}`);
    }
  }

  return {
    n: input.name,
    v: input.verdict.verdict,
    f: facts.slice(0, 2),
  };
}

/**
 * Writes one short explanation per candidate.
 *
 * Never throws: an explanation is a nicety, and a failure here must not cost a
 * user the report they paid for. Missing entries simply come back absent and
 * the report falls back to the signals it already has.
 */
export async function explainVerdicts(
  provider: LlmProvider,
  inputs: ExplainInput[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  if (inputs.length === 0) return out;

  const user = JSON.stringify(inputs.map(digest));
  const budget = outputBudget(inputs.length);

  try {
    let raw: string;

    try {
      raw = await provider.complete({
        system: SYSTEM,
        user,
        model: EXPLAIN_MODEL,
        json: true,
        maxOutputTokens: budget,
      });
    } catch {
      // Kept as a safety net even with a generous cap: reasoning length is
      // unstable enough that one bad draw should not cost the whole batch.
      raw = await provider.complete({
        system: SYSTEM,
        user,
        model: EXPLAIN_MODEL,
        json: true,
        maxOutputTokens: budget * 2,
      });
    }

    const parsed = JSON.parse(raw) as { e?: Array<{ n?: string; t?: string }> };

    for (const entry of parsed.e ?? []) {
      if (typeof entry?.n === "string" && typeof entry?.t === "string" && entry.t.trim()) {
        out.set(entry.n, entry.t.trim());
      }
    }
  } catch (error) {
    console.error(
      "[explain] Falling back to no explanations:",
      error instanceof LlmError || error instanceof Error ? error.message : error
    );
  }

  return out;
}
