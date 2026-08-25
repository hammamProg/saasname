-- 015_searches.sql
-- Search runs, their candidate names, and one check row per candidate x platform.
--
-- Security model mirrors 014_credits.sql:
--   * Users may SELECT their own searches, and the candidates/checks beneath them.
--     There is no INSERT/UPDATE/DELETE policy, so all writes go through the
--     service role from the server.
--   * platform_cache holds no user data and is shared across all users. RLS is
--     enabled with NO policy at all, so anon and authenticated can reach nothing;
--     only the service role touches it.
--
-- No verdict column on checks. Scoring is Phase 4, and a column that is null
-- everywhere invites something to read it as "clear" -- the one failure mode the
-- design spec says would destroy trust in the product.

create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('generate', 'check')),
  idea_text text,
  seed_name text,
  target_platform text not null check (target_platform in ('ios', 'android', 'web', 'cross')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'complete', 'failed')),
  credits_spent integer not null default 0 check (credits_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists searches_user_idx
  on public.searches (user_id, created_at desc);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches (id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  normalized_name text not null check (char_length(normalized_name) >= 1),
  rationale text,
  created_at timestamptz not null default now(),
  unique (search_id, normalized_name)
);

create index if not exists candidates_search_idx
  on public.candidates (search_id);

create table if not exists public.checks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  platform text not null,
  status text not null default 'pending'
    check (status in ('pending', 'ok', 'failed', 'skipped')),
  signals jsonb not null default '{}'::jsonb,
  evidence_url text,
  error text,
  fetched_at timestamptz,
  unique (candidate_id, platform)
);

create index if not exists checks_candidate_idx
  on public.checks (candidate_id);

-- Global, deliberately not per-user. The second user to check a given name on a
-- given platform costs nothing in outbound API spend.
create table if not exists public.platform_cache (
  platform text not null,
  normalized_name text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (platform, normalized_name)
);

create index if not exists platform_cache_expires_idx
  on public.platform_cache (expires_at);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.searches enable row level security;
alter table public.candidates enable row level security;
alter table public.checks enable row level security;
alter table public.platform_cache enable row level security;

revoke all on table public.searches from anon, authenticated;
revoke all on table public.candidates from anon, authenticated;
revoke all on table public.checks from anon, authenticated;
revoke all on table public.platform_cache from anon, authenticated;

grant select on table public.searches to authenticated;
grant select on table public.candidates to authenticated;
grant select on table public.checks to authenticated;
-- platform_cache: no grant. Service role only.

drop policy if exists "Users can read own searches" on public.searches;
create policy "Users can read own searches"
  on public.searches for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own candidates" on public.candidates;
create policy "Users can read own candidates"
  on public.candidates for select
  to authenticated
  using (
    exists (
      select 1 from public.searches s
      where s.id = candidates.search_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read own checks" on public.checks;
create policy "Users can read own checks"
  on public.checks for select
  to authenticated
  using (
    exists (
      select 1
      from public.candidates c
      join public.searches s on s.id = c.search_id
      where c.id = checks.candidate_id
        and s.user_id = (select auth.uid())
    )
  );

-- platform_cache intentionally has NO policy. RLS is on and nothing is granted,
-- so no client-facing role can read or write it.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_searches_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_searches_updated_at() from public, anon, authenticated;

drop trigger if exists searches_touch_updated_at on public.searches;
create trigger searches_touch_updated_at
  before update on public.searches
  for each row execute function public.touch_searches_updated_at();
