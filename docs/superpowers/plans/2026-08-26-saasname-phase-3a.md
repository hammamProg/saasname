# SaaSNa.me Phase 3a — Core probes and the first report

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate candidate names against the App Store, domain registries, and web search, spend a credit per candidate, refund on core failure, and render a report of what was found.

**Architecture:** Migration `015` adds `searches`, `candidates`, `checks`, and a global `platform_cache`. Three probe adapters implement one `PlatformProbe` interface and emit signals only — never verdicts. A runner fans out with a concurrency cap, writes each check as it settles, and refunds candidates whose core probes failed. The report is a server component reading finished rows.

**Tech Stack:** Next.js 16.2.9, Supabase Postgres with RLS, Vitest, RDAP, the iTunes Search API, Firecrawl search.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase-3a-core-probes-design.md`](../specs/2026-08-26-phase-3a-core-probes-design.md)

## Global Constraints

- **Next.js 16 uses `proxy.ts`, not `middleware.ts`.**
- **Path alias:** `@/*` maps to the project root.
- **Vitest only collects `**/*.test.ts`** — no `.test.tsx`.
- **API routes use `getAuthUser()` + `unauthorizedResponse()`**, never `requireUser()`.
- **The ledger is append-only.** Refunds are new positive rows. Never `UPDATE` or `DELETE` a ledger row.
- **`unknown` never renders as `clear`.** In this phase: an unresolvable TLD is `"unknown"`, never `"available"`.
- **Probes emit signals only.** No probe decides a verdict.
- **Reuse `normalizeName`** from `@/libs/names/normalize`. Do not write a second normalizer.
- **No `verdict` column** on `checks` — Phase 4 adds it with the rollup that fills it.
- Migrations are sequential; the last is `014`, so this is `015`.

---

## Task 1: Migration 015

**Files:** Create `supabase/migrations/015_searches.sql`

**Produces:** tables `searches`, `candidates`, `checks`, `platform_cache`

- [ ] **Step 1: Write the migration** — four tables per spec §4, RLS on all four. Users may `select` their own `searches`, and `candidates`/`checks` through their parent `searches`. `platform_cache` gets RLS enabled with **no policy**, so only the service role reaches it.
- [ ] **Step 2: Apply via the Supabase MCP** `apply_migration`.
- [ ] **Step 3: Verify** with `list_tables` and a privilege query; run `get_advisors` for security and fix anything flagged.
- [ ] **Step 4: Commit.**

---

## Task 2: The probe interface and TLD resolver

**Files:**
- Create `libs/probes/types.ts`, `libs/probes/rdap-tlds.ts`
- Test `libs/probes/rdap-tlds.test.ts`

**Produces:** `PlatformProbe`, `ProbeResult`, `ProbeSignals`, `ProbeContext`, `resolveRdapBase(tld)`, `SUPPORTED_TLDS`

The resolver is the highest-risk unit in the phase — see spec §2. A 404 from a server we
selected means available; no server means `unknown`.

- [ ] **Step 1: Write the failing tests** — bootstrap hit, `.io` override, unsupported TLD returns `null`, casing, leading dot tolerated.
- [ ] **Step 2: Run, confirm red.**
- [ ] **Step 3: Implement** with a static map (bundled, no network at request time).
- [ ] **Step 4: Run, confirm green.**
- [ ] **Step 5: Commit.**

---

## Task 3: The domains probe

**Files:** Create `libs/probes/domains.ts`; Test `libs/probes/domains.test.ts`

**Consumes:** `resolveRdapBase`, `normalizeName`
**Produces:** `domainsProbe: PlatformProbe`

- [ ] **Step 1: Failing tests** — 404 → `available`, 200 → `taken`, unsupported TLD → `unknown`, 5xx → `unknown` (never `available`), timeout → `unknown`, registration/expiration dates captured for `.com`.
- [ ] **Step 2: Red.**
- [ ] **Step 3: Implement.** All five TLDs in parallel; per-TLD failure is isolated.
- [ ] **Step 4: Green.**
- [ ] **Step 5: Commit.**

---

## Task 4: The app-store probe

**Files:** Create `libs/probes/app-store.ts`; Test `libs/probes/app-store.test.ts`

**Produces:** `appStoreProbe: PlatformProbe`

- [ ] **Step 1: Failing tests** — exact match extracts rating count/average/last-updated/seller; no results → `resultCount: 0, exactMatch: false`; non-2xx throws; case-insensitive exact match.
- [ ] **Step 2: Red.** — [ ] **Step 3: Implement.** — [ ] **Step 4: Green.** — [ ] **Step 5: Commit.**

---

## Task 5: The web-serp probe

**Files:** Create `libs/probes/web-serp.ts`; Test `libs/probes/web-serp.test.ts`

**Produces:** `webSerpProbe: PlatformProbe`

- [ ] **Step 1: Failing tests** — counts results, counts exact title matches, detects an exact-name domain in any result URL, missing key throws, non-2xx throws.
- [ ] **Step 2: Red.** — [ ] **Step 3: Implement.** — [ ] **Step 4: Green.** — [ ] **Step 5: Commit.**

---

## Task 6: The cache layer

**Files:** Create `libs/probes/cache.ts`; Test `libs/probes/cache.test.ts`

**Produces:** `readCache(platform, normalizedName)`, `writeCache(...)`, `CACHE_TTL_DAYS = 7`

Global, not per-user — spec §4 calls this the largest margin lever in the system.

- [ ] **Step 1: Failing tests** — miss returns null, expired row returns null, hit returns payload, write upserts on the composite key, a cache failure never breaks the caller.
- [ ] **Step 2: Red.** — [ ] **Step 3: Implement.** — [ ] **Step 4: Green.** — [ ] **Step 5: Commit.**

---

## Task 7: The probe runner

**Files:** Create `libs/probes/run.ts`, `libs/probes/registry.ts`; Test `libs/probes/run.test.ts`

**Produces:** `runProbe(probe, name, ctx)`, `CORE_PROBES`

Wraps one probe with cache, timeout, retry, and error capture. Returns a settled result
rather than throwing, so one bad probe never rejects a run.

- [ ] **Step 1: Failing tests** — cache hit skips the probe, miss runs and writes, 8s timeout → failed, 5xx retried once, 4xx not retried, thrown error captured as `{status:'failed', error}` not a rejection.
- [ ] **Step 2: Red.** — [ ] **Step 3: Implement.** — [ ] **Step 4: Green.** — [ ] **Step 5: Commit.**

---

## Task 8: The search service

**Files:** Create `libs/searches/create.ts`; Test `libs/searches/create.test.ts`

**Consumes:** `spendCredits`, `grantCredits` path via RPC, `runProbe`, `CORE_PROBES`
**Produces:** `createSearch(args): Promise<{ searchId: string }>`

- [ ] **Step 1: Failing tests** — debits one credit per candidate; insufficient credits throws before any row is written; all-ok sets `complete` and refunds nothing; one failed core probe refunds exactly that candidate; circuit breaker marks remaining checks `skipped` after 3 consecutive platform failures; concurrency never exceeds 6.
- [ ] **Step 2: Red.** — [ ] **Step 3: Implement.** — [ ] **Step 4: Green.** — [ ] **Step 5: Commit.**

---

## Task 9: POST /api/searches

**Files:** Create `app/api/searches/route.ts`

- [ ] **Step 1: Write the route.** `getAuthUser` → 401; validation → 400; `InsufficientCreditsError` → 402; success → `{ searchId }`. `maxDuration = 60`.
- [ ] **Step 2: Typecheck; verify anonymous POST returns 401.**
- [ ] **Step 3: Commit.**

---

## Task 10: The report page

**Files:** Create `app/dashboard/searches/[id]/page.tsx`, `components/dashboard/CheckCard.tsx`, `components/dashboard/SignalList.tsx`; modify `GenerateForm` to post and navigate

- [ ] **Step 1: Build the report** — per candidate, one card per platform showing status and signals. `failed` and `skipped` are visually distinct from `ok`; a failed check states that it failed and never renders as an absence of findings. No verdict colours.
- [ ] **Step 2: Wire the form** — add a "Validate these names" action that posts the candidates and routes to the report.
- [ ] **Step 3: Typecheck, test, build.**
- [ ] **Step 4: Verify in the browser** with a real signed-in session: report renders, balance drops by one per candidate.
- [ ] **Step 5: Commit.**

---

## Done criteria

Mirrors spec §10.
