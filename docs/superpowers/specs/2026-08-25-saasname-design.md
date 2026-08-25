# SaaSNa.me — Design Spec

**Date:** 2026-08-25
**Status:** Approved, pending implementation plan

SaaSNa.me helps developers find a SaaS name that is actually free to use — across app
stores, web search, social handles, trademarks, and domains — and tells them whether an
existing collision is with a strong incumbent or a dead husk.

---

## 1. Decisions

These were settled during brainstorming and are not open questions.

| Decision | Choice |
|---|---|
| Codebase | This repo (already cloned from the ShipNow template) |
| Data sourcing | Hybrid: free official APIs where they exist, Firecrawl for the rest |
| Domains | RDAP + Domainr for search; hand off to a registrar via affiliate link |
| Monetization | Credit packs via Paddle |
| LLM | DeepSeek, behind a provider interface |
| Strength scoring | Hard signals scored deterministically; LLM writes the explanation only |
| Search UX | Progressive streaming results |
| v1 checks | App Store, Google Play, Google SERP, social handles, USPTO trademark, domains |
| Free tier | Signup required; free credits granted on join |
| Sharing | Private by default, opt-in share links |
| Language | English only |
| Direct check | First-class feature alongside the generator |
| Orchestration | Durable job rows + SSE streaming + Supabase Realtime reconnect |

### LLM provider notes

DeepSeek retired the `deepseek-chat` and `deepseek-reasoner` aliases on 2026-07-24; calls
using those names now error. Use:

- `deepseek-v4-flash` — $0.14 / $0.28 per MTok. Bulk name generation and explanation prose.
- `deepseek-v4-pro` — $1.74 / $3.48 per MTok. Final ranking pass only.

Base URL `https://api.deepseek.com` (OpenAI-compatible). An Anthropic-compatible endpoint
exists at `https://api.deepseek.com/anthropic`.

All model calls go through a `LlmProvider` interface so switching to Claude or GPT is a
config change, not a refactor.

---

## 2. Product shape

Two entry modes share one report engine.

**Generate mode.** User supplies an idea description, optionally a seed name they already
like, and a target platform. The system returns 5–8 candidate names with rationales. The
user selects which candidates to validate.

**Check mode.** User supplies an exact name. It goes straight to validation.

**Target platform** — `ios` | `android` | `web` | `cross` — is not merely a display filter.
It reweights scoring. A name colliding with an abandoned Android app matters far less to an
iOS-targeted product than the reverse.

---

## 3. Data model

New tables, all with row-level security scoped to `auth.uid()`.

```
credit_ledger
  id, user_id, delta int, reason, search_id?, created_at
  Append-only. Balance = SUM(delta). Rows are never updated or deleted.

searches
  id, user_id, mode ('generate'|'check'), idea_text?, seed_name?,
  target_platform, status ('pending'|'running'|'complete'|'failed'),
  credits_spent, share_token?, is_public bool default false,
  created_at, updated_at

candidates
  id, search_id, name, normalized_name, rationale, score int, verdict, created_at

checks
  id, candidate_id, platform, status ('pending'|'ok'|'failed'|'skipped'),
  verdict ('clear'|'contested'|'blocked'|'unknown'),
  signals jsonb, evidence_url?, fetched_at?

platform_cache
  platform, normalized_name, payload jsonb, fetched_at, expires_at
  PRIMARY KEY (platform, normalized_name)
```

`platform_cache` is keyed globally rather than per-user. The second user to check a given
name on a given platform hits cache and costs nothing in API spend. This is the largest
margin lever in the system and should be treated as a first-class feature, not an
optimization to add later.

`normalized_name` is lowercase, stripped of spaces, hyphens, and diacritics. Normalization
lives in one pure function shared by candidate creation, cache keys, and probe queries.

---

## 4. Probe adapters

Every platform check implements one interface:

```ts
type Verdict = 'clear' | 'contested' | 'blocked' | 'unknown'

interface ProbeResult {
  signals: Record<string, number | string | boolean>
  evidenceUrl?: string
}

interface PlatformProbe {
  id: string
  tier: 'core' | 'best_effort'
  run(name: string, ctx: ProbeContext): Promise<ProbeResult>
}
```

Probes emit **signals only**. They never decide a verdict — that is the rollup's job
(section 5). This keeps every adapter trivially testable and keeps scoring logic in one
place instead of smeared across six files.

| Probe | Source | Tier |
|---|---|---|
| `app-store` | iTunes Search API — free, official, no key | core |
| `web-serp` | Firecrawl search | core |
| `domains` | RDAP, with Domainr for TLDs RDAP does not cover | core |
| `google-play` | Firecrawl scrape | best_effort |
| `trademark` | USPTO Open Data Portal; `tmsearch.uspto.gov` fallback | best_effort |
| `socials` | Per-platform handle probe (X, Instagram, LinkedIn, TikTok, GitHub) | best_effort |

RDAP is free and keyless but does not cover every TLD and returns no pricing. Domainr is
distributed via RapidAPI and requires a key; it fills both gaps. Budget for the Domainr
subscription, or restrict v1 to the TLDs RDAP covers and show availability without price.

**Core** probe failure fails the check and refunds the credit.
**Best-effort** probe failure yields `unknown` and never sinks the report.

Social probes are the most fragile component in the system. X, Instagram, and LinkedIn
actively block automated access. They are deliberately `best_effort` and their results are
labelled in the UI as indicative rather than authoritative.

### USPTO risk

The legacy USPTO Developer Hub was decommissioned on 2026-06-05. Access is now via the Open
Data Portal at `data.uspto.gov`, requiring a free USPTO.gov account and an `X-API-KEY`
header. All publicly documented ODP endpoints found during research are **patent**
endpoints; a trademark *search* endpoint was not confirmed to exist. Phase 0 resolves this
before any dependent work begins. Fallback is the public `tmsearch.uspto.gov` backend via
Firecrawl.

---

## 5. Scoring

A pure function converts a candidate's signals into a verdict. No I/O, no LLM, fully
unit-testable, and the single most important piece of logic in the product.

**Incumbent strength (0–100)** is computed per platform from:

- *App stores* — rating count, rating average, install band, last-updated recency,
  developer identity
- *SERP* — exact-match domain present, rank of exact-name results, count of strongly
  branded results
- *Social* — account exists, follower band, verified flag
- *Trademark* — live registration in a relevant class

**Recency is decisive.** An app with 200 ratings last updated in 2016 is an abandoned
squatter, not a competitor, and must score `contested` rather than `blocked`. Getting this
wrong makes the product tell users that every reasonable name is taken, which is both
useless and false.

**Target-platform weighting** multiplies each platform's contribution:

| Target | Heavy | Light |
|---|---|---|
| `ios` | App Store, trademark | Google Play |
| `android` | Google Play, trademark | App Store |
| `web` | SERP, domains, trademark | Both app stores |
| `cross` | Even weighting | — |

**Trademark is a hard blocker.** A live registration in a relevant class forces `blocked`
regardless of every other signal. A taken handle is an inconvenience; a trademark conflict
is a lawsuit. The UI states plainly that this is not legal advice.

This applies only when the trademark probe actually returned data. Because the probe is
`best_effort`, a failed lookup yields `unknown`, and an `unknown` trademark result must
never produce `blocked` — nor may it be silently treated as clear. The report says the
trademark check could not be completed, and says so prominently.

**The LLM's only role** is turning the computed signals into a readable explanation. It
receives the signals and the verdict, and writes prose. It never invents a signal, never
overrides a verdict, and returns strict JSON. This keeps results reproducible, cheap, and
auditable — and lets the report show users the underlying evidence.

---

## 6. Orchestration

