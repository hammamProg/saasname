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
