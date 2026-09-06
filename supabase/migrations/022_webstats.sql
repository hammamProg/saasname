-- Web analytics ("webstats") — a second product sharing this codebase's auth,
-- billing and Supabase project. Users add a script tag to their own site and
-- get traffic stats, plus a match against the trend topics this app already
-- clusters (that join is what no competitor can copy).
--
-- The storage split below is the load-bearing decision, so it is spelled out:
--
--   webstats_sites / webstats_salts   small config. Ordinary, cheap RLS.
--
--   webstats_events                   the raw firehose. RLS is ON with ZERO
--                                     policies and NO grants to anon or
--                                     authenticated, so PostgREST can never
--                                     reach it and only the service role
--                                     writes. This is deliberate, not an
--                                     oversight: a per-row policy check is
--                                     unaffordable at event volume, and the
--                                     dashboard never reads this table.
--                                     Supabase's advisor flags this as
--                                     `rls_enabled_no_policy` — intended, and
--                                     the same pattern already used by
--                                     `platform_cache` (see 015).
--
--   webstats_visit_hourly             pre-aggregated rollups, one row per
--   webstats_dim_hourly               visit-hour. Dashboards read ONLY these,
--                                     where the row counts are small enough
--                                     that RLS costs nothing.
--
-- Rolling up per *visit* rather than per metric is what keeps unique visitors,
-- visit counts, bounce rate and duration all computable from the rollup: the
-- visit survives as a row, so only per-event ordering is lost, and no
-- dashboard metric needs that.

-- ---------------------------------------------------------------------------
-- Config
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- Normalized at the application boundary: lowercased, `www.` stripped, no
  -- scheme, no path. Stored so ingest can reject events whose hostname does
  -- not belong to the site.
  domain text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Soft delete means a plain UNIQUE would keep a deleted domain reserved
-- forever, so uniqueness applies only to live rows.
create unique index if not exists webstats_sites_owner_domain_live
  on public.webstats_sites (owner_id, domain)
  where deleted_at is null;

create index if not exists webstats_sites_owner
  on public.webstats_sites (owner_id)
  where deleted_at is null;

