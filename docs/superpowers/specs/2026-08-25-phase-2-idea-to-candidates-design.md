# Phase 2 — Idea → candidates

**Date:** 2026-08-25
**Status:** Approved, pending implementation plan
**Parent spec:** [`2026-08-25-saasname-design.md`](./2026-08-25-saasname-design.md) — this
document narrows Phase 2 only. Where the two disagree, the parent spec wins except on the
points recorded under *Resolved contradictions* below.

Phase 2 turns an idea description into 5–8 candidate names with rationales. It does not
validate them; validation is Phase 3.

---

## 1. Resolved contradictions

Two approved documents disagreed. Both were settled before design:

**Do generated candidates cost credits?** The Phase 0–1 plan closes with "Phase 2 … consumes
`spendCredits` and `config.credits.perCandidate` from this phase." The parent spec §7 says
"1 credit = 1 candidate fully **validated**. Generation is nearly free on Flash, so metering
it would feel punitive."

The parent spec wins. **Generation is free.** Phase 2 imports no credit code. The first
debit happens in Phase 3, when the user chooses which candidates to validate. The Phase 0–1
plan's closing line is stale and should be read as describing Phase 3.

**Where do candidates live before validation?** Parent spec §6 creates the `searches` row at
validation time, but §3 gives `searches` fields (`mode`, `idea_text`, `seed_name`) that only
have values at generation time.

Resolved as **ephemeral generation**. Phase 2 writes nothing to Postgres. Candidates are
returned as JSON and held in client state. Refreshing loses them; that is accepted. Phase 3
writes `searches`, `candidates`, and `checks` in one transaction when validation starts, and
carries `idea_text` / `seed_name` through from the client at that point.

Consequence: **Phase 2 ships no migration.** The next migration number remains free for
Phase 3.

---

## 2. Scope

**In:** idea → candidates, the `LlmProvider` interface, the DeepSeek adapter, name
normalization, one API route, and a generate form plus candidate cards on `/dashboard`.

**Out:** check mode, candidate selection, credits, persistence, probes, scoring, streaming,
sharing. All Phase 3+.

The UI deliberately stops at displaying candidates. No checkbox or "Validate" control ships
in this phase, because validation does not exist yet and a disabled control that promises it
is a worse experience than an honest absence.

---

## 3. Components

| Unit | Purpose | Depends on |
|---|---|---|
| `libs/names/normalize.ts` | Pure. Lowercase, strip spaces, hyphens, diacritics | — |
| `libs/llm/provider.ts` | `LlmProvider` interface — the swap point for another vendor | — |
| `libs/llm/deepseek.ts` | DeepSeek adapter over the OpenAI-compatible REST endpoint | `provider.ts` |
| `libs/names/generate.ts` | Prompt → call → parse → validate → dedupe | provider, normalize |
| `app/api/generate/route.ts` | Auth-gated POST boundary | generate, `supabase/auth-api` |
| `components/dashboard/GenerateForm.tsx` | Client form: idea, optional seed, platform | — |
| `components/dashboard/CandidateList.tsx` | Renders candidate cards | — |

`normalize.ts` is written now although nothing caches yet. Parent spec §3 requires a single
normalization function shared by candidate creation, cache keys, and probe queries. Creating
it here means Phase 3 inherits it instead of writing a second, subtly different one.

The DeepSeek adapter uses plain `fetch`, not the OpenAI SDK. The call is one POST; a
dependency whose only job is to wrap `fetch` is not worth the supply-chain surface.

### Types

```ts
type TargetPlatform = "ios" | "android" | "web" | "cross";

type GeneratedCandidate = {
  name: string;
  normalizedName: string;
  rationale: string;
};

type GenerateRequest = {
  idea: string;
  seedName?: string;
  targetPlatform: TargetPlatform;
};
```

`LlmProvider` exposes a single method that takes a system prompt, a user prompt, a model
name, and a JSON flag, and returns the raw string. Parsing belongs to the caller, so the
interface stays vendor-neutral.

