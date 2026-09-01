# Trend Discover MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the name-generation dashboard with a working Discover loop: ingest signals from 9 sources, cluster them into topics, score/stage them, and show a personalized feed a user can Follow/Hide.

**Architecture:** Vercel Cron triggers one Next.js route handler per connector, which fetches and normalizes signals into Supabase (`signals`). A nightly pipeline route clusters signals into `topics` via OpenAI embeddings + pgvector, snapshots daily activity, scores/stages topics, and summarizes them via OpenAI chat completion. The Discover feed reads `topics` filtered by the user's onboarding interests and follow/hide state.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + pgvector), OpenAI (`text-embedding-3-small` + chat completions), `rss-parser` for RSS/Atom, Vitest, Playwright.

## Global Constraints

- Reuse existing infra: Supabase service-role client (`libs/supabase.ts` `createSupabaseAdmin`), user-scoped client (`libs/supabase/server.ts`), auth via `libs/supabase/auth-api.ts` `getAuthUser`, `libs/llm/provider.ts` `LlmProvider`/`LlmError` interface.
- Follow existing conventions: JSDoc explaining *why* not *what*, explicit types on exported functions, no `console.log` (use `console.error` only for logged failures, matching existing routes), Vitest with `vi.mock`/`vi.hoisted`, migrations as plain numbered `.sql` files in `supabase/migrations/`.
- No Reddit, Product Hunt, Google Trends, or any connector requiring commercial approval not yet secured.
- Every connector must be independently disable-able via an env flag and must never throw in a way that stops other connectors' cron runs.
- Never present AI-generated topic summaries without linked source evidence.
- Do not touch billing/credits code paths (`libs/credits/*`, `libs/paddle/*`) — Discover feed access is free, no credit spend.
- Naming/clearance routes (`/dashboard/new`, `/dashboard/searches`) are removed from nav only, not deleted.

---

### Task 1: Trend schema migration

**Files:**
- Create: `supabase/migrations/019_trends_schema.sql`

**Interfaces:**
- Produces: tables `categories`, `topics` (with `embedding vector(1536)`), `topic_aliases`, `signals`, `topic_snapshots`, `follows`, `hidden_topics`; column additions `profiles` gets no changes (preferences live in new `user_preferences` table); Postgres function `match_topics(query_embedding vector(1536), match_threshold float, match_count int)`.

- [ ] **Step 1: Write the migration file**

```sql
-- Trend-intelligence schema for the SaaSNa pivot (Discover MVP slice).
-- See docs/superpowers/specs/2026-09-01-trend-discover-mvp-design.md.

create extension if not exists vector;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  canonical_name text not null,
  description text,
  why_trending text,
  category_id uuid references public.categories (id),
  stage text not null default 'early_signal'
    check (stage in ('early_signal', 'emerging', 'accelerating', 'established', 'cooling')),
  first_detected_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  confidence_score numeric not null default 0,
  trend_score numeric not null default 0,
  is_public boolean not null default false,
  editorial_status text not null default 'needs_review'
    check (editorial_status in ('needs_review', 'published')),
  -- text-embedding-3-small dimension. No ivfflat index yet: added once row
  -- count justifies the build/maintenance cost (per design doc cost-control
  -- principles); a sequential scan is fine at MVP topic counts.
  embedding vector(1536)
);

create index if not exists topics_category_idx on public.topics (category_id);
create index if not exists topics_trend_score_idx on public.topics (trend_score desc);
create index if not exists topics_editorial_status_idx on public.topics (editorial_status);

create table if not exists public.topic_aliases (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  alias_text text not null,
  created_at timestamptz not null default now(),
  unique (topic_id, alias_text)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics (id) on delete set null,
  source_provider text not null,
  source_type text not null
    check (source_type in
      ('search', 'social', 'news', 'launch', 'app', 'review', 'code', 'commerce', 'research')),
  external_id text not null,
  canonical_url text not null,
  published_at timestamptz not null,
  retrieved_at timestamptz not null default now(),
  language text,
  country_or_region text,
  title text not null,
  text_excerpt text,
  engagement_metrics jsonb not null default '{}'::jsonb,
  raw_metrics jsonb not null default '{}'::jsonb,
  category_hint text,
  content_hash text not null unique
);

create index if not exists signals_topic_idx on public.signals (topic_id);
create index if not exists signals_retrieved_idx on public.signals (retrieved_at desc);
create index if not exists signals_provider_idx on public.signals (source_provider);

create table if not exists public.topic_snapshots (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  snapshot_date date not null,
  signal_count int not null default 0,
  engagement_sum numeric not null default 0,
  momentum numeric not null default 0,
  stage text not null,
  unique (topic_id, snapshot_date)
);

create index if not exists topic_snapshots_topic_date_idx
  on public.topic_snapshots (topic_id, snapshot_date desc);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_categories text[] not null default '{}',
  builder_mode_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can upsert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

create table if not exists public.follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.follows enable row level security;

create policy "Users manage own follows"
  on public.follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.hidden_topics (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.hidden_topics enable row level security;

create policy "Users manage own hidden topics"
  on public.hidden_topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- topics/signals/topic_snapshots/categories are written only by the service
-- role (ingestion + pipeline routes) and read publicly for published topics.
alter table public.categories enable row level security;
alter table public.topics enable row level security;
alter table public.topic_aliases enable row level security;
alter table public.signals enable row level security;
alter table public.topic_snapshots enable row level security;

create policy "Anyone can read categories"
  on public.categories for select
  using (true);

create policy "Anyone can read published topics"
  on public.topics for select
  using (editorial_status = 'published');

create policy "Anyone can read snapshots of published topics"
  on public.topic_snapshots for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = topic_snapshots.topic_id
        and topics.editorial_status = 'published'
    )
  );

-- Nearest-neighbor lookup used by the clustering step. Returns the single
-- closest topic by cosine distance; the caller decides whether the
-- similarity clears the merge threshold.
create or replace function public.match_topics(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (id uuid, similarity float)
language sql stable
as $$
  select topics.id, 1 - (topics.embedding <=> query_embedding) as similarity
  from public.topics
  where topics.embedding is not null
  order by topics.embedding <=> query_embedding
  limit match_count;
$$;

insert into public.categories (slug, name, sort_order) values
  ('ai', 'AI', 1),
  ('saas', 'SaaS', 2),
  ('mobile-apps', 'Mobile & web apps', 3),
  ('dev-tools', 'Developer tools', 4),
  ('startups', 'Startups', 5),
  ('productivity', 'Productivity', 6),
  ('marketing', 'Marketing', 7),
  ('creator-economy', 'Creator economy', 8),
  ('ecommerce', 'E-commerce', 9),
  ('consumer-tech', 'Consumer technology', 10),
  ('communities', 'Online communities', 11),
  ('future-of-work', 'Future of work', 12)
on conflict (slug) do nothing;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase migration up` (or apply via the Supabase MCP `apply_migration` tool against the project, matching how prior migrations in this repo were applied — check `supabase/migrations/` for the most recent applied one first).

Verify: query `select slug from categories order by sort_order;` returns 12 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/019_trends_schema.sql
git commit -m "feat: add trend-intelligence schema (topics, signals, follows)"
```

---

### Task 2: Signal and connector types

**Files:**
- Create: `libs/trends/types.ts`

**Interfaces:**
- Produces: `type SourceType`, `interface RawSignal`, `interface Connector`, `type CategorySlug`, `const CATEGORY_SLUGS`.

- [ ] **Step 1: Write the types file**

```typescript
/** Matches the `source_type` check constraint in `signals`. */
export type SourceType =
  | "search"
  | "social"
  | "news"
  | "launch"
  | "app"
  | "review"
  | "code"
  | "commerce"
  | "research";

export const CATEGORY_SLUGS = [
  "ai",
  "saas",
  "mobile-apps",
  "dev-tools",
  "startups",
  "productivity",
  "marketing",
  "creator-economy",
  "ecommerce",
  "consumer-tech",
  "communities",
  "future-of-work",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** One piece of evidence from a connector, before dedupe/normalization
 *  assigns a content_hash. `categoryHint` is the connector's best guess at
 *  which category this belongs to; clustering uses it to seed a new topic's
 *  category, not to gate matching against existing topics. */
export interface RawSignal {
  sourceProvider: string;
  sourceType: SourceType;
  externalId: string;
  canonicalUrl: string;
  publishedAt: string;
  title: string;
  textExcerpt?: string;
  language?: string;
  countryOrRegion?: string;
  engagementMetrics?: Record<string, number>;
  rawMetrics?: Record<string, unknown>;
  categoryHint?: CategorySlug;
}

/** Every connector implements this. `id` matches the `source_provider`
 *  value written to `signals` and the env flag name
 *  (`INGEST_<ID upper snake>_ENABLED`). */
export interface Connector {
  id: string;
  fetchSignals(): Promise<RawSignal[]>;
}
```

- [ ] **Step 2: Commit**

```bash
git add libs/trends/types.ts
git commit -m "feat: add trend signal and connector types"
```

---

### Task 3: Ingest helper (dedupe + insert)

**Files:**
- Create: `libs/trends/ingest.ts`
- Test: `libs/trends/ingest.test.ts`

**Interfaces:**
- Consumes: `RawSignal` from `@/libs/trends/types`, `createSupabaseAdmin` from `@/libs/supabase`.
- Produces: `ingestSignals(connectorId: string, signals: RawSignal[]): Promise<{ inserted: number; skipped: number }>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestSignals } from "@/libs/trends/ingest";
import type { RawSignal } from "@/libs/trends/types";

const upsert = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn(() => ({ upsert })));

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from }),
}));

