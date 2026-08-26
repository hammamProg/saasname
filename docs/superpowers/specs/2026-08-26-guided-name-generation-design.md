# Guided name generation — design

**Date:** 2026-08-26
**Status:** approved, not yet implemented

## Problem

`generateCandidates` asks one prompt for 8 names with no style constraint
(`libs/names/generate.ts:22`, `buildUserPrompt`). Three consequences, all
confirmed by the founder:

1. **The batch is incoherent.** With no style specified the model hedges across
   styles to cover its bases, so one candidate is a Latin compound, the next a
   portmanteau, the next a real word. The list reads as random output rather
   than a considered shortlist.
2. **Eight at once is too many to judge.** Nothing stands out, so choosing which
   candidates to spend credits on feels arbitrary.
3. **There is no steering wheel.** A user with a style in mind can only
   regenerate and hope.

The rationale text is *not* a problem and is out of scope.

## Non-goals

- A multi-step wizard. Considered and rejected: four screens before a
  first-time user sees a name, when activation is already the weak point.
- A user-facing count picker. Generation is free
  (`app/api/generate/route.ts:35`) — credits are spent only on candidates the
  user chooses to check — so a count control is a decision that buys the user
  nothing. Batch size is fixed in code instead.
- Changing rationale generation, the retry policy, or the token budget.

## Design

### 1. Style catalogue — `libs/names/styles.ts` (new)

Single source of truth for both the prompt constraint and the UI. Plain data,
no React, independently testable.

| id | Label | Examples | Prompt constraint |
|---|---|---|---|
| `invented` | Invented | Zapier, Klaviyo | Coined words that are not real words; must be pronounceable |
| `compound` | Compound | Dropbox, Firebase | Two real words fused into one |
| `real-word` | Real word | Notion, Stripe | An existing English word used metaphorically |
| `literal` | Literal | Calendly, Formspree | States plainly what the product does |
| `playful` | Playful | Mailchimp, Grammarly | Wordplay, unexpected, memorable |
| `mixed` | Surprise me | — | No style constraint (today's behaviour) |

`mixed` is deliberate: it preserves current behaviour so the change is purely
additive and no existing user loses the output they know.

**Example names are user-facing claims about other companies' naming and must
be sanity-checked before ship.** They are illustrative, not authoritative.

### 2. Generation — `libs/names/generate.ts`

- `REQUESTED_COUNT = 8` becomes `BATCH_SIZE = 5`.
- New required `style: NameStyleId` param. Its constraint is injected into
  `buildUserPrompt` as its own line.
- New optional `excludeNames: string[]`, rendered into the prompt so a
  "generate 5 more" run does not repeat what is already on screen.
- An unrecognised style id falls back to `mixed` rather than throwing. A style
  removed from the catalogue must not 500 a client holding a stale id.

`parseCandidates`, `RETRY_BELOW`, `MIN_ACCEPTABLE` and
`GENERATION_OUTPUT_BUDGET` are unchanged.

`RETRY_BELOW` is currently 5, which equalled the old batch's failure threshold
but now equals a full batch — meaning every short batch triggers a retry.
Implementation must re-derive it relative to `BATCH_SIZE` (e.g. 3) rather than
leave it at 5.

### 3. Form layout — one screen

```
Describe your idea            [textarea]
Pick a direction              [6 style cards, examples inline]
Got a name in mind already?   [seed input — optional, visible]
▸ Advanced                    [platform checklist, collapsed]
                              [ Generate 5 names ]
```

Seed is promoted from buried to visible; it already exists in state and in the
`searches.seed_name` column. Platform moves into a collapsed Advanced section —
it is the least-adjusted setting and already defaults to `web`.

Below the results: **"Not the right direction?"** with the five unchosen styles
as one-click regenerate chips. This is where exploration actually happens,
after the user has seen something concrete to react to.

### 4. Component split

`components/dashboard/GenerateForm.tsx` is 587 lines and this work would push
it past the 800-line ceiling. Extract:

```
components/dashboard/generate/StylePicker.tsx       style cards
components/dashboard/generate/AdvancedOptions.tsx   collapsed platform
components/dashboard/generate/RegenerateChips.tsx   post-result steering
GenerateForm.tsx                                    orchestration only
```

### 5. Persistence

One migration: `alter table public.searches add column name_style text;`

Nullable, so all 13 existing rows stay valid. Without it a report cannot show
which direction produced it, and "generate more" cannot stay consistent across
a reload.

### 6. API

`app/api/generate/route.ts` accepts `style` and `excludeNames`.
`app/api/searches/route.ts` accepts and persists `style`.
Both validate against the catalogue and fall back to `mixed`.

### 7. Error handling

- A failed "generate 5 more" leaves existing candidates on screen. Losing names
  the user was considering is worse than the failure itself.
- Unknown style degrades to `mixed`; never a 400.
- Existing `LlmError` handling and the "fewer than MIN_ACCEPTABLE" failure path
  are untouched.

### 8. Analytics

Add `generate_style_selected` (style id) via `libs/analytics.ts`. It answers
the question that arrives in a month: which directions do people pick, and is
the picker used at all. No idea text or candidate names are sent — see the
privacy rule in `libs/analytics.ts`.

### 9. Testing

New:
- Catalogue integrity: ids unique, every style has a non-empty constraint,
  every style except `mixed` has ≥2 examples.
- `buildUserPrompt` contains the chosen style's constraint.
- `excludeNames` values reach the prompt.
- Unknown style id resolves to `mixed`.
- `generateCandidates` returns at most `BATCH_SIZE`.

All 223 existing tests must stay green.

## Open questions

None blocking. Two judgement calls the founder should confirm at review:
batch size of 5 (4 or 6 equally defensible), and the accuracy of the six
example name pairs.
