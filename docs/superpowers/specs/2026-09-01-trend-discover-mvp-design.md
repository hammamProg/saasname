# Trend Discover MVP — Design

**Date:** 2026-09-01
**Status:** Approved for planning
**Source docs:** `marketing/research/SaaSNa_Micro_SaaS_Product_Blueprint.md`, `marketing/research/SaaSNa_API_Catalog.md`

## Context

SaaSNa.me is pivoting from a name-generation/clearance product to a personalized trend-intelligence product (see blueprint). The full product is large — multi-source ingestion, personalization, an email briefing system, a Builder opportunity engine with validation reports and projects, radars, an admin console, and billing tiers. This spec scopes the **first buildable slice**: a working Discover loop that proves signals can be ingested, clustered, scored, and shown to a user as a personalized feed they can act on.

**Full pivot, reuse infra.** The existing Next.js 16 / Supabase / NextAuth / Paddle foundation (FastShip base) is kept. Only the product surface — routes, data model, dashboard — changes. The naming/clearance feature's routes are removed from navigation but not deleted, pending a later decision on whether naming becomes a Builder-mode module (blueprint §14).

## Out of scope (this slice)

- Builder mode, opportunities, validation reports, projects, name/domain module
- Radars, watchlists beyond simple follow/hide
- Email briefings (weekly/daily) and preference center
- Public SEO trend pages
- Admin/editorial console (topics publish automatically past a confidence threshold; no human review workflow yet)
- Billing/credit model changes
- Any connector requiring commercial approval not yet secured: Product Hunt (needs permission), Google Trends API Alpha (access-gated), Reddit, paid app-intelligence/domain/news providers beyond what's listed below

## Architecture

```
Vercel Cron (per-source schedule)
      ↓
Connector route handlers (app/api/internal/ingest/[source])
  HN · GitHub · npm · PyPI · RSS · arXiv · Hugging Face · Stack Exchange · DataForSEO
      ↓
Raw signal storage (Supabase `signals` table, append-only, content_hash dedupe)
      ↓
Normalize (shared connector interface → common signal shape)
      ↓
Topic clustering (OpenAI embeddings → pgvector cosine similarity + merge threshold)
      ↓
Nightly snapshot + trend scoring (topic_snapshots, momentum, stage classification)
      ↓
Discover feed (personalized by onboarding interests) + Follow/Hide
```

No new vendors beyond OpenAI (embeddings + summarization) and DataForSEO (keyword demand). Both already P0 in the API catalog. Ingestion runs on Vercel Cron + Next.js route handlers — no separate job-orchestration vendor for this slice.

## Data model

New tables (existing `users`/NextAuth tables untouched):

```
categories        -- fixed seed list: AI, SaaS, mobile/web apps, dev tools, startups,
                      productivity, marketing, creator economy, e-commerce, consumer tech,
                      online communities, future of work (blueprint §9.3)

topics             id, slug, canonical_name, description, category_id, stage,
                    first_detected_at, last_updated_at, confidence_score, trend_score,
                    is_public, editorial_status (needs_review | published)

topic_aliases       topic_id, alias_text  -- merged names from clustering

signals             id, topic_id (nullable until clustered), source_provider, source_type,
                    external_id, canonical_url, published_at, retrieved_at, language,
                    country_or_region, title, text_excerpt, engagement_metrics jsonb,
                    raw_metrics jsonb, content_hash (unique, dedupe key)

topic_snapshots     topic_id, snapshot_date, signal_count, engagement_sum, momentum, stage
                    -- one row per topic per day; powers sparkline + change detection

user_preferences    user_id, selected_categories text[], builder_mode_enabled (false,
                    unused this slice)

follows             user_id, topic_id, created_at

hidden_topics       user_id, topic_id, reason nullable, created_at
```

## Connectors