const signal: RawSignal = {
  sourceProvider: "hacker_news",
  sourceType: "launch",
  externalId: "123",
  canonicalUrl: "https://example.com/123",
  publishedAt: "2026-09-01T00:00:00.000Z",
  title: "Example",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ingestSignals", () => {
  it("upserts on content_hash and reports inserted count from returned rows", async () => {
    upsert.mockReturnValue({
      select: () => Promise.resolve({ data: [{ id: "row-1" }], error: null }),
    });

    const result = await ingestSignals("hacker_news", [signal]);

    expect(from).toHaveBeenCalledWith("signals");
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source_provider: "hacker_news",
          external_id: "123",
          content_hash: expect.any(String),
        }),
      ]),
      { onConflict: "content_hash", ignoreDuplicates: true }
    );
    expect(result).toEqual({ inserted: 1, skipped: 0 });
  });

  it("counts duplicates as skipped, not failed", async () => {
    upsert.mockReturnValue({
      select: () => Promise.resolve({ data: [], error: null }),
    });

    const result = await ingestSignals("hacker_news", [signal, signal]);

    expect(result).toEqual({ inserted: 0, skipped: 2 });
  });

  it("returns zeros without calling Supabase when given no signals", async () => {
    const result = await ingestSignals("hacker_news", []);

    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(from).not.toHaveBeenCalled();
  });

  it("throws when Supabase is not configured", async () => {
    const { createSupabaseAdmin } = await import("@/libs/supabase");
    vi.mocked(createSupabaseAdmin).mockReturnValueOnce(null as never);

    await expect(ingestSignals("hacker_news", [signal])).rejects.toThrow(
      "Supabase is not configured"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/ingest.test.ts`
Expected: FAIL — `Cannot find module '@/libs/trends/ingest'`

- [ ] **Step 3: Write the implementation**

```typescript
import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/libs/supabase";
import type { RawSignal } from "@/libs/trends/types";

/** Same source + same external id is always the same evidence, so the hash
 *  is deterministic on those two fields alone — re-ingesting an unchanged
 *  item is a no-op, not a duplicate row. */
function contentHash(signal: RawSignal): string {
  return createHash("sha256")
    .update(`${signal.sourceProvider}:${signal.externalId}`)
    .digest("hex");
}

/** Writes a connector's fetched signals to `signals`, skipping anything
 *  already stored. Uses `ON CONFLICT ... DO NOTHING` via Supabase's
 *  `ignoreDuplicates` upsert so re-running a connector never errors on
 *  overlap — the `.select()` after upsert returns only the rows Postgres
 *  actually inserted, which is how `inserted` vs `skipped` is derived
 *  without a second query. */
export async function ingestSignals(
  connectorId: string,
  signals: RawSignal[]
): Promise<{ inserted: number; skipped: number }> {
  if (signals.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const rows = signals.map((signal) => ({
    source_provider: signal.sourceProvider,
    source_type: signal.sourceType,
    external_id: signal.externalId,
    canonical_url: signal.canonicalUrl,
    published_at: signal.publishedAt,
    language: signal.language ?? null,
    country_or_region: signal.countryOrRegion ?? null,
    title: signal.title,
    text_excerpt: signal.textExcerpt ?? null,
    engagement_metrics: signal.engagementMetrics ?? {},
    raw_metrics: signal.rawMetrics ?? {},
    category_hint: signal.categoryHint ?? null,
    content_hash: contentHash(signal),
  }));

  const { data, error } = await supabase
    .from("signals")
    .upsert(rows, { onConflict: "content_hash", ignoreDuplicates: true })
    .select();

  if (error) {
    throw new Error(`[${connectorId}] Failed to write signals: ${error.message}`);
  }

  const inserted = data?.length ?? 0;

  return { inserted, skipped: signals.length - inserted };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/ingest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/trends/ingest.ts libs/trends/ingest.test.ts
git commit -m "feat: add signal dedupe-and-insert helper"
```

---

### Task 4: Cron auth guard

**Files:**
- Create: `libs/trends/verify-cron.ts`
- Test: `libs/trends/verify-cron.test.ts`

**Interfaces:**
- Produces: `verifyCronRequest(request: Request): NextResponse | null` — returns a response to short-circuit with, or `null` to proceed.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronRequest } from "@/libs/trends/verify-cron";

function requestWith(auth?: string) {
  return new Request("https://example.com/api/internal/ingest/hacker-news", {
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyCronRequest", () => {
  it("allows the request when CRON_SECRET matches", async () => {
    vi.stubEnv("CRON_SECRET", "shh");
    vi.stubEnv("NODE_ENV", "production");

    expect(verifyCronRequest(requestWith("Bearer shh"))).toBeNull();
  });

  it("rejects when the bearer token does not match", async () => {
    vi.stubEnv("CRON_SECRET", "shh");

    const result = verifyCronRequest(requestWith("Bearer wrong"));
    expect(result?.status).toBe(401);
  });

  it("rejects when no secret is configured in production", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    const result = verifyCronRequest(requestWith());
    expect(result?.status).toBe(500);
  });

  it("allows the request when no secret is configured outside production", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(verifyCronRequest(requestWith())).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/verify-cron.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { NextResponse } from "next/server";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env var
 *  is set on the project. Ingestion routes spend real API quota per call, so
 *  they must not be triggerable by an unauthenticated request in production.
 *  Locally, where CRON_SECRET is usually unset, requests are allowed so a
 *  developer can hit the route directly while testing a connector. */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }
    return null;
  }

  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/verify-cron.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/trends/verify-cron.ts libs/trends/verify-cron.test.ts
git commit -m "feat: guard internal cron routes with a bearer secret"
```

---

### Task 5: Category seed queries + connector kill-switch helper

**Files:**
- Create: `libs/trends/topic-seeds.ts`
- Create: `libs/trends/connector-enabled.ts`
- Test: `libs/trends/connector-enabled.test.ts`

**Interfaces:**
- Produces: `CATEGORY_SEED_QUERIES: Record<CategorySlug, string[]>`, `isConnectorEnabled(connectorId: string): boolean`.

- [ ] **Step 1: Write `topic-seeds.ts`**

```typescript
import type { CategorySlug } from "@/libs/trends/types";

/** Search/query terms per category, used by connectors that need a query
 *  (GitHub, Stack Exchange, DataForSEO) rather than a firehose (HN, RSS).
 *  Hand-picked at launch; expanding this list is the cheapest way to widen
 *  coverage without adding a new connector. */
export const CATEGORY_SEED_QUERIES: Record<CategorySlug, string[]> = {
  ai: ["artificial intelligence", "llm agent", "machine learning"],
  saas: ["saas", "b2b software"],
  "mobile-apps": ["mobile app", "ios app", "android app"],
  "dev-tools": ["developer tools", "cli tool"],
  startups: ["startup", "indie hacker"],
  productivity: ["productivity tool", "workflow automation"],
  marketing: ["marketing automation", "growth tool"],
  "creator-economy": ["creator tools", "content creator"],
  ecommerce: ["ecommerce", "online store"],
  "consumer-tech": ["consumer tech", "gadget"],
  communities: ["community platform", "online community"],
  "future-of-work": ["remote work", "future of work"],
};
```

- [ ] **Step 2: Write the failing test for `connector-enabled.ts`**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isConnectorEnabled", () => {
  it("defaults to enabled when no flag is set", () => {
    expect(isConnectorEnabled("hacker_news")).toBe(true);
  });

  it("is disabled when the env flag is explicitly 'false'", () => {
    vi.stubEnv("INGEST_HACKER_NEWS_ENABLED", "false");
    expect(isConnectorEnabled("hacker_news")).toBe(false);
  });

  it("uppercases and underscores the connector id to build the flag name", () => {
    vi.stubEnv("INGEST_STACK_EXCHANGE_ENABLED", "false");
    expect(isConnectorEnabled("stack_exchange")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run libs/trends/connector-enabled.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the implementation**

```typescript
/** Per-connector kill switch (catalog's commercial-risk rule): a broken or
 *  suddenly-expensive source can be disabled with an env var, no deploy. */
export function isConnectorEnabled(connectorId: string): boolean {
  const flag = `INGEST_${connectorId.toUpperCase()}_ENABLED`;
  return process.env[flag] !== "false";
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run libs/trends/connector-enabled.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add libs/trends/topic-seeds.ts libs/trends/connector-enabled.ts libs/trends/connector-enabled.test.ts
git commit -m "feat: add category seed queries and connector kill-switch"
```

---

### Task 6: Hacker News connector + route

**Files:**
- Create: `libs/trends/connectors/hacker-news.ts`
- Test: `libs/trends/connectors/hacker-news.test.ts`
- Create: `app/api/internal/ingest/hacker-news/route.ts`

**Interfaces:**
- Consumes: `Connector`, `RawSignal` from `@/libs/trends/types`.
- Produces: `hackerNewsConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hackerNewsConnector } from "@/libs/trends/connectors/hacker-news";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("hackerNewsConnector", () => {
  it("fetches top story ids then maps each item into a RawSignal", async () => {
    const fetchMock = vi
      .fn()
      // topstories
      .mockResolvedValueOnce({ ok: true, json: async () => [1, 2] })
      // item 1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: "Show HN: A thing",
          url: "https://example.com/thing",
          time: 1893456000,
          score: 120,
          descendants: 30,
        }),
      })
      // item 2
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          title: "Ask HN: something",
          time: 1893456100,
          score: 5,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await hackerNewsConnector.fetchSignals();

    expect(signals).toHaveLength(2);
    expect(signals[0]).toMatchObject({
      sourceProvider: "hacker_news",
      sourceType: "launch",
      externalId: "1",
      canonicalUrl: "https://example.com/thing",
      title: "Show HN: A thing",
      engagementMetrics: { score: 120, comments: 30 },
    });
    // No url on the raw item falls back to the HN discussion page.
    expect(signals[1].canonicalUrl).toBe("https://news.ycombinator.com/item?id=2");
  });

  it("skips items that fail to fetch instead of throwing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [1] })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await hackerNewsConnector.fetchSignals();

    expect(signals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/hacker-news.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";

const BASE_URL = "https://hacker-news.firebaseio.com/v0";
/** Enough to cover meaningful daily movement without hammering the
 *  unauthenticated Firebase endpoint on every hourly run. */
const MAX_ITEMS = 60;

type HnItem = {
  id: number;
  title?: string;
  url?: string;
  time?: number;
  score?: number;
  descendants?: number;
};

async function fetchItem(id: number): Promise<HnItem | null> {
  const response = await fetch(`${BASE_URL}/item/${id}.json`);

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as HnItem;
}

export const hackerNewsConnector: Connector = {
  id: "hacker_news",

  async fetchSignals(): Promise<RawSignal[]> {
    const response = await fetch(`${BASE_URL}/topstories.json`);

    if (!response.ok) {
      throw new Error(`Hacker News topstories returned ${response.status}`);
    }

    const ids = ((await response.json()) as number[]).slice(0, MAX_ITEMS);
    const items = await Promise.all(ids.map(fetchItem));
    const signals: RawSignal[] = [];

    for (const item of items) {
      if (!item?.id || !item.title || !item.time) continue;

      signals.push({
        sourceProvider: "hacker_news",
        sourceType: "launch",
        externalId: String(item.id),
        canonicalUrl: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        publishedAt: new Date(item.time * 1000).toISOString(),
        title: item.title,
        engagementMetrics: {
          score: item.score ?? 0,
          comments: item.descendants ?? 0,
        },
      });
    }

    return signals;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/hacker-news.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { hackerNewsConnector } from "@/libs/trends/connectors/hacker-news";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(hackerNewsConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await hackerNewsConnector.fetchSignals();
    const result = await ingestSignals(hackerNewsConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/hacker-news]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/hacker-news.ts libs/trends/connectors/hacker-news.test.ts app/api/internal/ingest/hacker-news/route.ts
git commit -m "feat: add Hacker News connector"
```

---

### Task 7: GitHub connector + route

**Files:**
- Create: `libs/trends/connectors/github.ts`
- Test: `libs/trends/connectors/github.test.ts`
- Create: `app/api/internal/ingest/github/route.ts`

**Interfaces:**
- Consumes: `CATEGORY_SEED_QUERIES` from `@/libs/trends/topic-seeds`.
- Produces: `githubConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { githubConnector } from "@/libs/trends/connectors/github";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("githubConnector", () => {
  it("queries once per category and maps repository items into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 42,
            full_name: "acme/widget",
            html_url: "https://github.com/acme/widget",
            description: "A widget",
            created_at: "2026-08-30T00:00:00Z",
            stargazers_count: 300,
            forks_count: 10,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await githubConnector.fetchSignals();

    expect(fetchMock).toHaveBeenCalledTimes(12); // one call per category
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]).toMatchObject({
      sourceProvider: "github",
      sourceType: "code",
      externalId: "42",
      canonicalUrl: "https://github.com/acme/widget",
      title: "acme/widget",
      textExcerpt: "A widget",
      engagementMetrics: { stars: 300, forks: 10 },
    });
  });

  it("skips a category whose request fails rather than throwing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(githubConnector.fetchSignals()).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/github.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type GitHubItem = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  stargazers_count: number;
  forks_count: number;
};

/** Repos created in roughly the last two weeks, so an hourly run keeps
 *  surfacing the same window rather than scanning all of GitHub history. */
function sinceDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
}

export const githubConnector: Connector = {
  id: "github",

  async fetchSignals(): Promise<RawSignal[]> {
    const since = sinceDate();
    const signals: RawSignal[] = [];
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    // Sequential, not parallel: GitHub's search endpoint allows 10 req/min
    // unauthenticated (30 with a token), and 12 categories fits either way
    // only if the requests are spaced out, not fired in a burst.
    for (const category of CATEGORY_SLUGS) {
      const terms = CATEGORY_SEED_QUERIES[category].join(" OR ");
      const query = encodeURIComponent(`${terms} created:>${since}`);
      const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=10`;

      try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          continue;
        }

        const body = (await response.json()) as { items: GitHubItem[] };

        for (const item of body.items) {
          signals.push({
            sourceProvider: "github",
            sourceType: "code",
            externalId: String(item.id),
            canonicalUrl: item.html_url,
            publishedAt: item.created_at,
            title: item.full_name,
            textExcerpt: item.description ?? undefined,
            engagementMetrics: {
              stars: item.stargazers_count,
              forks: item.forks_count,
            },
            categoryHint: category,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/github.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { githubConnector } from "@/libs/trends/connectors/github";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(githubConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await githubConnector.fetchSignals();
    const result = await ingestSignals(githubConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/github]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/github.ts libs/trends/connectors/github.test.ts app/api/internal/ingest/github/route.ts
git commit -m "feat: add GitHub connector"
```

---

### Task 8: npm connector + route

**Files:**
- Create: `libs/trends/connectors/npm.ts`
- Test: `libs/trends/connectors/npm.test.ts`
- Create: `app/api/internal/ingest/npm/route.ts`

**Interfaces:**
- Produces: `npmConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { npmConnector } from "@/libs/trends/connectors/npm";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("npmConnector", () => {
  it("queries the registry search API per category and maps packages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        objects: [
          {
            package: {
              name: "widget-ai",
              description: "AI widgets",
              date: "2026-08-20T00:00:00Z",
              links: { npm: "https://www.npmjs.com/package/widget-ai" },
            },
            score: { detail: { popularity: 0.8 } },
            searchScore: 12.3,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await npmConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "npm",
      sourceType: "code",
      externalId: "widget-ai",
      canonicalUrl: "https://www.npmjs.com/package/widget-ai",
      title: "widget-ai",
      textExcerpt: "AI widgets",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/npm.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type NpmSearchResult = {
  objects: Array<{
    package: {
      name: string;
      description?: string;
      date: string;
      links: { npm?: string };
    };
    score: { detail: { popularity: number } };
  }>;
};

export const npmConnector: Connector = {
  id: "npm",

  async fetchSignals(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    for (const category of CATEGORY_SLUGS) {
      const text = encodeURIComponent(CATEGORY_SEED_QUERIES[category][0]);
      const url = `https://registry.npmjs.org/-/v1/search?text=${text}&size=10&popularity=1.0`;

      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const body = (await response.json()) as NpmSearchResult;

        for (const entry of body.objects) {
          signals.push({
            sourceProvider: "npm",
            sourceType: "code",
            externalId: entry.package.name,
            canonicalUrl:
              entry.package.links.npm ??
              `https://www.npmjs.com/package/${entry.package.name}`,
            publishedAt: entry.package.date,
            title: entry.package.name,
            textExcerpt: entry.package.description,
            engagementMetrics: { popularity: entry.score.detail.popularity },
            categoryHint: category,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/npm.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { npmConnector } from "@/libs/trends/connectors/npm";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(npmConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await npmConnector.fetchSignals();
    const result = await ingestSignals(npmConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/npm]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/npm.ts libs/trends/connectors/npm.test.ts app/api/internal/ingest/npm/route.ts
git commit -m "feat: add npm connector"
```

---

### Task 9: PyPI connector + route

**Files:**
- Create: `libs/trends/connectors/pypi.ts`
- Test: `libs/trends/connectors/pypi.test.ts`
- Create: `app/api/internal/ingest/pypi/route.ts`

**Interfaces:**
- Consumes: `rss-parser` (installed this task).
- Produces: `pypiConnector: Connector`.

PyPI's search HTTP API is deprecated; the officially documented alternative is its RSS feed of newly published packages, which this connector parses.

- [ ] **Step 1: Install the RSS/Atom parser dependency**

Run: `npm install rss-parser`

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { pypiConnector } from "@/libs/trends/connectors/pypi";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("pypiConnector", () => {
  it("parses the PyPI new-packages RSS feed into RawSignals", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "widget-ml",
          link: "https://pypi.org/project/widget-ml/",
          contentSnippet: "Machine learning widgets",
          isoDate: "2026-08-31T10:00:00.000Z",
          guid: "https://pypi.org/project/widget-ml/",
        },
      ],
    });

    const signals = await pypiConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "pypi",
      sourceType: "code",
      externalId: "https://pypi.org/project/widget-ml/",
      canonicalUrl: "https://pypi.org/project/widget-ml/",
      title: "widget-ml",
      textExcerpt: "Machine learning widgets",
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/pypi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the implementation**

```typescript
import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";

const FEED_URL = "https://pypi.org/rss/packages.xml";

export const pypiConnector: Connector = {
  id: "pypi",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    const signals: RawSignal[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      signals.push({
        sourceProvider: "pypi",
        sourceType: "code",
        externalId: item.guid ?? item.link,
        canonicalUrl: item.link,
        publishedAt: item.isoDate ?? new Date().toISOString(),
        title: item.title,
        textExcerpt: item.contentSnippet,
      });
    }

    return signals;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/pypi.test.ts`
Expected: PASS

- [ ] **Step 6: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { pypiConnector } from "@/libs/trends/connectors/pypi";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(pypiConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await pypiConnector.fetchSignals();
    const result = await ingestSignals(pypiConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/pypi]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json libs/trends/connectors/pypi.ts libs/trends/connectors/pypi.test.ts app/api/internal/ingest/pypi/route.ts
git commit -m "feat: add PyPI connector"
```

---

### Task 10: RSS connector + route

**Files:**
- Create: `libs/trends/rss-feeds.ts`
- Create: `libs/trends/connectors/rss.ts`
- Test: `libs/trends/connectors/rss.test.ts`
- Create: `app/api/internal/ingest/rss/route.ts`

**Interfaces:**
- Consumes: `rss-parser` (from Task 9).
- Produces: `rssConnector: Connector`, `RSS_FEEDS: readonly { url: string; categoryHint: CategorySlug }[]`.

- [ ] **Step 1: Write the curated feed list**

```typescript
import type { CategorySlug } from "@/libs/trends/types";

/** Hand-picked at launch, per the design doc. Each entry pairs a feed with
 *  the category its content is expected to fall under; the connector still
 *  runs through clustering, so a mis-tagged item just seeds a topic in the
 *  wrong category rather than breaking anything. */
export const RSS_FEEDS: ReadonlyArray<{ url: string; categoryHint: CategorySlug }> = [
  { url: "https://openai.com/blog/rss.xml", categoryHint: "ai" },
  { url: "https://www.anthropic.com/rss.xml", categoryHint: "ai" },
  { url: "https://vercel.com/atom", categoryHint: "dev-tools" },
  { url: "https://blog.cloudflare.com/rss/", categoryHint: "dev-tools" },
  { url: "https://stripe.com/blog/feed.rss", categoryHint: "saas" },
  { url: "https://www.saastr.com/feed/", categoryHint: "saas" },
  { url: "https://techcrunch.com/category/startups/feed/", categoryHint: "startups" },
  { url: "https://www.indiehackers.com/feed.rss", categoryHint: "startups" },
  { url: "https://blog.hubspot.com/marketing/rss.xml", categoryHint: "marketing" },
  { url: "https://shopify.engineering/blog.atom", categoryHint: "ecommerce" },
  { url: "https://github.blog/feed/", categoryHint: "dev-tools" },
  { url: "https://a16z.com/feed/", categoryHint: "startups" },
];
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { rssConnector } from "@/libs/trends/connectors/rss";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("rssConnector", () => {
  it("parses every configured feed and tags items with their category hint", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "New release",
          link: "https://example.com/post",
          contentSnippet: "Details",
          isoDate: "2026-08-31T00:00:00.000Z",
          guid: "https://example.com/post",
        },
      ],
    });

    const signals = await rssConnector.fetchSignals();

    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]).toMatchObject({
      sourceProvider: "rss",
      sourceType: "news",
      title: "New release",
      canonicalUrl: "https://example.com/post",
    });
    expect(signals[0].categoryHint).toBeDefined();
  });

  it("skips a feed that fails to parse rather than throwing", async () => {
    parseURL
      .mockRejectedValueOnce(new Error("bad feed"))
      .mockResolvedValue({ items: [] });

    await expect(rssConnector.fetchSignals()).resolves.toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/rss.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the implementation**

```typescript
import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";
import { RSS_FEEDS } from "@/libs/trends/rss-feeds";

export const rssConnector: Connector = {
  id: "rss",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const signals: RawSignal[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const result = await parser.parseURL(feed.url);

        for (const item of result.items) {
          if (!item.title || !item.link) continue;

          signals.push({
            sourceProvider: "rss",
            sourceType: "news",
            externalId: item.guid ?? item.link,
            canonicalUrl: item.link,
            publishedAt: item.isoDate ?? new Date().toISOString(),
            title: item.title,
            textExcerpt: item.contentSnippet,
            categoryHint: feed.categoryHint,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/rss.test.ts`
Expected: PASS

- [ ] **Step 6: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { rssConnector } from "@/libs/trends/connectors/rss";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(rssConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await rssConnector.fetchSignals();
    const result = await ingestSignals(rssConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/rss]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add libs/trends/rss-feeds.ts libs/trends/connectors/rss.ts libs/trends/connectors/rss.test.ts app/api/internal/ingest/rss/route.ts
git commit -m "feat: add RSS connector"
```

---

### Task 11: arXiv connector + route

**Files:**
- Create: `libs/trends/connectors/arxiv.ts`
- Test: `libs/trends/connectors/arxiv.test.ts`
- Create: `app/api/internal/ingest/arxiv/route.ts`

**Interfaces:**
- Consumes: `rss-parser` (Atom support).
- Produces: `arxivConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { arxivConnector } from "@/libs/trends/connectors/arxiv";

const parseURL = vi.hoisted(() => vi.fn());

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL })),
}));

describe("arxivConnector", () => {
  it("queries one Atom feed per AI-relevant category and maps entries", async () => {
    parseURL.mockResolvedValue({
      items: [
        {
          title: "A Study of Widget Transformers",
          link: "https://arxiv.org/abs/2609.00001",
          contentSnippet: "We study widgets.",
          isoDate: "2026-08-31T00:00:00.000Z",
          id: "https://arxiv.org/abs/2609.00001",
        },
      ],
    });

    const signals = await arxivConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "arxiv",
      sourceType: "research",
      externalId: "https://arxiv.org/abs/2609.00001",
      canonicalUrl: "https://arxiv.org/abs/2609.00001",
      title: "A Study of Widget Transformers",
      categoryHint: "ai",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/arxiv.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import Parser from "rss-parser";
import type { Connector, RawSignal } from "@/libs/trends/types";

/** arXiv categories relevant to the product's scope (blueprint §2.1). Every
 *  result is tagged "ai" — arXiv doesn't map cleanly onto the other 11
 *  categories, and forcing it would misclassify research signals. */
const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"];
const MAX_RESULTS = 25;

export const arxivConnector: Connector = {
  id: "arxiv",

  async fetchSignals(): Promise<RawSignal[]> {
    const parser = new Parser();
    const signals: RawSignal[] = [];

    for (const category of ARXIV_CATEGORIES) {
      const url =
        `http://export.arxiv.org/api/query?search_query=cat:${category}` +
        `&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;

      try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          signals.push({
            sourceProvider: "arxiv",
            sourceType: "research",
            externalId: item.id ?? item.link,
            canonicalUrl: item.link,
            publishedAt: item.isoDate ?? new Date().toISOString(),
            title: item.title.replace(/\s+/g, " ").trim(),
            textExcerpt: item.contentSnippet,
            categoryHint: "ai",
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/arxiv.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { arxivConnector } from "@/libs/trends/connectors/arxiv";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(arxivConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await arxivConnector.fetchSignals();
    const result = await ingestSignals(arxivConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ingest/arxiv]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/arxiv.ts libs/trends/connectors/arxiv.test.ts app/api/internal/ingest/arxiv/route.ts
git commit -m "feat: add arXiv connector"
```

---

### Task 12: Hugging Face connector + route

**Files:**
- Create: `libs/trends/connectors/hugging-face.ts`
- Test: `libs/trends/connectors/hugging-face.test.ts`
- Create: `app/api/internal/ingest/hugging-face/route.ts`

**Interfaces:**
- Produces: `huggingFaceConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { huggingFaceConnector } from "@/libs/trends/connectors/hugging-face";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("huggingFaceConnector", () => {
  it("fetches trending-sorted models and maps them into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "acme/widget-model",
          likes: 400,
          downloads: 15000,
          createdAt: "2026-08-15T00:00:00.000Z",
          pipeline_tag: "text-generation",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await huggingFaceConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "hugging_face",
      sourceType: "app",
      externalId: "acme/widget-model",
      canonicalUrl: "https://huggingface.co/acme/widget-model",
      title: "acme/widget-model",
      engagementMetrics: { likes: 400, downloads: 15000 },
      categoryHint: "ai",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/hugging-face.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";

type HfModel = {
  id: string;
  likes: number;
  downloads: number;
  createdAt: string;
  pipeline_tag?: string;
};

export const huggingFaceConnector: Connector = {
  id: "hugging_face",

  async fetchSignals(): Promise<RawSignal[]> {
    const response = await fetch(
      "https://huggingface.co/api/models?sort=likes&direction=-1&limit=30"
    );

    if (!response.ok) {
      throw new Error(`Hugging Face models API returned ${response.status}`);
    }

    const models = (await response.json()) as HfModel[];

    return models.map((model) => ({
      sourceProvider: "hugging_face",
      sourceType: "app",
      externalId: model.id,
      canonicalUrl: `https://huggingface.co/${model.id}`,
      publishedAt: model.createdAt,
      title: model.id,
      textExcerpt: model.pipeline_tag,
      engagementMetrics: { likes: model.likes, downloads: model.downloads },
      categoryHint: "ai",
    }));
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/hugging-face.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { huggingFaceConnector } from "@/libs/trends/connectors/hugging-face";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(huggingFaceConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await huggingFaceConnector.fetchSignals();
    const result = await ingestSignals(huggingFaceConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/hugging-face]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/hugging-face.ts libs/trends/connectors/hugging-face.test.ts app/api/internal/ingest/hugging-face/route.ts
git commit -m "feat: add Hugging Face connector"
```

---

### Task 13: Stack Exchange connector + route

**Files:**
- Create: `libs/trends/connectors/stack-exchange.ts`
- Test: `libs/trends/connectors/stack-exchange.test.ts`
- Create: `app/api/internal/ingest/stack-exchange/route.ts`

**Interfaces:**
- Produces: `stackExchangeConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { stackExchangeConnector } from "@/libs/trends/connectors/stack-exchange";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("stackExchangeConnector", () => {
  it("queries one tag per category and maps questions into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            question_id: 999,
            title: "How do I use widget agents?",
            link: "https://stackoverflow.com/questions/999",
            creation_date: 1893456000,
            score: 8,
            answer_count: 2,
            view_count: 500,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await stackExchangeConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "stack_exchange",
      sourceType: "search",
      externalId: "999",
      canonicalUrl: "https://stackoverflow.com/questions/999",
      title: "How do I use widget agents?",
      engagementMetrics: { score: 8, answers: 2, views: 500 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/stack-exchange.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SLUGS } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

type SeQuestion = {
  question_id: number;
  title: string;
  link: string;
  creation_date: number;
  score: number;
  answer_count: number;
  view_count: number;
};

export const stackExchangeConnector: Connector = {
  id: "stack_exchange",

  async fetchSignals(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    for (const category of CATEGORY_SLUGS) {
      const tag = encodeURIComponent(
        CATEGORY_SEED_QUERIES[category][0].split(" ")[0]
      );
      const url =
        `https://api.stackexchange.com/2.3/questions?order=desc&sort=activity` +
        `&tagged=${tag}&site=stackoverflow&pagesize=10`;

      try {
        // Modern fetch (undici) decodes the API's gzip response transparently.
        const response = await fetch(url);
        if (!response.ok) continue;

        const body = (await response.json()) as { items: SeQuestion[] };

        for (const item of body.items) {
          signals.push({
            sourceProvider: "stack_exchange",
            sourceType: "search",
            externalId: String(item.question_id),
            canonicalUrl: item.link,
            publishedAt: new Date(item.creation_date * 1000).toISOString(),
            title: item.title,
            engagementMetrics: {
              score: item.score,
              answers: item.answer_count,
              views: item.view_count,
            },
            categoryHint: category,
          });
        }
      } catch {
        continue;
      }
    }

    return signals;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/stack-exchange.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { stackExchangeConnector } from "@/libs/trends/connectors/stack-exchange";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(stackExchangeConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await stackExchangeConnector.fetchSignals();
    const result = await ingestSignals(stackExchangeConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/stack-exchange]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/stack-exchange.ts libs/trends/connectors/stack-exchange.test.ts app/api/internal/ingest/stack-exchange/route.ts
git commit -m "feat: add Stack Exchange connector"
```

---

### Task 14: DataForSEO connector + route

**Files:**
- Create: `libs/trends/connectors/dataforseo.ts`
- Test: `libs/trends/connectors/dataforseo.test.ts`
- Create: `app/api/internal/ingest/dataforseo/route.ts`

**Interfaces:**
- Produces: `dataForSeoConnector: Connector`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dataForSeoConnector } from "@/libs/trends/connectors/dataforseo";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("DATAFORSEO_LOGIN", "user");
  vi.stubEnv("DATAFORSEO_PASSWORD", "pass");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dataForSeoConnector", () => {
  it("posts basic-auth keyword volume requests and maps results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [
          {
            result: [
              {
                keyword: "ai receptionist",
                search_volume: 2400,
                competition: 0.3,
                cpc: 1.2,
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await dataForSeoConnector.fetchSignals();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`
    );
    expect(signals[0]).toMatchObject({
      sourceProvider: "dataforseo",
      sourceType: "search",
      externalId: "ai receptionist",
      title: "ai receptionist",
      engagementMetrics: { searchVolume: 2400, competition: 0.3, cpc: 1.2 },
    });
  });

  it("returns no signals when credentials are missing", async () => {
    vi.stubEnv("DATAFORSEO_LOGIN", "");

    const signals = await dataForSeoConnector.fetchSignals();

    expect(signals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/connectors/dataforseo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import type { Connector, RawSignal } from "@/libs/trends/types";
import { CATEGORY_SEED_QUERIES } from "@/libs/trends/topic-seeds";

/** Hard daily cap on keyword lookups (design doc's cost-control principle).
 *  One request covers all seed keywords, so this bounds the keyword list,
 *  not the request count. */
const MAX_KEYWORDS = 40;

type DataForSeoResult = {
  tasks: Array<{
    result: Array<{
      keyword: string;
      search_volume: number | null;
      competition: number | null;
      cpc: number | null;
    }> | null;
  }>;
};

export const dataForSeoConnector: Connector = {
  id: "dataforseo",

  async fetchSignals(): Promise<RawSignal[]> {
    const login = process.env.DATAFORSEO_LOGIN?.trim();
    const password = process.env.DATAFORSEO_PASSWORD?.trim();

    if (!login || !password) {
      return [];
    }

    const keywords = Object.values(CATEGORY_SEED_QUERIES)
      .flat()
      .slice(0, MAX_KEYWORDS);

    const response = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        },
        body: JSON.stringify([{ keywords, location_code: 2840, language_code: "en" }]),
      }
    );

    if (!response.ok) {
      throw new Error(`DataForSEO returned ${response.status}`);
    }

    const body = (await response.json()) as DataForSeoResult;
    const results = body.tasks.flatMap((task) => task.result ?? []);
    const now = new Date().toISOString();

    return results
      .filter((result) => result.search_volume !== null)
      .map((result) => ({
        sourceProvider: "dataforseo",
        sourceType: "search",
        externalId: result.keyword,
        canonicalUrl: `https://www.google.com/search?q=${encodeURIComponent(result.keyword)}`,
        publishedAt: now,
        title: result.keyword,
        engagementMetrics: {
          searchVolume: result.search_volume ?? 0,
          competition: result.competition ?? 0,
          cpc: result.cpc ?? 0,
        },
      }));
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/connectors/dataforseo.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { isConnectorEnabled } from "@/libs/trends/connector-enabled";
import { dataForSeoConnector } from "@/libs/trends/connectors/dataforseo";
import { ingestSignals } from "@/libs/trends/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!isConnectorEnabled(dataForSeoConnector.id)) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const signals = await dataForSeoConnector.fetchSignals();
    const result = await ingestSignals(dataForSeoConnector.id, signals);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ingest/dataforseo]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/connectors/dataforseo.ts libs/trends/connectors/dataforseo.test.ts app/api/internal/ingest/dataforseo/route.ts
git commit -m "feat: add DataForSEO connector"
```

---

### Task 15: Vercel Cron schedule

**Files:**
- Create: `vercel.json` (or modify if it already exists — check first)

**Interfaces:**
- Produces: cron entries for all 9 ingest routes plus the pipeline route added in Task 18.

- [ ] **Step 1: Check whether `vercel.json` already exists**

Run: `test -f vercel.json && cat vercel.json || echo "no existing vercel.json"`

- [ ] **Step 2: Write (or merge into) `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/internal/ingest/hacker-news", "schedule": "0 * * * *" },
    { "path": "/api/internal/ingest/github", "schedule": "15 * * * *" },
    { "path": "/api/internal/ingest/npm", "schedule": "0 6 * * *" },
    { "path": "/api/internal/ingest/pypi", "schedule": "0 7 * * *" },
    { "path": "/api/internal/ingest/rss", "schedule": "30 * * * *" },
    { "path": "/api/internal/ingest/arxiv", "schedule": "0 8 * * *" },
    { "path": "/api/internal/ingest/hugging-face", "schedule": "0 9 * * *" },
    { "path": "/api/internal/ingest/stack-exchange", "schedule": "0 10 * * *" },
    { "path": "/api/internal/ingest/dataforseo", "schedule": "0 11 * * *" },
    { "path": "/api/internal/pipeline/run", "schedule": "0 2 * * *" }
  ]
}
```

If `vercel.json` already has other keys (e.g. `redirects`), add the `crons` array alongside them rather than overwriting the file.

- [ ] **Step 3: Add `CRON_SECRET` to `.env.example`**

Add a line: `CRON_SECRET=` with a comment above it: `# Random string; Vercel Cron sends it as a bearer token on internal ingest/pipeline routes.`

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: schedule connector and pipeline cron jobs"
```

---

### Task 16: OpenAI LLM provider (chat + embeddings)

**Files:**
- Create: `libs/llm/openai.ts`
- Create: `libs/llm/openai-embeddings.ts`
- Test: `libs/llm/openai.test.ts`
- Test: `libs/llm/openai-embeddings.test.ts`

**Interfaces:**
- Consumes: `LlmProvider`, `LlmCompletionRequest`, `LlmError` from `@/libs/llm/provider`.
- Produces: `isOpenAiConfigured(): boolean`, `createOpenAiProvider(): LlmProvider`, `embedText(text: string): Promise<number[]>`.

- [ ] **Step 1: Write the failing test for the chat provider**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOpenAiProvider, isOpenAiConfigured } from "@/libs/llm/openai";
import { LlmError } from "@/libs/llm/provider";

const KEY = "sk-test-openai-key";

function okResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isOpenAiConfigured", () => {
  it("is false when the key is absent", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isOpenAiConfigured()).toBe(false);
  });
});

describe("createOpenAiProvider", () => {
  it("throws when constructed without a key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => createOpenAiProvider()).toThrow(LlmError);
  });

  it("posts to the chat completions endpoint and returns the content", async () => {
    const fetchMock = vi.fn(async () => okResponse("hello"));
    vi.stubGlobal("fetch", fetchMock);

    const out = await createOpenAiProvider().complete({
      system: "s",
      user: "u",
      model: "gpt-4.1-mini",
      json: true,
    });

    expect(out).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body as string).response_format).toEqual({
      type: "json_object",
    });
  });

  it("raises LlmError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as Response)
    );

    await expect(
      createOpenAiProvider().complete({ system: "s", user: "u", model: "gpt-4.1-mini" })
    ).rejects.toThrow(LlmError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/llm/openai.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `libs/llm/openai.ts`**

```typescript
import {
  LlmError,
  type LlmCompletionRequest,
  type LlmProvider,
} from "@/libs/llm/provider";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_DETAIL_CHARS = 200;

export function isOpenAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

function redact(text: string, apiKey: string): string {
  return text.split(apiKey).join("[redacted]");
}

/** OpenAI chat completions, mirroring the DeepSeek provider's shape so
 *  callers (topic summarization) are provider-agnostic. */
export function createOpenAiProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not configured");
  }

  return {
    async complete({
      system,
      user,
      model,
      json,
      timeoutMs,
      maxOutputTokens,
    }: LlmCompletionRequest): Promise<string> {
      const budget = timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), budget);

      try {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            ...(json ? { response_format: { type: "json_object" } } : {}),
            ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new LlmError(
            `OpenAI returned ${response.status}: ${redact(detail, apiKey).slice(0, MAX_DETAIL_CHARS)}`,
            response.status
          );
        }

        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;

        if (typeof content !== "string" || !content.trim()) {
          throw new LlmError("OpenAI returned an empty completion");
        }

        return content;
      } catch (error) {
        if (error instanceof LlmError) throw error;

        if (error instanceof Error && error.name === "AbortError") {
          throw new LlmError(`OpenAI timed out after ${budget}ms`);
        }

        throw new LlmError(
          redact(error instanceof Error ? error.message : String(error), apiKey)
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/llm/openai.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for embeddings**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { embedText } from "@/libs/llm/openai-embeddings";
import { LlmError } from "@/libs/llm/provider";

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("embedText", () => {
  it("returns the embedding vector from the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      }) as unknown as Response)
    );

    const vector = await embedText("hello world");

    expect(vector).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws LlmError without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(embedText("hello")).rejects.toThrow(LlmError);
  });

  it("throws LlmError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }) as unknown as Response)
    );

    await expect(embedText("hello")).rejects.toThrow(LlmError);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run libs/llm/openai-embeddings.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Write `libs/llm/openai-embeddings.ts`**

```typescript
import { LlmError } from "@/libs/llm/provider";

/** 1536-dim, matches the `vector(1536)` column on `topics`. */
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(`OpenAI embeddings returned ${response.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return body.data[0].embedding;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run libs/llm/openai-embeddings.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add libs/llm/openai.ts libs/llm/openai-embeddings.ts libs/llm/openai.test.ts libs/llm/openai-embeddings.test.ts
git commit -m "feat: add OpenAI chat and embeddings providers"
```

---

### Task 17: Topic clustering

**Files:**
- Create: `libs/trends/cluster.ts`
- Test: `libs/trends/cluster.test.ts`

**Interfaces:**
- Consumes: `embedText` from `@/libs/llm/openai-embeddings`, `createSupabaseAdmin` from `@/libs/supabase`.
- Produces: `clusterUnclusteredSignals(): Promise<{ clustered: number; newTopics: number }>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";

const embedText = vi.hoisted(() => vi.fn());
vi.mock("@/libs/llm/openai-embeddings", () => ({ embedText }));

const state = vi.hoisted(() => ({
  signals: [] as Array<{ id: string; title: string; text_excerpt: string | null; category_hint: string | null }>,
  matches: [] as Array<{ id: string; similarity: number }>,
  updatedSignal: null as { id: string; topic_id: string } | null,
  inserted: null as { slug: string } | null,
}));

function selectSignalsChain() {
  return {
    is: () => ({ limit: async () => ({ data: state.signals, error: null }) }),
  };
}

function fromMock(table: string) {
  if (table === "signals") {
    return {
      select: () => selectSignalsChain(),
      update: (values: { topic_id: string }) => ({
        eq: async (_col: string, id: string) => {
          state.updatedSignal = { id, topic_id: values.topic_id };
          return { error: null };
        },
      }),
    };
  }
  if (table === "topics") {
    return {
      insert: (values: { slug: string }) => ({
        select: () => ({
          single: async () => {
            state.inserted = values;
            return { data: { id: "new-topic-id" }, error: null };
          },
        }),
      }),
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: fromMock,
    rpc: async () => ({ data: state.matches, error: null }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.signals = [
    { id: "sig-1", title: "AI receptionist", text_excerpt: null, category_hint: "ai" },
  ];
  state.matches = [];
  state.updatedSignal = null;
  state.inserted = null;
  embedText.mockResolvedValue(new Array(1536).fill(0.01));
});

describe("clusterUnclusteredSignals", () => {
  it("creates a new topic when no existing topic clears the similarity threshold", async () => {
    state.matches = [{ id: "existing", similarity: 0.4 }];

    const result = await clusterUnclusteredSignals();

    expect(result).toEqual({ clustered: 1, newTopics: 1 });
    expect(state.inserted).toMatchObject({ slug: expect.stringContaining("ai-receptionist") });
    expect(state.updatedSignal).toEqual({ id: "sig-1", topic_id: "new-topic-id" });
  });

  it("merges into an existing topic when similarity clears the threshold", async () => {
    state.matches = [{ id: "existing-topic", similarity: 0.9 }];

    const result = await clusterUnclusteredSignals();

    expect(result).toEqual({ clustered: 1, newTopics: 0 });
    expect(state.updatedSignal).toEqual({ id: "sig-1", topic_id: "existing-topic" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/cluster.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createSupabaseAdmin } from "@/libs/supabase";
import { embedText } from "@/libs/llm/openai-embeddings";

/** Cosine similarity above this merges a signal into an existing topic;
 *  below it, the signal seeds a new topic instead. Picked as a starting
 *  point per the design doc — tune once real clustering output can be
 *  eyeballed against `topics.editorial_status`. */
const MERGE_THRESHOLD = 0.82;
/** Caps one pipeline run so a slow embedding provider can't blow past the
 *  cron route's maxDuration. */
const BATCH_SIZE = 200;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base}-${Date.now().toString(36)}`;
}

/** Embeds every not-yet-clustered signal and either merges it into the
 *  nearest existing topic (via `match_topics`) or creates a new one. Runs
 *  one signal at a time on purpose: each embedding call is independent and a
 *  failure on one signal must not lose progress on the rest. */
export async function clusterUnclusteredSignals(): Promise<{
  clustered: number;
  newTopics: number;
}> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data: signals, error } = await supabase
    .from("signals")
    .select("id, title, text_excerpt, category_hint")
    .is("topic_id", null)
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to load unclustered signals: ${error.message}`);
  }

  let clustered = 0;
  let newTopics = 0;

  for (const signal of signals ?? []) {
    try {
      const embedding = await embedText(
        [signal.title, signal.text_excerpt].filter(Boolean).join(" — ")
      );

      const { data: matches } = await supabase.rpc("match_topics", {
        query_embedding: embedding,
        match_threshold: MERGE_THRESHOLD,
        match_count: 1,
      });

      const best = matches?.[0] as { id: string; similarity: number } | undefined;
      let topicId: string;

      if (best && best.similarity >= MERGE_THRESHOLD) {
        topicId = best.id;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("topics")
          .insert({
            slug: slugify(signal.title),
            canonical_name: signal.title,
            category_id: null,
            embedding,
            editorial_status: "needs_review",
          })
          .select()
          .single();

        if (insertError || !created) {
          throw new Error(insertError?.message ?? "Insert returned no row");
        }

        topicId = created.id as string;
        newTopics += 1;
      }

      const { error: updateError } = await supabase
        .from("signals")
        .update({ topic_id: topicId })
        .eq("id", signal.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      clustered += 1;
    } catch (clusterError) {
      console.error(
        "[cluster]",
        signal.id,
        clusterError instanceof Error ? clusterError.message : clusterError
      );
    }
  }

  return { clustered, newTopics };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/cluster.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/trends/cluster.ts libs/trends/cluster.test.ts
git commit -m "feat: cluster signals into topics via embeddings"
```

---

### Task 18: Snapshot + scoring

**Files:**
- Create: `libs/trends/score.ts`
- Create: `libs/trends/snapshot.ts`
- Test: `libs/trends/score.test.ts`
- Test: `libs/trends/snapshot.test.ts`

**Interfaces:**
- Produces: `computeTrendScore(current: SnapshotInput, previous: SnapshotInput | null): { trendScore: number; confidenceScore: number; stage: Stage }`, `runDailySnapshotAndScore(): Promise<{ topicsProcessed: number }>`.

- [ ] **Step 1: Write the failing test for the pure scoring function**

```typescript
import { describe, it, expect } from "vitest";
import { computeTrendScore } from "@/libs/trends/score";

describe("computeTrendScore", () => {
  it("scores a brand-new topic as an early signal with low confidence", () => {
    const result = computeTrendScore(
      { signalCount: 2, engagementSum: 50, sourceCount: 1 },
      null
    );

    expect(result.stage).toBe("early_signal");
    expect(result.confidenceScore).toBeLessThan(50);
  });

  it("scores rising signal count and multi-source confirmation as accelerating", () => {
    const result = computeTrendScore(
      { signalCount: 20, engagementSum: 5000, sourceCount: 4 },
      { signalCount: 8, engagementSum: 1500, sourceCount: 3 }
    );

    expect(result.stage).toBe("accelerating");
    expect(result.trendScore).toBeGreaterThan(50);
  });

  it("scores falling signal count as cooling", () => {
    const result = computeTrendScore(
      { signalCount: 3, engagementSum: 200, sourceCount: 2 },
      { signalCount: 15, engagementSum: 3000, sourceCount: 3 }
    );

    expect(result.stage).toBe("cooling");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/score.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `libs/trends/score.ts`**

```typescript
export type Stage = "early_signal" | "emerging" | "accelerating" | "established" | "cooling";

export type SnapshotInput = {
  signalCount: number;
  engagementSum: number;
  sourceCount: number;
};

/** Simplified version of the design doc's weighted formula (blueprint §17.1):
 *  momentum + cross-source confirmation + sustained growth, each 0-100 then
 *  weighted. Confidence is tracked separately from attractiveness on
 *  purpose — a topic can be exciting and still low-confidence with one
 *  source, and the two must never collapse into a single opaque number. */
export function computeTrendScore(
  current: SnapshotInput,
  previous: SnapshotInput | null
): { trendScore: number; confidenceScore: number; stage: Stage } {
  const momentumRatio = previous
    ? (current.signalCount - previous.signalCount) / Math.max(previous.signalCount, 1)
    : current.signalCount > 0
      ? 1
      : 0;
  const momentumScore = clamp((momentumRatio + 1) * 50, 0, 100);

  const confirmationScore = clamp(current.sourceCount * 25, 0, 100);
  const sustainedScore = previous ? clamp(previous.signalCount * 10, 0, 100) : 0;

  const trendScore = clamp(
    momentumScore * 0.5 + confirmationScore * 0.3 + sustainedScore * 0.2,
    0,
    100
  );

  const confidenceScore = clamp(
    current.sourceCount * 20 + (previous ? 20 : 0) + Math.min(current.signalCount, 5) * 4,
    0,
    100
  );

  let stage: Stage;
  if (!previous) {
    stage = "early_signal";
  } else if (momentumRatio <= -0.3) {
    stage = "cooling";
  } else if (momentumRatio >= 0.5) {
    stage = "accelerating";
  } else if (current.sourceCount >= 3 && current.signalCount >= 10) {
    stage = "established";
  } else {
    stage = "emerging";
  }

  return { trendScore, confidenceScore, stage };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/score.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for the snapshot job**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";

const state = vi.hoisted(() => ({
  topics: [{ id: "topic-1" }] as Array<{ id: string }>,
  todaySignals: [] as Array<{ source_provider: string; engagement_metrics: Record<string, number> }>,
  previousSnapshot: null as { signal_count: number; engagement_sum: number } | null,
  upsertedSnapshot: null as Record<string, unknown> | null,
  updatedTopic: null as Record<string, unknown> | null,
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({ limit: async () => ({ data: state.topics, error: null }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.updatedTopic = values;
          return { error: null };
        },
      }),
    };
  }
  if (table === "signals") {
    return {
      select: () => ({
        eq: () => ({ gte: async () => ({ data: state.todaySignals, error: null }) }),
      }),
    };
  }
  if (table === "topic_snapshots") {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ data: state.previousSnapshot ? [state.previousSnapshot] : [], error: null }) }),
        }),
      }),
      upsert: async (values: Record<string, unknown>) => {
        state.upsertedSnapshot = values;
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.topics = [{ id: "topic-1" }];
  state.todaySignals = [
    { source_provider: "hacker_news", engagement_metrics: { score: 10 } },
    { source_provider: "github", engagement_metrics: { stars: 5 } },
  ];
  state.previousSnapshot = null;
  state.upsertedSnapshot = null;
  state.updatedTopic = null;
});

describe("runDailySnapshotAndScore", () => {
  it("writes a snapshot and updates the topic's score and stage", async () => {
    const result = await runDailySnapshotAndScore();

    expect(result).toEqual({ topicsProcessed: 1 });
    expect(state.upsertedSnapshot).toMatchObject({
      topic_id: "topic-1",
      signal_count: 2,
    });
    expect(state.updatedTopic).toMatchObject({
      trend_score: expect.any(Number),
      confidence_score: expect.any(Number),
      stage: expect.any(String),
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run libs/trends/snapshot.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Write `libs/trends/snapshot.ts`**

```typescript
import { createSupabaseAdmin } from "@/libs/supabase";
import { computeTrendScore, type SnapshotInput } from "@/libs/trends/score";

/** A topic is auto-published once it clears both bars — cross-source
 *  confirmation and a minimum confidence — rather than by human review
 *  (design doc: no editorial console this slice). */
const PUBLISH_CONFIDENCE_THRESHOLD = 40;
const PUBLISH_MIN_SOURCES = 2;

function sumEngagement(metrics: Record<string, number>): number {
  return Object.values(metrics).reduce((total, value) => total + (value || 0), 0);
}

/** Runs once nightly (cron, Task 15). For every topic with unscored recent
 *  activity, aggregates the last 24h of signals into a snapshot row, scores
 *  the topic against its most recent prior snapshot, and flips
 *  `editorial_status` to `published` once thresholds clear. */
export async function runDailySnapshotAndScore(): Promise<{ topicsProcessed: number }> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Every topic gets a fresh snapshot each run, regardless of
  // editorial_status — a `needs_review` topic still needs its score updated
  // so it has a chance to clear the publish threshold on a later run.
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id")
    .limit(500);

  if (topicsError) {
    throw new Error(`Failed to load topics: ${topicsError.message}`);
  }

  let processed = 0;

  for (const topic of topics ?? []) {
    try {
      const { data: signals, error: signalsError } = await supabase
        .from("signals")
        .select("source_provider, engagement_metrics")
        .eq("topic_id", topic.id)
        .gte("retrieved_at", since);

      if (signalsError) throw new Error(signalsError.message);

      const rows = signals ?? [];
      const current: SnapshotInput = {
        signalCount: rows.length,
        engagementSum: rows.reduce(
          (total, row) => total + sumEngagement(row.engagement_metrics ?? {}),
          0
        ),
        sourceCount: new Set(rows.map((row) => row.source_provider)).size,
      };

      const { data: previousRows } = await supabase
        .from("topic_snapshots")
        .select("signal_count, engagement_sum")
        .eq("topic_id", topic.id)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      const previous = previousRows?.[0]
        ? {
            signalCount: previousRows[0].signal_count,
            engagementSum: previousRows[0].engagement_sum,
            sourceCount: current.sourceCount,
          }
        : null;

      const { trendScore, confidenceScore, stage } = computeTrendScore(current, previous);

      await supabase.from("topic_snapshots").upsert(
        {
          topic_id: topic.id,
          snapshot_date: today,
          signal_count: current.signalCount,
          engagement_sum: current.engagementSum,
          momentum: previous ? current.signalCount - previous.signalCount : 0,
          stage,
        },
        { onConflict: "topic_id,snapshot_date" }
      );

      const shouldPublish =
        confidenceScore >= PUBLISH_CONFIDENCE_THRESHOLD &&
        current.sourceCount >= PUBLISH_MIN_SOURCES;

      await supabase
        .from("topics")
        .update({
          trend_score: trendScore,
          confidence_score: confidenceScore,
          stage,
          last_updated_at: new Date().toISOString(),
          ...(shouldPublish ? { editorial_status: "published", is_public: true } : {}),
        })
        .eq("id", topic.id);

      processed += 1;
    } catch (topicError) {
      console.error(
        "[snapshot]",
        topic.id,
        topicError instanceof Error ? topicError.message : topicError
      );
    }
  }

  return { topicsProcessed: processed };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run libs/trends/snapshot.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add libs/trends/score.ts libs/trends/score.test.ts libs/trends/snapshot.ts libs/trends/snapshot.test.ts
git commit -m "feat: add trend snapshot and scoring pipeline step"
```

---

### Task 19: Topic summarization

**Files:**
- Create: `libs/trends/summarize.ts`
- Test: `libs/trends/summarize.test.ts`

**Interfaces:**
- Consumes: `createOpenAiProvider`, `isOpenAiConfigured` from `@/libs/llm/openai`.
- Produces: `summarizeTopicsNeedingSummary(): Promise<{ summarized: number }>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { summarizeTopicsNeedingSummary } from "@/libs/trends/summarize";

const complete = vi.hoisted(() => vi.fn());
vi.mock("@/libs/llm/openai", () => ({
  isOpenAiConfigured: () => true,
  createOpenAiProvider: () => ({ complete }),
}));

const state = vi.hoisted(() => ({
  topics: [{ id: "topic-1", canonical_name: "AI Receptionists" }] as Array<{
    id: string;
    canonical_name: string;
  }>,
  signals: [{ title: "Show HN: AI receptionist", canonical_url: "https://x.com/1" }],
  updated: null as Record<string, unknown> | null,
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({ is: () => ({ limit: async () => ({ data: state.topics, error: null }) }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.updated = values;
          return { error: null };
        },
      }),
    };
  }
  if (table === "signals") {
    return {
      select: () => ({
        eq: () => ({ limit: async () => ({ data: state.signals, error: null }) }),
      }),
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.updated = null;
  complete.mockResolvedValue(
    JSON.stringify({
      description: "Automated agents that answer customer calls and messages.",
      whyTrending: "Search and launch activity both accelerated this week.",
    })
  );
});

describe("summarizeTopicsNeedingSummary", () => {
  it("writes the parsed description and why_trending onto the topic", async () => {
    const result = await summarizeTopicsNeedingSummary();

    expect(result).toEqual({ summarized: 1 });
    expect(state.updated).toMatchObject({
      description: "Automated agents that answer customer calls and messages.",
      why_trending: "Search and launch activity both accelerated this week.",
    });
  });

  it("skips a topic whose completion is not valid JSON rather than throwing", async () => {
    complete.mockResolvedValueOnce("not json");

    const result = await summarizeTopicsNeedingSummary();

    expect(result).toEqual({ summarized: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/summarize.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createSupabaseAdmin } from "@/libs/supabase";
import { createOpenAiProvider, isOpenAiConfigured } from "@/libs/llm/openai";

const MODEL = "gpt-4.1-mini";
const SYSTEM_PROMPT =
  "You write one-sentence, plain-language trend summaries from evidence titles. " +
  "Never state a fact not implied by the titles given. Respond as JSON: " +
  '{"description": string, "whyTrending": string}. Both fields are one sentence.';

type Summary = { description: string; whyTrending: string };

function parseSummary(raw: string): Summary | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Summary>;
    if (typeof parsed.description === "string" && typeof parsed.whyTrending === "string") {
      return { description: parsed.description, whyTrending: parsed.whyTrending };
    }
    return null;
  } catch {
    return null;
  }
}

/** Summarizes topics missing a description — runs once per topic on score
 *  change (design doc's cost-control principle), never per page view. The
 *  summary is always generated from stored signal titles, so it can always
 *  be traced back to linked evidence (blueprint §29.1's trust rule). */
export async function summarizeTopicsNeedingSummary(): Promise<{ summarized: number }> {
  if (!isOpenAiConfigured()) {
    return { summarized: 0 };
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, canonical_name")
    .is("description", null)
    .limit(50);

  if (error) {
    throw new Error(`Failed to load topics needing summary: ${error.message}`);
  }

  const provider = createOpenAiProvider();
  let summarized = 0;

  for (const topic of topics ?? []) {
    try {
      const { data: signals } = await supabase
        .from("signals")
        .select("title, canonical_url")
        .eq("topic_id", topic.id)
        .limit(5);

      const evidence = (signals ?? []).map((s) => `- ${s.title}`).join("\n");
      const raw = await provider.complete({
        system: SYSTEM_PROMPT,
        user: `Topic: ${topic.canonical_name}\nEvidence titles:\n${evidence}`,
        model: MODEL,
        json: true,
        maxOutputTokens: 200,
      });

      const summary = parseSummary(raw);
      if (!summary) continue;

      await supabase
        .from("topics")
        .update({ description: summary.description, why_trending: summary.whyTrending })
        .eq("id", topic.id);

      summarized += 1;
    } catch (summaryError) {
      console.error(
        "[summarize]",
        topic.id,
        summaryError instanceof Error ? summaryError.message : summaryError
      );
    }
  }

  return { summarized };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/summarize.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/trends/summarize.ts libs/trends/summarize.test.ts
git commit -m "feat: summarize topics from linked evidence via OpenAI"
```

---

### Task 20: Pipeline route

**Files:**
- Create: `app/api/internal/pipeline/run/route.ts`

**Interfaces:**
- Consumes: `clusterUnclusteredSignals`, `runDailySnapshotAndScore`, `summarizeTopicsNeedingSummary`, `verifyCronRequest`.

- [ ] **Step 1: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/libs/trends/verify-cron";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";
import { summarizeTopicsNeedingSummary } from "@/libs/trends/summarize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Runs the three pipeline steps in order (cluster → snapshot/score →
 *  summarize) as a single nightly cron job. Each step is independently
 *  fault-tolerant internally; a step throwing here still lets a subsequent
 *  cron run retry from wherever it left off, since every step is idempotent
 *  over "rows still needing work." */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const clusterResult = await clusterUnclusteredSignals();
    const snapshotResult = await runDailySnapshotAndScore();
    const summaryResult = await summarizeTopicsNeedingSummary();

    return NextResponse.json({ clusterResult, snapshotResult, summaryResult });
  } catch (error) {
    console.error("[pipeline/run]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "pipeline failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/internal/pipeline/run/route.ts
git commit -m "feat: add nightly pipeline route (cluster, score, summarize)"
```

---

### Task 21: Preferences (onboarding) API + lib

**Files:**
- Create: `libs/trends/preferences.ts`
- Test: `libs/trends/preferences.test.ts`
- Create: `app/api/preferences/route.ts`

**Interfaces:**
- Produces: `getUserPreferences(userId): Promise<{ selectedCategories: string[] } | null>`, `saveUserPreferences(userId, selectedCategories: string[]): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserPreferences, saveUserPreferences } from "@/libs/trends/preferences";

const maybeSingle = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "user_preferences") {
        return {
          select: () => ({ eq: () => ({ maybeSingle }) }),
          upsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserPreferences", () => {
  it("returns null when the user has no saved preferences", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await getUserPreferences("user-1")).toBeNull();
  });

  it("returns the selected categories when present", async () => {
    maybeSingle.mockResolvedValue({
      data: { selected_categories: ["ai", "saas"] },
      error: null,
    });

    expect(await getUserPreferences("user-1")).toEqual({
      selectedCategories: ["ai", "saas"],
    });
  });
});

describe("saveUserPreferences", () => {
  it("upserts the row keyed by user_id", async () => {
    upsert.mockResolvedValue({ error: null });

    await saveUserPreferences("user-1", ["ai", "dev-tools"]);

    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", selected_categories: ["ai", "dev-tools"] },
      { onConflict: "user_id" }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/preferences.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from "@/libs/supabase/server";

export async function getUserPreferences(
  userId: string
): Promise<{ selectedCategories: string[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("selected_categories")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { selectedCategories: data.selected_categories as string[] };
}

export async function saveUserPreferences(
  userId: string,
  selectedCategories: string[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, selected_categories: selectedCategories },
      { onConflict: "user_id" }
    );

  if (error) {
    throw new Error(`Failed to save preferences: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/preferences.test.ts`
Expected: PASS

- [ ] **Step 5: Write the API route**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { saveUserPreferences } from "@/libs/trends/preferences";
import { CATEGORY_SLUGS } from "@/libs/trends/types";

const MIN_CATEGORIES = 3;

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { selectedCategories?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const selectedCategories = Array.isArray(body.selectedCategories)
    ? body.selectedCategories.filter((c): c is string =>
        (CATEGORY_SLUGS as readonly string[]).includes(c as string)
      )
    : [];

  // A skipped/empty selection is valid and defaults the feed to all
  // categories (design doc: onboarding must never leave the feed empty).
  if (selectedCategories.length > 0 && selectedCategories.length < MIN_CATEGORIES) {
    return NextResponse.json(
      { error: `Choose at least ${MIN_CATEGORIES} interests, or none to see everything.` },
      { status: 400 }
    );
  }

  await saveUserPreferences(user.id, selectedCategories);

  return NextResponse.json({ selectedCategories });
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/preferences.ts libs/trends/preferences.test.ts app/api/preferences/route.ts
git commit -m "feat: add onboarding interest preferences"
```

---

### Task 22: Feed data layer

**Files:**
- Create: `libs/trends/feed.ts`
- Test: `libs/trends/feed.test.ts`

**Interfaces:**
- Produces: `type TrendCardData`, `getForYouFeed(userId, selectedCategories): Promise<TrendCardData[]>`, `getRisingFastFeed(userId): Promise<TrendCardData[]>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";

const state = vi.hoisted(() => ({
  hidden: [{ topic_id: "hidden-1" }],
  follows: [{ topic_id: "topic-1" }],
  topics: [
    { id: "topic-1", slug: "ai-receptionists", canonical_name: "AI Receptionists", description: "d", stage: "accelerating", trend_score: 80, confidence_score: 60, category_id: "cat-ai" },
  ],
}));

function topicsQuery() {
  const builder: Record<string, unknown> = {};
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.not = () => builder;
  builder.order = () => builder;
  builder.limit = async () => ({ data: state.topics, error: null });
  return builder;
}

function fromMock(table: string) {
  if (table === "hidden_topics") {
    return { select: () => ({ eq: async () => ({ data: state.hidden, error: null }) }) };
  }
  if (table === "follows") {
    return { select: () => ({ eq: async () => ({ data: state.follows, error: null }) }) };
  }
  if (table === "topics") {
    return { select: () => topicsQuery() };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getForYouFeed", () => {
  it("returns topics mapped to card data, marked as followed", async () => {
    const feed = await getForYouFeed("user-1", ["ai"]);

    expect(feed).toEqual([
      {
        id: "topic-1",
        slug: "ai-receptionists",
        name: "AI Receptionists",
        description: "d",
        stage: "accelerating",
        trendScore: 80,
        confidenceScore: 60,
        categoryId: "cat-ai",
        isFollowed: true,
      },
    ]);
  });
});

describe("getRisingFastFeed", () => {
  it("returns topics unfiltered by category", async () => {
    const feed = await getRisingFastFeed("user-1");

    expect(feed).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/feed.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from "@/libs/supabase/server";

export type TrendCardData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  stage: string;
  trendScore: number;
  confidenceScore: number;
  categoryId: string | null;
  isFollowed: boolean;
};

const FEED_LIMIT = 20;

async function hiddenTopicIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase.from("hidden_topics").select("topic_id").eq("user_id", userId);
  return (data ?? []).map((row) => row.topic_id as string);
}

async function followedTopicIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase.from("follows").select("topic_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.topic_id as string));
}

function toCardData(
  row: {
    id: string;
    slug: string;
    canonical_name: string;
    description: string | null;
    stage: string;
    trend_score: number;
    confidence_score: number;
    category_id: string | null;
  },
  followed: Set<string>
): TrendCardData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.canonical_name,
    description: row.description,
    stage: row.stage,
    trendScore: row.trend_score,
    confidenceScore: row.confidence_score,
    categoryId: row.category_id,
    isFollowed: followed.has(row.id),
  };
}

/** Ranked by trend_score, filtered to the user's selected categories. An
 *  empty `selectedCategories` (onboarding skipped) means unfiltered, per the
 *  design doc — a picker with nothing selected must never yield an empty
 *  feed. */
export async function getForYouFeed(
  userId: string,
  selectedCategories: string[]
): Promise<TrendCardData[]> {
  const supabase = await createClient();
  const [hidden, followed] = await Promise.all([
    hiddenTopicIds(supabase, userId),
    followedTopicIds(supabase, userId),
  ]);

  let query = supabase
    .from("topics")
    .select("id, slug, canonical_name, description, stage, trend_score, confidence_score, category_id")
    .eq("editorial_status", "published");

  if (selectedCategories.length > 0) {
    query = query.in("category_id", selectedCategories);
  }
  if (hidden.length > 0) {
    query = query.not("id", "in", `(${hidden.join(",")})`);
  }

  const { data, error } = await query.order("trend_score", { ascending: false }).limit(FEED_LIMIT);

  if (error) {
    throw new Error(`Failed to load For You feed: ${error.message}`);
  }

  return (data ?? []).map((row) => toCardData(row, followed));
}

/** Unfiltered by category on purpose — the exploration slot that prevents
 *  the filter-bubble narrowing the design doc calls out. */
export async function getRisingFastFeed(userId: string): Promise<TrendCardData[]> {
  const supabase = await createClient();
  const [hidden, followed] = await Promise.all([
    hiddenTopicIds(supabase, userId),
    followedTopicIds(supabase, userId),
  ]);

  let query = supabase
    .from("topics")
    .select("id, slug, canonical_name, description, stage, trend_score, confidence_score, category_id")
    .eq("editorial_status", "published");

  if (hidden.length > 0) {
    query = query.not("id", "in", `(${hidden.join(",")})`);
  }

  const { data, error } = await query.order("trend_score", { ascending: false }).limit(10);

  if (error) {
    throw new Error(`Failed to load Rising Fast feed: ${error.message}`);
  }

  return (data ?? []).map((row) => toCardData(row, followed));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/feed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/trends/feed.ts libs/trends/feed.test.ts
git commit -m "feat: add Discover feed data layer"
```

---

### Task 23: Follow/Hide actions

**Files:**
- Create: `libs/trends/follows.ts`
- Test: `libs/trends/follows.test.ts`
- Create: `app/api/trends/[id]/follow/route.ts`
- Create: `app/api/trends/[id]/hide/route.ts`

**Interfaces:**
- Produces: `followTopic(userId, topicId): Promise<void>`, `unfollowTopic(userId, topicId): Promise<void>`, `hideTopic(userId, topicId, reason?): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { followTopic, unfollowTopic, hideTopic } from "@/libs/trends/follows";

const upsert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const del = vi.hoisted(() => vi.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) })));

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "follows" || table === "hidden_topics") {
        return { upsert, delete: del };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("follows", () => {
  it("followTopic upserts a follows row", async () => {
    await followTopic("user-1", "topic-1");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", topic_id: "topic-1" },
      { onConflict: "user_id,topic_id" }
    );
  });

  it("unfollowTopic deletes the row", async () => {
    await unfollowTopic("user-1", "topic-1");
    expect(del).toHaveBeenCalled();
  });

  it("hideTopic upserts a hidden_topics row with an optional reason", async () => {
    await hideTopic("user-1", "topic-1", "temporary_fad");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", topic_id: "topic-1", reason: "temporary_fad" },
      { onConflict: "user_id,topic_id" }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/follows.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from "@/libs/supabase/server";

export async function followTopic(userId: string, topicId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .upsert({ user_id: userId, topic_id: topicId }, { onConflict: "user_id,topic_id" });

  if (error) throw new Error(`Failed to follow topic: ${error.message}`);
}

export async function unfollowTopic(userId: string, topicId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  if (error) throw new Error(`Failed to unfollow topic: ${error.message}`);
}

export async function hideTopic(
  userId: string,
  topicId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("hidden_topics")
    .upsert(
      { user_id: userId, topic_id: topicId, reason: reason ?? null },
      { onConflict: "user_id,topic_id" }
    );

  if (error) throw new Error(`Failed to hide topic: ${error.message}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/follows.test.ts`
Expected: PASS

- [ ] **Step 5: Write the follow route**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { followTopic, unfollowTopic } from "@/libs/trends/follows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await followTopic(user.id, id);

  return NextResponse.json({ followed: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await unfollowTopic(user.id, id);

  return NextResponse.json({ followed: false });
}
```

- [ ] **Step 6: Write the hide route**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { hideTopic } from "@/libs/trends/follows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof body.reason === "string" ? body.reason : undefined;

  await hideTopic(user.id, id, reason);

  return NextResponse.json({ hidden: true });
}
```

- [ ] **Step 7: Commit**

```bash
git add libs/trends/follows.ts libs/trends/follows.test.ts app/api/trends/\[id\]/follow/route.ts app/api/trends/\[id\]/hide/route.ts
git commit -m "feat: add follow and hide actions"
```

---

### Task 24: Onboarding + Discover feed UI

**Files:**
- Create: `components/dashboard/CategoryPicker.tsx`
- Create: `components/dashboard/TrendCard.tsx`
- Modify: `app/dashboard/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `getUserPreferences` from `@/libs/trends/preferences`, `getForYouFeed`/`getRisingFastFeed`/`TrendCardData` from `@/libs/trends/feed`, `CATEGORY_SLUGS` from `@/libs/trends/types`.

- [ ] **Step 1: Write `components/dashboard/CategoryPicker.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_SLUGS, type CategorySlug } from "@/libs/trends/types";

const LABELS: Record<CategorySlug, string> = {
  ai: "AI",
  saas: "SaaS",
  "mobile-apps": "Mobile & web apps",
  "dev-tools": "Developer tools",
  startups: "Startups",
  productivity: "Productivity",
  marketing: "Marketing",
  "creator-economy": "Creator economy",
  ecommerce: "E-commerce",
  "consumer-tech": "Consumer technology",
  communities: "Online communities",
  "future-of-work": "Future of work",
};

const MIN_CATEGORIES = 3;

export default function CategoryPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<CategorySlug[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(category: CategorySlug) {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  async function submit(selectedCategories: CategorySlug[]) {
    setError(null);
    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCategories }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <h2 className="section-heading text-2xl font-extrabold">
        What should we watch for you?
      </h2>
      <p className="mt-1 text-sm text-muted">Pick at least {MIN_CATEGORIES} interests.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORY_SLUGS.map((category) => {
          const active = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              className={
                active
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground"
              }
            >
              {LABELS[category]}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={selected.length < MIN_CATEGORIES || isPending}
          onClick={() => submit(selected)}
          className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          Continue
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit([])}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted"
        >
          Skip — show everything
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/dashboard/TrendCard.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { TrendCardData } from "@/libs/trends/feed";

const STAGE_LABELS: Record<string, string> = {
  early_signal: "Early signal",
  emerging: "Emerging",
  accelerating: "Accelerating",
  established: "Established",
  cooling: "Cooling",
};

export default function TrendCard({ trend }: { trend: TrendCardData }) {
  const [isFollowed, setIsFollowed] = useState(trend.isFollowed);
  const [isHidden, setIsHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleFollow() {
    const next = !isFollowed;
    setIsFollowed(next);
    startTransition(async () => {
      await fetch(`/api/trends/${trend.id}/follow`, { method: next ? "POST" : "DELETE" });
    });
  }

  function hide() {
    setIsHidden(true);
    startTransition(async () => {
      await fetch(`/api/trends/${trend.id}/hide`, { method: "POST" });
    });
  }

  if (isHidden) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard/trends/${trend.slug}`} className="text-lg font-bold hover:underline">
            {trend.name}
          </Link>
          {trend.description && <p className="mt-1 text-sm text-muted">{trend.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {STAGE_LABELS[trend.stage] ?? trend.stage}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span>Trend score {Math.round(trend.trendScore)}</span>
        <span>Confidence {Math.round(trend.confidenceScore)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={toggleFollow}
          className={
            isFollowed
              ? "rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white"
              : "rounded-lg border border-border px-4 py-2 text-xs font-bold"
          }
        >
          {isFollowed ? "Following" : "Follow"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={hide}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-muted"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `app/dashboard/page.tsx`**

```typescript
import { requireUser } from "@/libs/supabase/require-user";
import { getUserPreferences } from "@/libs/trends/preferences";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";
import { getSEOTags } from "@/libs/seo";
import CategoryPicker from "@/components/dashboard/CategoryPicker";
import TrendCard from "@/components/dashboard/TrendCard";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Discover",
  description: "Your personalized trend radar.",
  canonicalUrlRelative: "/dashboard",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);

  if (!preferences) {
    return (
      <div className="space-y-8">
        <CategoryPicker />
      </div>
    );
  }

  const [forYou, risingFast] = await Promise.all([
    getForYouFeed(user.id, preferences.selectedCategories),
    getRisingFastFeed(user.id),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">For you</h1>
        {forYou.length === 0 ? (
          <p className="text-muted">
            No published trends match your interests yet — check back soon.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forYou.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="section-heading text-2xl font-extrabold">Rising fast</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {risingFast.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite to check nothing else references the removed dashboard content**

Run: `npx vitest run`
Expected: PASS (existing `DashboardOverview`/`StartCheckCard`/etc. components are simply no longer imported here — leave their files in place since `/dashboard/new` still uses related components; do not delete them)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/CategoryPicker.tsx components/dashboard/TrendCard.tsx app/dashboard/page.tsx
git commit -m "feat: replace dashboard overview with the Discover feed"
```

---

### Task 25: Trend detail page

**Files:**
- Create: `libs/trends/topic-detail.ts`
- Test: `libs/trends/topic-detail.test.ts`
- Create: `app/dashboard/trends/[slug]/page.tsx`

**Interfaces:**
- Produces: `getTopicDetail(slug): Promise<TopicDetail | null>` where `TopicDetail` includes snapshots, evidence, and related topics.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopicDetail } from "@/libs/trends/topic-detail";

const state = vi.hoisted(() => ({
  topic: {
    id: "topic-1",
    slug: "ai-receptionists",
    canonical_name: "AI Receptionists",
    description: "d",
    why_trending: "w",
    stage: "accelerating",
    trend_score: 80,
    confidence_score: 60,
  },
  snapshots: [{ snapshot_date: "2026-08-30", signal_count: 5, momentum: 2 }],
  signals: [{ title: "t", canonical_url: "https://x.com/1", source_provider: "hacker_news" }],
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.topic, error: null }) }),
      }),
    };
  }
  if (table === "topic_snapshots") {
    return {
      select: () => ({
        eq: () => ({ order: async () => ({ data: state.snapshots, error: null }) }),
      }),
    };
  }
  if (table === "signals") {
    return {
      select: () => ({
        eq: () => ({ limit: async () => ({ data: state.signals, error: null }) }),
      }),
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTopicDetail", () => {
  it("returns the topic with its snapshots and evidence", async () => {
    const detail = await getTopicDetail("ai-receptionists");

    expect(detail).toMatchObject({
      name: "AI Receptionists",
      whyTrending: "w",
      snapshots: [{ snapshotDate: "2026-08-30", signalCount: 5, momentum: 2 }],
      evidence: [{ title: "t", url: "https://x.com/1", source: "hacker_news" }],
    });
  });

  it("returns null when no topic matches the slug", async () => {
    state.topic = null as never;
    expect(await getTopicDetail("missing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/trends/topic-detail.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { createClient } from "@/libs/supabase/server";

export type TopicDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  whyTrending: string | null;
  stage: string;
  trendScore: number;
  confidenceScore: number;
  snapshots: Array<{ snapshotDate: string; signalCount: number; momentum: number }>;
  evidence: Array<{ title: string; url: string; source: string }>;
};

export async function getTopicDetail(slug: string): Promise<TopicDetail | null> {
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select(
      "id, slug, canonical_name, description, why_trending, stage, trend_score, confidence_score"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!topic) {
    return null;
  }

  const [{ data: snapshotRows }, { data: signalRows }] = await Promise.all([
    supabase
      .from("topic_snapshots")
      .select("snapshot_date, signal_count, momentum")
      .eq("topic_id", topic.id)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("signals")
      .select("title, canonical_url, source_provider")
      .eq("topic_id", topic.id)
      .limit(10),
  ]);

  return {
    id: topic.id,
    slug: topic.slug,
    name: topic.canonical_name,
    description: topic.description,
    whyTrending: topic.why_trending,
    stage: topic.stage,
    trendScore: topic.trend_score,
    confidenceScore: topic.confidence_score,
    snapshots: (snapshotRows ?? []).map((row) => ({
      snapshotDate: row.snapshot_date,
      signalCount: row.signal_count,
      momentum: row.momentum,
    })),
    evidence: (signalRows ?? []).map((row) => ({
      title: row.title,
      url: row.canonical_url,
      source: row.source_provider,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run libs/trends/topic-detail.test.ts`
Expected: PASS

- [ ] **Step 5: Write the page**

```typescript
import { notFound } from "next/navigation";
import { requireUser } from "@/libs/supabase/require-user";
import { getTopicDetail } from "@/libs/trends/topic-detail";
import { getSEOTags } from "@/libs/seo";

const STAGE_LABELS: Record<string, string> = {
  early_signal: "Early signal",
  emerging: "Emerging",
  accelerating: "Accelerating",
  established: "Established",
  cooling: "Cooling",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getTopicDetail(slug);

  return getSEOTags({
    title: detail?.name ?? "Trend",
    description: detail?.description ?? "Trend detail",
    canonicalUrlRelative: `/dashboard/trends/${slug}`,
  });
}

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const detail = await getTopicDetail(slug);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {STAGE_LABELS[detail.stage] ?? detail.stage}
        </span>
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">{detail.name}</h1>
        {detail.description && <p className="text-muted">{detail.description}</p>}
      </div>

      {detail.whyTrending && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Why it&apos;s trending</h2>
          <p className="mt-2 text-sm text-muted">{detail.whyTrending}</p>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Activity</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {detail.snapshots.map((snapshot) => (
            <li key={snapshot.snapshotDate}>
              {snapshot.snapshotDate}: {snapshot.signalCount} signals (momentum{" "}
              {snapshot.momentum >= 0 ? "+" : ""}
              {snapshot.momentum})
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Source evidence</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {detail.evidence.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {item.title}
              </a>{" "}
              <span className="text-muted">— {item.source}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add libs/trends/topic-detail.ts libs/trends/topic-detail.test.ts app/dashboard/trends/\[slug\]/page.tsx
git commit -m "feat: add trend detail page"
```

---

### Task 26: Update dashboard nav

**Files:**
- Modify: `components/dashboard/AppSidebar.tsx`

**Interfaces:**
- Consumes: none new.

- [ ] **Step 1: Update the nav groups and primary action**

Replace the `NAV_GROUPS` and `PRIMARY_ACTION` constants:

```typescript
const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Discover", icon: Compass, exact: true },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/dashboard/credits",
        label: "Credits",
        icon: Coins,
        exact: false,
        badge: "credits",
      },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
    ],
  },
];
```

Update the icon import line to swap `LayoutDashboard, Search, Sparkles` for `Compass`:

```typescript
import { Coins, Compass, Loader2, Settings } from "lucide-react";
```

Remove the `PRIMARY_ACTION` constant, its rendering block (the `<Link>` wrapping `PRIMARY_ACTION.href` at the top of the returned `<nav>`), and the now-unused `actionActive`/`actionPending` variables — grep the file for `PRIMARY_ACTION` and delete every line it appears on.

- [ ] **Step 2: Run the test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Run the dev server and manually verify nav renders without the removed links**

Run: `npm run dev`, visit `/dashboard`, confirm the sidebar shows only Discover / Credits / Settings and no console errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/AppSidebar.tsx
git commit -m "feat: point dashboard nav at Discover, drop naming links"
```

---

### Task 27: E2E test for the Discover loop

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/discover.spec.ts`
- Modify: `package.json` (add `test:e2e` script and `@playwright/test` dev dependency)

**Interfaces:**
- None (Playwright test, not imported elsewhere).

- [ ] **Step 1: Install Playwright**

Run: `npm install -D @playwright/test && npx playwright install --with-deps chromium`

- [ ] **Step 2: Add the config**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  },
});
```

- [ ] **Step 3: Add the `test:e2e` script to `package.json`**

```json
"test:e2e": "playwright test"
```

- [ ] **Step 4: Write the test**

```typescript
import { test, expect } from "@playwright/test";

// Assumes a signed-in storage state is provided via E2E_STORAGE_STATE, or
// that auth is bypassed in the target environment the same way the existing
// demo/dev-unlock flow does (see libs/dev-unlock.ts). This test exercises
// the Discover loop's UI contract; it does not stand up its own auth.
test.describe("Discover loop", () => {
  test("onboarding leads to a feed where a trend can be followed", async ({ page }) => {
    await page.goto("/dashboard");

    const picker = page.getByRole("heading", { name: /what should we watch for you/i });

    if (await picker.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "AI" }).click();
      await page.getByRole("button", { name: "SaaS" }).click();
      await page.getByRole("button", { name: "Developer tools" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
    }

    await expect(page.getByRole("heading", { name: "For you" })).toBeVisible();

    const firstFollowButton = page.getByRole("button", { name: "Follow" }).first();
    if (await firstFollowButton.isVisible().catch(() => false)) {
      await firstFollowButton.click();
      await expect(page.getByRole("button", { name: "Following" }).first()).toBeVisible();
    }
  });
});
```

- [ ] **Step 5: Document how to run it**

Run: `npm run test:e2e` (requires `npm run dev` running separately, or `E2E_BASE_URL` pointed at a deployed preview, and a real signed-in session per the note in the test file — this is left as a manual/CI-config step since the repo has no auth fixture yet).

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/discover.spec.ts package.json package-lock.json
git commit -m "test: add Discover loop E2E test"
```

---

## Post-plan follow-ups (not part of this plan)

- Add `.env.example` entries for `OPENAI_API_KEY`, `GITHUB_TOKEN`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (each connector fails closed / no-ops without its key, so this is safe to defer, but should happen before first deploy).
- Wire real auth into the E2E test once a fixture/storage-state pattern exists for this repo.
- Admin/editorial review console, email briefings, Builder mode, radars — out of scope per the design doc, next specs.