-- Two salts are live at once. A visitor whose session straddles a rotation is
-- matched against the previous salt instead of being counted as a new person,
-- which is what stops an artificial visitor spike at every rotation boundary.
-- Rows older than 48h are deleted, and that deletion is what lets the derived
-- identifier be argued as anonymous rather than merely pseudonymous.
create table if not exists public.webstats_salts (
  id uuid primary key default gen_random_uuid(),
  salt bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists webstats_salts_created
  on public.webstats_salts (created_at desc);

-- ---------------------------------------------------------------------------
-- Raw events
-- ---------------------------------------------------------------------------

-- No foreign key on site_id: this table is written on every pageview and the
-- referential check is redundant, because ingest resolves the site before it
-- writes. Partition key must appear in the primary key.
create table if not exists public.webstats_events (
  id uuid not null default gen_random_uuid(),
  site_id uuid not null,
  occurred_at timestamptz not null default now(),

  session_id uuid not null,
  visit_id uuid not null,

  -- 1 = pageview, 2 = custom event, 3 = engagement.
  -- Custom events and revenue are a later phase; the columns exist now so that
  -- phase is a code change rather than a migration against a large table.
  event_type smallint not null default 1,
  event_name text,

  hostname text,
  path text not null,
  query text,
  page_title text,

  referrer_domain text,
  referrer_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  browser text,
  os text,
  device text,
  screen text,
  language text,

  country char(2),
  region text,
  city text,

  -- Milliseconds of foreground engagement, carried by event_type 3. Without
  -- this, a one-pageview visit has a computed duration of exactly zero and
  -- both "avg. visit duration" and bounce rate become decoration.
  engaged_ms integer,

  primary key (occurred_at, id)
) partition by range (occurred_at);

-- BRIN is the right index for an append-only time-ordered table: hundreds of
-- KB where the btree equivalent runs to gigabytes. autosummarize defaults to
-- OFF in Postgres, and leaving it off means newly written ranges are never
-- summarized and the index silently stops helping.
create index if not exists webstats_events_occurred_brin
  on public.webstats_events using brin (occurred_at)
  with (autosummarize = on);

-- Exactly one btree. Every additional index is paid on every insert, and this
-- table is not queried by the dashboard.
create index if not exists webstats_events_site_time
  on public.webstats_events (site_id, occurred_at);

-- Creates the monthly partition covering `at`, if absent. Idempotent, so it is
-- safe to call from a scheduled job and from tests.
create or replace function public.webstats_ensure_partition(at timestamptz)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  start_at date := date_trunc('month', at at time zone 'UTC')::date;
  end_at   date := (date_trunc('month', at at time zone 'UTC') + interval '1 month')::date;
  part     text := format('webstats_events_%s', to_char(start_at, 'YYYYMM'));
begin
  if to_regclass(format('public.%I', part)) is null then
    execute format(
      'create table public.%I partition of public.webstats_events for values from (%L) to (%L)',
      part, start_at, end_at
    );
  end if;
end;
$$;

-- Seed the current and next month so ingest works the moment this lands.
select public.webstats_ensure_partition(now());
select public.webstats_ensure_partition(now() + interval '1 month');

-- Safety net: an event that arrives with a timestamp outside every declared
-- partition would otherwise fail the insert outright and lose the beacon.
create table if not exists public.webstats_events_default
  partition of public.webstats_events default;

-- ---------------------------------------------------------------------------
-- Rollups
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_visit_hourly (
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  hour timestamptz not null,
  visit_id uuid not null,
  session_id uuid not null,

  browser text,
  os text,
  device text,
  country char(2),
  region text,

  entry_path text,
  exit_path text,

  views integer not null default 0,
  events integer not null default 0,
  engaged_ms integer not null default 0,

  min_time timestamptz not null,
  max_time timestamptz not null,

  primary key (site_id, hour, visit_id)
);

create index if not exists webstats_visit_hourly_site_hour
  on public.webstats_visit_hourly (site_id, hour desc);

create table if not exists public.webstats_dim_hourly (
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  hour timestamptz not null,
  kind text not null check (
    kind in ('path', 'referrer_domain', 'utm_source', 'utm_medium',
             'utm_campaign', 'page_title')
  ),
  value text not null,
  pageviews integer not null default 0,
  visits integer not null default 0,
  primary key (site_id, hour, kind, value)
);

create index if not exists webstats_dim_hourly_lookup
  on public.webstats_dim_hourly (site_id, kind, hour desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.webstats_sites enable row level security;
alter table public.webstats_events enable row level security;
alter table public.webstats_visit_hourly enable row level security;
alter table public.webstats_dim_hourly enable row level security;
alter table public.webstats_salts enable row level security;

-- `webstats_events` and `webstats_salts` intentionally get no policy and no
-- grants: service role only. Revoked explicitly rather than relying on the
-- default, so a later blanket grant cannot quietly expose the firehose.
revoke all on public.webstats_events from anon, authenticated;
revoke all on public.webstats_salts from anon, authenticated;

-- auth.uid() is wrapped in a subselect throughout. Bare, it is re-evaluated
-- per row; wrapped, the planner treats it as an InitPlan and evaluates it once.
-- Supabase measured this as the difference between ~179ms and ~9ms.
create policy "Owners read their sites"
  on public.webstats_sites for select
  to authenticated
  using (owner_id = (select auth.uid()) and deleted_at is null);

create policy "Owners create their sites"
  on public.webstats_sites for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update their sites"
  on public.webstats_sites for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners read their visit rollups"
  on public.webstats_visit_hourly for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid()) and deleted_at is null
    )
  );

create policy "Owners read their dimension rollups"
  on public.webstats_dim_hourly for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid()) and deleted_at is null
    )
  );
