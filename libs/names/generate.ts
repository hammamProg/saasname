import { normalizeName } from "@/libs/names/normalize";
import { LlmError, type LlmProvider } from "@/libs/llm/provider";

export type TargetPlatform = "ios" | "android" | "web" | "cross";

export const TARGET_PLATFORMS: readonly TargetPlatform[] = [
  "ios",
  "android",
  "web",
  "cross",
];

export type GeneratedCandidate = {
  name: string;
  normalizedName: string;
  rationale: string;
};

/** Flash, not Pro. Generation is bulk work; Pro is reserved for the Phase 4
 *  ranking pass where its cost is justified. */
export const GENERATION_MODEL = "deepseek-v4-flash";

const REQUESTED_COUNT = 8;
/** Below this we spend one more call trying to top the batch up. */
const RETRY_BELOW = 5;
/** Below this even after the retry, the run has failed. */
const MIN_ACCEPTABLE = 3;
const MAX_NAME_LENGTH = 30;

/** Runaway guard, not a cost lever.
 *
 *  This is a reasoning model, so reasoning tokens are billed as output and
 *  count against max_tokens. A cap of 900 was measured failing intermittently
 *  on the same prompt: one run spent 850 reasoning tokens and truncated the
 *  answer at 50, the next spent all 900 and returned nothing at all, the third
 *  used 402 and finished cleanly. Anything near the observed need turns into a
 *  random 502 for the user.
 *
 *  Reasoning has not been observed above ~900 here, so this leaves ample room.
 *  Prompt size is where the saving actually comes from, and the prompts above
 *  are kept terse for that reason. */
const GENERATION_OUTPUT_BUDGET = 3000;

// Kept deliberately terse: every token here is billed on every generation.
const SYSTEM_PROMPT =
  'Name software products. Reply JSON {"candidates":[{"name","rationale"}]}. ' +
  "Names: 1-2 words, max 30 chars, sayable, domain-plausible, no repeats. " +
  "Rationale: one short sentence.";

const PLATFORM_GUIDANCE: Record<TargetPlatform, string> = {
  ios: "Suits an App Store listing.",
  android: "Suits a Google Play listing.",
  web: "Works as a domain and wordmark.",
  cross: "Works as a domain and a store listing.",
};

function buildUserPrompt(
  idea: string,
  seedName: string | undefined,
  targetPlatform: TargetPlatform
): string {
  const lines = [
    `Idea: ${idea}`,
    `Target: ${targetPlatform}. ${PLATFORM_GUIDANCE[targetPlatform]}`,
    `Return ${REQUESTED_COUNT}.`,
  ];

  if (seedName?.trim()) {
    lines.splice(1, 0, `Similar in spirit to "${seedName.trim()}", but not it.`);
  }

  return lines.join("\n");
}

/** Parses and validates the model's JSON.
 *
 *  Exported so the validation rules can be tested without a provider. Throws
 *  {@link LlmError} when the payload is unusable, which the caller treats as a
 *  retryable condition; individual bad entries are dropped rather than thrown. */
export function parseCandidates(raw: string): GeneratedCandidate[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LlmError("Model returned output that is not JSON");
  }

  const candidates = (parsed as { candidates?: unknown })?.candidates;

  if (!Array.isArray(candidates)) {
    throw new LlmError('Model output has no "candidates" array');
  }

  const seen = new Set<string>();
  const accepted: GeneratedCandidate[] = [];

  for (const entry of candidates) {
    const rawName = (entry as { name?: unknown })?.name;
    const rawRationale = (entry as { rationale?: unknown })?.rationale;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const rationale =
      typeof rawRationale === "string" ? rawRationale.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH || !rationale) {
      continue;
    }

    const normalizedName = normalizeName(name);

    // A name that normalizes to nothing is punctuation, not a name. It would
    // also collide with every other such name in the dedupe set.
    if (!normalizedName || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    accepted.push({ name, normalizedName, rationale });
  }

  return accepted;
}

/** Generates candidate names for an idea.
 *
 *  Makes one call. If that call returns malformed JSON, or fewer than
 *  {@link RETRY_BELOW} usable candidates, it spends one more call and merges the
 *  results. Throws {@link LlmError} when fewer than {@link MIN_ACCEPTABLE}
 *  candidates survive, so the caller can render a failure rather than an empty
 *  list — an empty list would read as "no good names exist for your idea". */
export async function generateCandidates({
  provider,
  idea,
  seedName,
  targetPlatform,
}: {
  provider: LlmProvider;
  idea: string;
  seedName?: string;
  targetPlatform: TargetPlatform;
}): Promise<GeneratedCandidate[]> {
  const request = {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(idea, seedName, targetPlatform),
    model: GENERATION_MODEL,
    json: true,
    maxOutputTokens: GENERATION_OUTPUT_BUDGET,
  };

  const collected: GeneratedCandidate[] = [];

  // The provider call and the parse are kept separate on purpose. An upstream
  // failure (5xx, timeout) propagates immediately — the adapter already
  // surfaced it and hammering a broken endpoint helps nobody. Only a malformed
  // *response body* is worth spending a second call on.
  const first = await provider.complete(request);

  try {
    collected.push(...parseCandidates(first));
  } catch (error) {
    if (!(error instanceof LlmError)) {
      throw error;
    }
  }

  if (collected.length < RETRY_BELOW) {
    const seen = new Set(collected.map((candidate) => candidate.normalizedName));

    for (const candidate of parseCandidates(await provider.complete(request))) {
      if (!seen.has(candidate.normalizedName)) {
        seen.add(candidate.normalizedName);
        collected.push(candidate);
      }
    }
  }

  if (collected.length < MIN_ACCEPTABLE) {
    throw new LlmError(
      `Model produced only ${collected.length} usable candidates`
    );
  }

  return collected.slice(0, REQUESTED_COUNT);
}
