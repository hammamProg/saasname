-- Incremental rollup from raw events into the two tables the dashboard reads.
--
-- Watermark-driven `insert ... on conflict do update` rather than a
-- materialized view: REFRESH rewrites the whole view on every run, which at
-- event volume means re-reading months of history every five minutes. This
-- touches only rows written since the last run.
--
-- Idempotent by construction is NOT the same as re-runnable: the counters here
-- accumulate, so processing the same event twice double-counts it. The
-- watermark is therefore advanced in the same transaction as the aggregation,
-- and a failed run rolls back both.

create table if not exists public.webstats_rollup_state (
  id smallint primary key default 1 check (id = 1),
  last_rolled_at timestamptz not null default '1970-01-01T00:00:00Z'
);

insert into public.webstats_rollup_state (id) values (1)
on conflict (id) do nothing;

alter table public.webstats_rollup_state enable row level security;
revoke all on public.webstats_rollup_state from anon, authenticated;

create or replace function public.webstats_rollup()
returns table (rolled_from timestamptz, rolled_to timestamptz, visits bigint)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  from_at timestamptz;
  -- A short lag, so a beacon written inside `after()` while this runs is not
  -- skipped by a watermark that has already moved past its timestamp.
  to_at timestamptz := now() - interval '1 minute';
  affected bigint := 0;
begin
  select last_rolled_at into from_at
  from public.webstats_rollup_state
  where id = 1
  for update;

  if to_at <= from_at then
    return query select from_at, from_at, 0::bigint;
    return;
  end if;

  with window_events as (
    select *
    from public.webstats_events
    where occurred_at > from_at
      and occurred_at <= to_at
  ),
  per_visit as (
    select
      site_id,
      date_trunc('hour', occurred_at) as hour,
      visit_id,
      min(session_id::text)::uuid as session_id,
      min(browser) as browser,
      min(os) as os,
      min(device) as device,
      min(country) as country,
      min(region) as region,
      (array_agg(path order by occurred_at asc)
        filter (where event_type = 1))[1] as entry_path,
      (array_agg(path order by occurred_at desc)
        filter (where event_type = 1))[1] as exit_path,
      count(*) filter (where event_type = 1) as views,
      count(*) filter (where event_type = 2) as events,
      coalesce(sum(engaged_ms) filter (where event_type = 3), 0) as engaged_ms,
      min(occurred_at) as min_time,
      max(occurred_at) as max_time
    from window_events
    group by site_id, date_trunc('hour', occurred_at), visit_id
  ),
  upsert_visits as (
    insert into public.webstats_visit_hourly as v (
      site_id, hour, visit_id, session_id,
      browser, os, device, country, region,
      entry_path, exit_path, views, events, engaged_ms, min_time, max_time
    )
    select
      site_id, hour, visit_id, session_id,
      browser, os, device, country, region,
      entry_path, exit_path, views, events, engaged_ms, min_time, max_time
    from per_visit
    on conflict (site_id, hour, visit_id) do update set
      -- Counters accumulate; a visit-hour is written across many runs.
      views      = v.views + excluded.views,
      events     = v.events + excluded.events,
      engaged_ms = v.engaged_ms + excluded.engaged_ms,
      -- entry_path is deliberately not updated: the first page of the visit
      -- was established by the run that created the row.
      exit_path  = coalesce(excluded.exit_path, v.exit_path),
      min_time   = least(v.min_time, excluded.min_time),
      max_time   = greatest(v.max_time, excluded.max_time)
    returning 1
  ),
  dimensions as (
    select site_id, hour, kind, value,
           sum(pageviews)::int as pageviews,
           count(distinct visit_id)::int as visits
    from (
      select site_id, date_trunc('hour', occurred_at) as hour,
             'path' as kind, path as value, visit_id, 1 as pageviews
      from window_events where event_type = 1 and path is not null
      union all
      select site_id, date_trunc('hour', occurred_at),
             'referrer_domain', referrer_domain, visit_id, 1
      from window_events where event_type = 1 and referrer_domain is not null
      union all
      select site_id, date_trunc('hour', occurred_at),
             'utm_source', utm_source, visit_id, 1
      from window_events where event_type = 1 and utm_source is not null
      union all
      select site_id, date_trunc('hour', occurred_at),
             'utm_medium', utm_medium, visit_id, 1
      from window_events where event_type = 1 and utm_medium is not null
      union all
      select site_id, date_trunc('hour', occurred_at),
             'utm_campaign', utm_campaign, visit_id, 1
      from window_events where event_type = 1 and utm_campaign is not null
      union all
      select site_id, date_trunc('hour', occurred_at),
             'page_title', page_title, visit_id, 1
      from window_events where event_type = 1 and page_title is not null
    ) expanded
    group by site_id, hour, kind, value
  ),
  upsert_dims as (
    insert into public.webstats_dim_hourly as d (
      site_id, hour, kind, value, pageviews, visits
    )
    select site_id, hour, kind, value, pageviews, visits
    from dimensions
    on conflict (site_id, hour, kind, value) do update set
      pageviews = d.pageviews + excluded.pageviews,
      -- Approximate across runs: a visit spanning two runs counts twice in
      -- this column. Ranked breakdowns are ordered by pageviews for exactly
      -- this reason; `visits` here is a hint, not a reported metric.
      visits    = d.visits + excluded.visits
    returning 1
  )
  select count(*) into affected from upsert_visits;

  update public.webstats_rollup_state
  set last_rolled_at = to_at
  where id = 1;

  return query select from_at, to_at, affected;
end;
$$;

revoke all on function public.webstats_rollup() from public, anon, authenticated;