The route authenticates with `getAuthUser()` + `unauthorizedResponse()` from
`libs/supabase/auth-api`, matching `app/api/user/route.ts`. It does **not** use
`requireUser()`: that helper issues a `redirect()`, which is correct for a page and wrong for
a JSON endpoint, where the client expects a `401` body it can act on.

---

## 4. Data flow

```
GenerateForm (client)
  └─ POST /api/generate { idea, seedName?, targetPlatform }
       getAuthUser()              ← 401 if absent; no credit check
       validate input             ← 400 on bad shape
       generateCandidates()
         buildPrompt(idea, seedName, targetPlatform)
         LlmProvider.complete({ json: true, model: "deepseek-v4-flash" })
         parse → validate → normalize → dedupe → slice to 8
  ← { candidates: GeneratedCandidate[] }
  └─ render candidate cards
```

The prompt asks for 8 candidates. Dedupe may reduce that, which is why the accepted range is
5–8 rather than a fixed count.

`targetPlatform` is passed into the prompt so generated names suit the target, but it does
not reweight anything in this phase. Reweighting is a scoring concern and lands in Phase 4.

---

## 5. Error handling

**The invariant for this phase: a generation failure must never render as an empty result.**
An empty list reads as "no good names exist for your idea", which is a different and false
claim. Failures surface as an explicit error state, distinct from a genuinely short list.
This mirrors the parent spec's `unknown` ≠ `clear` rule, one layer up.

| Condition | Response |
|---|---|
| `idea` outside 10–500 chars, `seedName` > 50, bad platform | `400` |
| `DEEPSEEK_API_KEY` absent | `503`, operator-facing message |
| DeepSeek non-2xx, or 15s timeout | `502`; details logged server-side |
| Malformed JSON | one retry, then `502` |
| Fewer than 5 candidates after dedupe | one retry; return if ≥3, else `502` |

The API key never appears in a response body or a client-visible error. Upstream failure
detail is logged server-side and reduced to a generic message on the wire.

The 15-second timeout is specific to generation. The parent spec's 8-second per-probe
timeout governs Phase 3 probes and does not apply here.

---

## 6. Testing

Per parent spec §10 and the repo's TDD rule — tests first, 80% minimum.

- **Unit** — `normalize` exhaustively: case, internal spaces, hyphens, diacritics, unicode,
  empty and whitespace-only input. Separately, the dedupe-and-count logic.
- **Contract** — `deepseek.ts` against recorded fixtures. No network in the suite.
- **Integration** — `generateCandidates` against a stub `LlmProvider`: happy path,
  malformed-JSON retry, short-batch retry, all-duplicates collapse, upstream 5xx.
- **No E2E** — the parent spec's single E2E journey needs Phase 3's report page.

Dedupe is by `normalizedName`, so "DataFlow", "data flow", and "data-flow" collapse to one
candidate.

---

## 7. Prerequisites

`DEEPSEEK_API_KEY` is not in `.env.local` and must be obtained before this phase can be
tested against the live API. The suite itself runs without it, since every test uses a stub
provider or a fixture.

`deepseek-v4-flash` is the model name given by the parent spec, which also records that the
`deepseek-chat` and `deepseek-reasoner` aliases were retired on 2026-07-24. That date is
after the assistant's knowledge cutoff, so the model name is verified against the live API
as the first implementation step rather than assumed.

---

## 8. Done criteria

1. `npm run build` and `npm test` pass.
2. A signed-in user submits an idea on `/dashboard` and receives 5–8 named candidates, each
   with a rationale. A degraded run that yields 3–4 after retry still renders as a result,
   not an error; fewer than 3 is a `502`.
3. Duplicate names differing only by case, spacing, or hyphens collapse to one candidate.
4. With `DEEPSEEK_API_KEY` unset, the route returns `503` and the UI shows an explicit error
   rather than an empty list.
5. An upstream failure renders as an error state, never as "no results".
6. No credit is debited by any path in this phase.
7. No migration is added.
