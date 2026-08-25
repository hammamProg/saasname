# Phase 3a — Core probes and the first report

**Date:** 2026-08-26
**Status:** Approved, pending implementation plan
**Parent spec:** [`2026-08-25-saasname-design.md`](./2026-08-25-saasname-design.md) — this
document narrows Phase 3a only. Where the two disagree, the points recorded under
*Resolved contradictions* below win.

The parent spec's Phase 3 bundles core probes, SSE streaming, and the report page. It is
split in two so something works end to end sooner:

- **3a (this document)** — the data model, the three core probes, credit spend and refund,
  and a plain report that waits for every probe and then renders.
- **3b (later)** — SSE streaming, the Supabase Realtime reconnect, and the progressive
  report UI. Purely a latency and polish layer over 3a.

---

## 1. Resolved contradictions

**Domains: RDAP only.** The parent spec §1 says "RDAP + Domainr"; the Phase 0–1 plan's
assumed defaults say "RDAP-only for v1 domains (no Domainr key)". RDAP-only wins. No
Domainr subscription, no pricing — availability only.

**Verdicts: none in this phase.** Scoring is Phase 4. The report shows what each probe
found and whether the check succeeded. Nothing is coloured `clear` / `contested` /
`blocked`, because the rollup that decides those does not exist yet. A provisional rule
would mean showing users verdicts that Phase 4 then contradicts.

---

## 2. Verified API behaviour

Every fact below was checked against the live API on 2026-08-26, not assumed. The
implementation depends on these specifics.

### RDAP — the 404 trap

RDAP returns **404 for an available domain** and **200 for a registered one**. That is the
availability signal.

The trap: `rdap.org` also returns 404 when the TLD has no RDAP server at all. Measured —
`vercel.io` returns 404 through `rdap.org` despite obviously being registered. Treating
that 404 as "available" would tell a founder a taken domain is free, which is precisely the
`unknown`-rendered-as-`clear` failure the parent spec calls the one bug that would destroy
trust in the product.

**The probe must therefore resolve the TLD to a known RDAP server before trusting a 404.**
A 404 from a server we deliberately selected means available. A missing server means
`unknown`.

Coverage measured against `https://data.iana.org/rdap/dns.json` (1200 TLDs):

| TLD | Source | Verified |
|---|---|---|
| `.com` `.net` `.org` `.ai` `.dev` `.app` `.xyz` | IANA bootstrap | ✅ |
| `.io` | `rdap.identitydigital.services` — **not in the bootstrap** | ✅ taken → 200, free → 404 |
| `.co` `.me` `.so` `.sh` | none reachable | ❌ not shippable |

**v1 checks exactly `.com`, `.io`, `.ai`, `.dev`, `.app`.** `.co` is omitted rather than
shown as a permanent "could not check" row on every report. Adding it later means adding
Domainr, not more RDAP.

A registered domain also returns `events` with `registration`, `expiration`, and
`last changed` dates. Phase 4's recency scoring will want these, so the probe records them
now.

### iTunes Search API — no key required

`GET https://itunes.apple.com/search?term=<name>&entity=software&limit=<n>` returns exactly
the signals the parent spec §5 asks for: `userRatingCount`, `averageUserRating`,
`currentVersionReleaseDate` (the recency signal that separates a live competitor from an
abandoned squatter), `sellerName`, and `trackName`.

### Firecrawl search

`POST https://api.firecrawl.dev/v2/search` with `{query, limit, sources:["web"]}` returns
`data.web[]`, each entry carrying `title` and `url`. Confirmed working.

`FIRECRAWL_API_KEY` currently lives only in the developer's shell profile. The Phase 0 spike
already flagged that as fragile; this phase moves it into `.env.local` and the deployment
environment.

---

## 3. Scope

**In:** migration `015`, the `PlatformProbe` interface, three core probe adapters
(`app-store`, `domains`, `web-serp`), the global `platform_cache`, `POST /api/searches`
with credit spend and refund-on-failure, and a server-rendered report at
`/dashboard/searches/[id]`.

**Out:** SSE streaming, Realtime reconnect, progressive rendering (all 3b); scoring and
verdicts (Phase 4); Google Play, trademark, and social probes (Phase 5); sharing (Phase 6).

---

## 4. Data model

Migration `015_searches.sql`. All four tables carry RLS scoped to `auth.uid()`, following
`014_credits.sql`: users may read their own rows, and every write goes through the service
role. `platform_cache` is the exception and is explained below.

```
searches
  id uuid pk, user_id uuid → auth.users on delete cascade,
  mode text check ('generate'|'check'), idea_text text?, seed_name text?,
  target_platform text check ('ios'|'android'|'web'|'cross'),
  status text check ('pending'|'running'|'complete'|'failed'),
  credits_spent int not null default 0,
  created_at timestamptz, updated_at timestamptz

candidates
  id uuid pk, search_id uuid → searches on delete cascade,
  name text, normalized_name text, rationale text?,
  created_at timestamptz
  unique (search_id, normalized_name)

checks
  id uuid pk, candidate_id uuid → candidates on delete cascade,
  platform text, status text check ('pending'|'ok'|'failed'|'skipped'),
  signals jsonb not null default '{}', evidence_url text?,
  error text?, fetched_at timestamptz?
  unique (candidate_id, platform)

platform_cache
  platform text, normalized_name text, payload jsonb,
  fetched_at timestamptz, expires_at timestamptz,
  primary key (platform, normalized_name)
```