```
POST /api/searches
  → debit credits (ledger row)
  → insert searches row + one checks row per candidate × platform
  → return { searchId } immediately

GET /api/searches/:id/stream          (SSE)
  → fan out probes, concurrency capped at 6
  → on each settle: UPDATE checks, emit { checkId, verdict, signals }
  → waitUntil() completes the run even if the client disconnects

Client
  → SSE while the tab is open
  → Supabase Realtime on reconnect
  → plain DB read for an already-finished report
```

Vercel function duration is set per-route via `maxDuration`. Confirm the ceiling available
on the account's current plan during Phase 1.

---

## 7. Credits

**1 credit = 1 candidate fully validated.** Generation is nearly free on Flash, so metering
it would feel punitive; validation is where the real API spend occurs.

Refunds are new ledger rows with a positive delta, never edits to existing rows. A core
probe failure triggers an automatic refund for that candidate.

New accounts receive a grant of free credits on signup, recorded as an ordinary ledger row.

---

## 8. Error handling

- Per-probe timeout: 8 seconds
- Concurrency cap: 6 simultaneous probes
- One retry with jitter on 5xx; no retry on 4xx
- Per-platform circuit breaker — repeated failures skip that platform for the remainder of
  the run and mark its checks `skipped`
- A rejected probe never rejects the run

**The invariant that matters most: `unknown` must never render as `clear`.** Telling a
founder a name is free when the check merely failed is the single bug that would destroy
trust in this product. Failed and available are visually and semantically distinct
everywhere they appear.

---

## 9. Design system

Palette extracted from the logo by pixel sampling. Saturation sits at 81–100% throughout and
the bright colors cluster at L≈44–58%, so derived colors are placed at matching S/L
coordinates to read as native.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#021B42` | Body text, headings |
| `violet` | `#622EF8` | Gradient start |
| `indigo` | `#3C3FEB` | Gradient mid |
| `blue` | `#008DF7` | Gradient mid-late |
| `cyan` | `#00BDFC` | Gradient end, primary CTA |
| `clear` | `#02DF97` | Verdict: available |
| `contested` | `#DF8D01` | Verdict: taken, weak incumbent (derived, H38° at green's S/L) |
| `blocked` | `#DF0110` | Verdict: taken, strong incumbent or trademark (derived, H356°) |

Brand gradient runs violet → indigo → blue → cyan at ~135°.

`unknown` renders in a desaturated neutral grey — deliberately not on the verdict color
scale, so a failed check can never be mistaken for a passing one at a glance.

---

## 10. Testing

- **Unit** — the scoring rollup exhaustively (pure, no I/O); name normalization; credit
  balance computation
- **Contract** — each probe adapter against recorded fixtures, no network
- **Integration** — full search lifecycle with mocked probes, including refund-on-failure
  and circuit-breaker paths
- **E2E** — one journey: signup → generate → stream → report

---

## 11. Build phases

| Phase | Contents |
|---|---|
| **0** | Spike: confirm USPTO trademark search access, Google Play via Firecrawl, social probe viability |
| **1** | Rebrand from ShipNow, design tokens, auth, credit ledger, Paddle credit packs |
| **2** | Idea → candidates via DeepSeek Flash |
| **3** | Core probes (App Store, SERP, domains) + streaming + report page |
| **4** | Scoring rollup + LLM explanations |
| **5** | Best-effort probes (Play, trademark, socials) |
| **6** | Opt-in sharing, polish |

Phase 0 comes first because two of the six probes rest on assumptions that could not be
verified from outside. If the trademark spike fails, that must surface before Phase 5
depends on it.

---

## 12. Out of scope for v1

- Arabic / RTL support — English only, but copy stays in message files so adding it later is
  additive
- Public SEO report pages — reports are private by default with opt-in share links
- Domain registration — search and price only, with affiliate handoff to a registrar
- Logo or brand asset generation
