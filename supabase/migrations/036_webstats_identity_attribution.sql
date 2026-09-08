-- Persistent visitor identity, sessions, multi-touch attribution, identity
-- resolution and goal/conversion tracking.
--
-- This is additive, not a replacement. `webstats_events` (raw firehose),
-- `webstats_visit_hourly` / `webstats_dim_hourly` (rollups) and the dashboard
-- they power are untouched — that pipeline is cookieless, keyed by a daily
-- salted hash, and stays exactly as it is for existing customers who never
-- opt into the capabilities added here.
--
-- The new pipeline is a deliberately different identity model: a real
-- first-party cookie holding a cryptographically random `visitor_id`, real
-- sessions with a 30-minute inactivity timeout, and `identify()` for linking
-- anonymous activity to a signed-up user. That is what makes cross-session
-- and cross-device attribution and goal completion actually possible, at the
-- cost of the "no cookie banner" claim for any site that turns it on.
--
-- `webstats_events` gains new nullable columns rather than a parallel events
-- table: one raw event stream, two identity schemes living in different
-- columns of the same row, joined on `site_id`/`occurred_at` like everything
-- else already reading that table.

-- ---------------------------------------------------------------------------
-- Site-level config for the new pipeline
-- ---------------------------------------------------------------------------

alter table public.webstats_sites
  -- Server-side identify() auth (see app/api/webstats/identify/route.ts). Not
  -- the public site id — that sits in a script tag on purpose. This does not
  -- and must not.
  add column if not exists write_key uuid not null default gen_random_uuid(),
  -- Referrer hostnames to treat as internal/ignored for this site: SSO
  -- providers, a checkout flow on another domain, anything that redirects
  -- visitors back and would otherwise look like a new traffic source.
  add column if not exists ignored_referrer_domains text[] not null default '{}';

create unique index if not exists webstats_sites_write_key
  on public.webstats_sites (write_key);

-- ---------------------------------------------------------------------------
-- webstats_events: additive columns for the new identity scheme
-- ---------------------------------------------------------------------------

alter table public.webstats_events
  add column if not exists visitor_id uuid,
  add column if not exists client_session_id uuid,
  add column if not exists user_id text,
  -- Client-supplied idempotency key. A retried beacon (network retry, double
  -- `sendBeacon` on some browsers) carries the same id, so a unique index on
  -- it is what makes ingestion safe to retry.
  add column if not exists event_id uuid,
  -- Safe custom properties from track()/goal() calls. Never raw form values —
  -- the SDK does not collect those, and the ingest endpoint caps this object's
  -- size regardless of what a caller sends.
  add column if not exists properties jsonb;

-- Partitioned by occurred_at, so any unique index on this table must include
-- it. A retried beacon carries the same client-generated event_id AND the
-- same client timestamp (it is fixed once per event, not regenerated per
-- retry), so this still dedupes exactly what it needs to.
create unique index if not exists webstats_events_site_event_id
  on public.webstats_events (site_id, event_id, occurred_at)
  where event_id is not null;

create index if not exists webstats_events_visitor
  on public.webstats_events (site_id, visitor_id)
  where visitor_id is not null;

create index if not exists webstats_events_client_session
  on public.webstats_events (site_id, client_session_id)
  where client_session_id is not null;