No `verdict` column on `checks` in this phase. Phase 4 adds it alongside the rollup that
populates it, rather than leaving a column that is null everywhere and invites something to
read it as "clear".

`share_token` and `is_public` are likewise deferred to Phase 6.

**`platform_cache` is global, not per-user.** The second user to check a given name on a
given platform costs nothing in API spend. The parent spec §3 calls this the largest margin
lever in the system and says to treat it as a first-class feature rather than a later
optimization. It holds no user data, so it carries RLS with **no policy at all** — meaning
no client can read it — and is reachable only through the service role. TTL is 7 days.

Cache keys use `normalizeName` from Phase 2. That function already exists and must not be
reimplemented.

---

## 5. Probe interface

```ts
export type ProbeSignals = Record<string, number | string | boolean | null>;

export type ProbeResult = {
  signals: ProbeSignals;
  evidenceUrl?: string;
};

export interface PlatformProbe {
  id: string;
  tier: "core" | "best_effort";
  run(name: string, ctx: ProbeContext): Promise<ProbeResult>;
}
```

Probes emit **signals only** and never decide a verdict. That keeps each adapter trivially
testable and keeps the scoring logic Phase 4 will add in one place instead of smeared across
six files.

Signals per probe:

- **`app-store`** — `resultCount`, and for the top exact-name match: `topRatingCount`,
  `topRatingAverage`, `topLastUpdated`, `topSeller`, `exactMatch` (bool).
- **`domains`** — one key per TLD, `com`/`io`/`ai`/`dev`/`app`, each `"available"`,
  `"taken"`, or `"unknown"`, plus `comRegisteredAt` / `comExpiresAt` when present.
- **`web-serp`** — `resultCount`, `exactTitleMatches`, `topUrl`, `hasExactDomain`.

---

## 6. Orchestration

```
POST /api/searches  { mode, ideaText?, seedName?, targetPlatform, candidates[] }
  getAuthUser()                       → 401
  validate                            → 400
  spendCredits(1 per candidate)       → 402 on InsufficientCreditsError
  insert searches + candidates + checks(pending)
  run every candidate × core probe, concurrency capped at 6
  per settle: update checks(ok|failed, signals, error)
  refund 1 credit per candidate whose core probes did not all succeed
  set searches.status = complete | failed
  → { searchId }

GET /dashboard/searches/[id]   server component, reads the finished rows
```

3a runs the probes inline and returns when they finish, so `maxDuration` is set to 60. 3b
moves this behind SSE so the client is not waiting on the request.

**Credits.** One credit per candidate, debited up front at `POST`. The parent spec §7 is
explicit that refunds are new ledger rows with a positive delta, never edits — `014`'s
append-only trigger enforces that at the database level regardless. A candidate whose core
probes did not all succeed is refunded, with reason `refund:<searchId>:<normalizedName>`.

---

## 7. Error handling

**The invariant, inherited from the parent spec: `unknown` must never render as `clear`.**
In this phase there is no `clear`, but the same rule binds the domain probe — an
unresolvable TLD is `"unknown"`, never `"available"`. See §2 for why RDAP makes this easy to
get wrong.

- Per-probe timeout: 8 seconds
- Concurrency cap: 6 simultaneous probes
- One retry with jitter on 5xx; no retry on 4xx
- A rejected probe never rejects the run — it marks that check `failed` and records `error`
- A **core** probe failure triggers the refund for that candidate
- Per-platform circuit breaker: after 3 consecutive failures, the remaining checks for that
  platform are marked `skipped` for the rest of the run

`checks.status = 'failed'` and `checks.status = 'skipped'` are visually distinct from a
successful check in the report. A failed check states that it failed; it never renders as an
absence of findings, which would read as "nothing was found" rather than "we did not look".

---

## 8. Testing

- **Unit** — the RDAP TLD resolver, exhaustively: bootstrap hit, `.io` override, unknown TLD
  → `unknown`, 404 → available, 200 → taken. This is the piece most likely to be wrong and
  most damaging when it is.
- **Contract** — each probe adapter against recorded fixtures, no network. Fixtures captured
  from the real responses recorded in §2.
- **Integration** — the search lifecycle against stub probes: happy path, core-probe failure
  → refund written, circuit breaker → `skipped`, insufficient credits → 402 and no rows
  written.
- **No E2E** — deferred to 3b, when the report is in its final form.

---

## 9. Prerequisites

`FIRECRAWL_API_KEY` must be added to `.env.local` and the Vercel environment. Everything
else in this phase is keyless.

---

## 10. Done criteria

1. `npm run build` and `npm test` pass.
2. A signed-in user with credits submits candidates and reaches a report showing, per
   candidate, the App Store, domain, and web results.
3. The balance drops by exactly one credit per candidate submitted.
4. A candidate whose core probe fails is refunded, and `credit_ledger` shows a positive row
   with reason `refund:…`.
5. `.io` availability is correct in both directions; a TLD with no RDAP server renders
   `unknown` and never `available`.
6. A second search for the same name hits `platform_cache` and issues no outbound API call.
7. A failed check renders as failed, never as an empty or clear result.
8. No verdict, score, or colour appears anywhere — that is Phase 4.