Each connector is a module implementing `fetch(sinceCursor) → RawSignal[]`, registered in a connector registry with a per-connector kill-switch env flag (catalog's commercial-risk rule: disable a provider without a deploy).

| Connector | Endpoint | Cadence | Signal type |
|---|---|---|---|
| Hacker News | Firebase API (`/topstories`, `/item`) | hourly | launch/discussion |
| GitHub | REST search (repos by created/pushed) | hourly | code adoption |
| npm | Registry + downloads API | daily | code adoption |
| PyPI | JSON API + pypistats | daily | code adoption |
| RSS | Curated OPML list (~20-30 hand-picked blogs/changelogs) | hourly | publisher |
| arXiv | API by category (cs.AI, cs.CL, etc.) | daily | research |
| Hugging Face | Hub API (trending models/datasets) | daily | AI adoption |
| Stack Exchange | API (questions by tag) | daily | dev pain/adoption |
| DataForSEO | Keywords Data + Labs, credit-limited daily batch | daily | demand |

## Pipeline

1. **Ingest** — each connector's cron route writes rows to `signals`, skipping rows whose `content_hash` already exists.
2. **Normalize** — map each source's raw response into the common signal shape (per API catalog's "Required normalized fields").
3. **Cluster** — embed `title + excerpt` (`text-embedding-3-small`), pgvector cosine search against existing topic centroids. Above threshold → merge into existing topic (add alias if new name variant); below threshold → create new topic with `editorial_status = needs_review`.
4. **Snapshot** — nightly job aggregates the day's signals per topic into `topic_snapshots`; computes momentum as week-over-week delta in signal count/engagement.
5. **Score + stage** — simplified weighted formula from blueprint §17.1 (momentum, cross-source confirmation, sustained growth) produces `trend_score`; stage assigned from fixed labels (Early Signal, Emerging, Accelerating, Established, Cooling). Topics clear `needs_review` automatically once `confidence_score` and multi-source count pass a threshold — no human review this slice.
6. **Summarize** — OpenAI generates the one-sentence explanation and "why it's trending" text, cached on the `topics` row, always paired with linked source evidence (never presented as fact without a source link, per blueprint §29.1).

## Onboarding

One screen, added post-signup: "Select at least 3 interests" from the fixed category list. Writes `user_preferences.selected_categories`. Skippable — skipping defaults to all categories so the feed is never empty.

## Discover feed UI

Replaces `/dashboard/new` as the default authenticated landing page (`/dashboard`).

- **For You** — topics matching `selected_categories`, ranked by `trend_score`
- **Rising Fast** — top momentum across all categories, unfiltered (exploration slot, prevents filter-bubble narrowing per blueprint §20.4)

**Trend card:** name, one-sentence explanation, category, stage badge, momentum, confidence, source count, "why you see this," Follow/Hide.

**Trend detail** (`/dashboard/trends/[slug]`): summary, why-it's-trending, sparkline from `topic_snapshots`, linked source evidence, related topics (nearest pgvector neighbors), Follow/Hide.

**Follow/Hide** write to `follows`/`hidden_topics` and immediately affect ranking — hides suppress that topic and its near-neighbor cluster from future ranking. No ML relearning this slice.

The existing `/dashboard/new` and `/dashboard/searches` routes are removed from nav but not deleted.

## Error handling & cost control

- Each connector run is isolated: one source failing (rate limit, API shape change, timeout) logs to Sentry and skips only that source; never blocks other connectors or crashes the cron route.
- Per-connector kill switch via env flag.
- Embeddings computed once per signal, reused across all users (no per-user regeneration).
- DataForSEO calls batched with a hard daily cap (env-configured).
- OpenAI summarization runs once per topic on score change, cached — not regenerated per page view.
- Raw connector responses stored as jsonb for replay/debugging without re-hitting source APIs.

## Testing

- Unit tests per connector: fixture raw response → normalized common signal shape.
- Unit tests for dedupe (`content_hash` collision) and clustering merge-threshold logic.
- Integration test: seed fake signals → run snapshot/scoring job → assert stage/trend_score output.
- E2E (Playwright): onboarding → feed renders → follow a trend → detail page shows it.

## Acceptance criteria

- A new user can select interests (or skip) and see a populated Discover feed.
- Feed items show why they're recommended; user can Follow and Hide.
- At least the 9 listed connectors run on schedule and write deduplicated signals.
- Topics show stage, confidence, and linked source evidence; no unsupported quantitative claims are displayed.
- A broken/rate-limited connector does not take down ingestion for other sources.
- Trend detail page shows a real snapshot-derived sparkline, not fabricated data.