create index if not exists webstats_events_user
  on public.webstats_events (site_id, user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- Visitors: one row per (site, visitor_id), attribution that survives across
-- sessions
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_visitors (
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  visitor_id uuid not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Each of these three is a JSON snapshot of the same shape:
  -- {source, medium, campaign, term, content, channel, referrer_hostname,
  --  referrer_url, landing_path, landing_url}
  --
  -- first_touch is written once, on insert, and never updated again — that
  -- immutability is the entire point of first-touch attribution.
  -- last_touch is overwritten on every new session, including direct ones.
  -- last_non_direct is overwritten only when the new session's channel is
  -- not "direct", so a later direct visit can never erase it.
  first_touch jsonb not null,
  last_touch jsonb not null,
  last_non_direct jsonb,
  primary key (site_id, visitor_id)
);

create index if not exists webstats_visitors_last_seen
  on public.webstats_visitors (site_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Sessions: one row per (site, session_id). Source is captured once, at
-- session start, and never changes — "session attribution" is a property of
-- the session, not of any one event inside it.
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_sessions (
  session_id uuid not null,
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  visitor_id uuid not null,
  -- The identified user at the moment this session started, or whenever
  -- identify() was first called during it — set once, not retroactively
  -- applied to sibling sessions.
  user_id text,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  landing_url text,
  landing_path text,
  referrer_url text,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- {gclid, gbraid, wbraid, fbclid, msclkid, ttclid, ref, source, via}
  click_ids jsonb not null default '{}',
  -- Normalized, after the UTM > click-id > referrer > direct priority order.
  source text not null,
  medium text not null,
  campaign text,
  channel text not null,
  country char(2),
  region text,
  city text,
  browser text,
  os text,
  device text,
  primary key (site_id, session_id),
  foreign key (site_id, visitor_id)
    references public.webstats_visitors (site_id, visitor_id)
    on delete cascade
);

create index if not exists webstats_sessions_visitor
  on public.webstats_sessions (site_id, visitor_id, started_at desc);

create index if not exists webstats_sessions_user
  on public.webstats_sessions (site_id, user_id)
  where user_id is not null;

create index if not exists webstats_sessions_started
  on public.webstats_sessions (site_id, started_at desc);

create index if not exists webstats_sessions_channel
  on public.webstats_sessions (site_id, channel);

create index if not exists webstats_sessions_source
  on public.webstats_sessions (site_id, source);

-- ---------------------------------------------------------------------------
-- Identity links: append-only audit of which visitor_ids a user_id has used.
--
-- This table is never consulted to rewrite webstats_events/webstats_sessions
-- rows after the fact — each of those rows is stamped with whatever user_id
-- the client had *at write time*, and stays that way forever. "Associating
-- earlier anonymous activity with the identified user" happens at query
-- time, by joining on visitor_id through this table
-- (see libs/webstats/journey.ts) — not by mutating history. That is what
-- keeps reset()/logout from corrupting or reassigning past events.
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_identity_links (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  visitor_id uuid not null,
  user_id text not null,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz
);

create index if not exists webstats_identity_links_user
  on public.webstats_identity_links (site_id, user_id);

create index if not exists webstats_identity_links_visitor
  on public.webstats_identity_links (site_id, visitor_id);

-- One open (unlinked_at is null) link per (site, visitor, user) pair — a
-- repeat identify() call for the same pairing touches nothing new.
create unique index if not exists webstats_identity_links_open
  on public.webstats_identity_links (site_id, visitor_id, user_id)
  where unlinked_at is null;

-- ---------------------------------------------------------------------------
-- Goals and completions
-- ---------------------------------------------------------------------------

create table if not exists public.webstats_goals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  -- Slug passed to `analytics.goal(key, props)` and matched against for
  -- destination/event-based goals.
  key text not null,
  name text not null,
  type text not null check (
    type = any (array[
      'page', 'event', 'signup', 'click', 'form', 'download', 'outbound_link'
    ])
  ),
  -- Shape depends on type: {"path": "/thank-you"} for page, {} for the rest
  -- (they match on the goal key itself, which is what the SDK call sends).
  match jsonb not null default '{}',
  dedupe text not null default 'every' check (
    dedupe = any (array['once_per_visitor', 'once_per_session', 'every'])
  ),
  created_at timestamptz not null default now(),
  unique (site_id, key)
);

create table if not exists public.webstats_goal_completions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  goal_id uuid not null references public.webstats_goals (id) on delete cascade,
  visitor_id uuid not null,
  session_id uuid not null,
  user_id text,
  completed_at timestamptz not null default now(),
  -- Immutable snapshot at completion time: first_touch, session source,
  -- last_touch, last_non_direct, landing page, referrer, visitor_id,
  -- session_id, user_id. See libs/webstats/attribution.ts for the exact
  -- shape. A visitor's later sessions must never change what a past
  -- conversion says brought them in.
  attribution jsonb not null,
  -- visitor_id for once_per_visitor, session_id for once_per_session, or a
  -- fresh random value for "every" — the value the uniqueness below is keyed
  -- on, so a duplicate/retried completion is a no-op rather than a second row.
  dedupe_key text not null,
  properties jsonb not null default '{}',
  unique (site_id, goal_id, dedupe_key)
);

create index if not exists webstats_goal_completions_completed
  on public.webstats_goal_completions (site_id, completed_at desc);

create index if not exists webstats_goal_completions_goal
  on public.webstats_goal_completions (site_id, goal_id);

create index if not exists webstats_goal_completions_visitor
  on public.webstats_goal_completions (site_id, visitor_id);

-- ---------------------------------------------------------------------------
-- RLS. Same shape as 022/029: owners read through a join back to
-- webstats_sites; writes to the identity/attribution tables happen only from
-- the service-role ingest path, same trust model as webstats_events. Goals
-- are the one table an owner writes directly, to manage them from the
-- dashboard.
-- ---------------------------------------------------------------------------

alter table public.webstats_visitors enable row level security;
alter table public.webstats_sessions enable row level security;
alter table public.webstats_identity_links enable row level security;
alter table public.webstats_goals enable row level security;
alter table public.webstats_goal_completions enable row level security;

create policy "Owners read their visitors"
  on public.webstats_visitors for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

create policy "Owners read their sessions"
  on public.webstats_sessions for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

create policy "Owners read their identity links"
  on public.webstats_identity_links for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

create policy "Owners manage their goals"
  on public.webstats_goals for all
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  )
  with check (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

create policy "Owners read their goal completions"
  on public.webstats_goal_completions for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid())
    )
  );

revoke all on public.webstats_visitors from anon;
revoke all on public.webstats_sessions from anon;
revoke all on public.webstats_identity_links from anon, authenticated;
revoke all on public.webstats_goal_completions from anon;
