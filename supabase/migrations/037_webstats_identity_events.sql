-- Correction to 036: the new identity pipeline's page/track event log does
-- not belong on `webstats_events`.
--
-- That table's `session_id`/`visit_id` columns are NOT NULL and mean
-- specifically "the daily-salted-hash cookieless identity" — every existing
-- rollup (webstats_visit_hourly, webstats_dim_hourly) and the dashboard
-- built on them assume every row there came from that identity scheme. A
-- site running both pipelines would either violate those NOT NULL
-- constraints or, worse, silently double-count visitors and pageviews in
-- the existing dashboard by mixing two different identity spaces into one
-- rollup input.
--
-- A dedicated table keeps the two pipelines fully isolated: same ownership
-- and RLS conventions, same site_id, zero risk to what already ships.

alter table public.webstats_events
  drop column if exists visitor_id,
  drop column if exists client_session_id,
  drop column if exists user_id,
  drop column if exists event_id,
  drop column if exists properties;

create table if not exists public.webstats_identity_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  visitor_id uuid not null,
  session_id uuid not null,
  user_id text,
  event_type text not null check (event_type = any (array['page', 'track', 'identify'])),
  -- Event name for 'track', null for 'page'/'identify'.
  name text,
  path text not null,
  url text not null,
  properties jsonb not null default '{}',
  -- Client-supplied idempotency key. Unique per site, so a retried beacon
  -- (network retry, double sendBeacon) is a no-op on replay.
  event_id uuid not null,
  -- The client's own clock, kept distinct from received_at so a delayed
  -- beacon (queued while offline, flushed later) still orders correctly in
  -- the journey view against events that arrived promptly.
  client_occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  foreign key (site_id, visitor_id)
    references public.webstats_visitors (site_id, visitor_id)
    on delete cascade
);

create unique index if not exists webstats_identity_events_dedupe
  on public.webstats_identity_events (site_id, event_id);

create index if not exists webstats_identity_events_visitor
  on public.webstats_identity_events (site_id, visitor_id, client_occurred_at desc);

create index if not exists webstats_identity_events_session
  on public.webstats_identity_events (site_id, session_id, client_occurred_at);

create index if not exists webstats_identity_events_user
  on public.webstats_identity_events (site_id, user_id)
  where user_id is not null;

create index if not exists webstats_identity_events_received
  on public.webstats_identity_events (site_id, received_at desc);

alter table public.webstats_identity_events enable row level security;

create policy "Owners read their identity events"
  on public.webstats_identity_events for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

revoke all on public.webstats_identity_events from anon;
