-- The rollup function in 024 could never run: it declared an OUT parameter
-- named `visits`, and `webstats_dim_hourly` has a column of the same name, so
-- PL/pgSQL raised `column reference "visits" is ambiguous` on every call.
--
-- An OUT parameter is a variable in scope for the whole body, so any SQL in
-- the function that mentions a same-named column is ambiguous. Renaming the
-- parameter is the fix; the column names are part of the schema and the ones
-- callers read.
--
-- Additive — 024 is left untouched.

-- Renaming an OUT parameter changes the function's return type, which
-- `create or replace` refuses, so the old definition is dropped first.
drop function if exists public.webstats_rollup();

create function public.webstats_rollup()
returns table (rolled_from timestamptz, rolled_to timestamptz, visit_rows bigint)
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
      views      = v.views + excluded.views,
      events     = v.events + excluded.events,
      engaged_ms = v.engaged_ms + excluded.engaged_ms,
      exit_path  = coalesce(excluded.exit_path, v.exit_path),
      min_time   = least(v.min_time, excluded.min_time),
      max_time   = greatest(v.max_time, excluded.max_time)
    returning 1
  ),
  dimensions as (
    select site_id, hour, kind, value,
           sum(pageview_count)::int as pageview_count,
           count(distinct visit_id)::int as visit_count
    from (
      select site_id, date_trunc('hour', occurred_at) as hour,
             'path' as kind, path as value, visit_id, 1 as pageview_count
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
    select site_id, hour, kind, value, pageview_count, visit_count
    from dimensions
    on conflict (site_id, hour, kind, value) do update set
      pageviews = d.pageviews + excluded.pageviews,
      -- Approximate across runs: a visit spanning two runs counts twice here.
      -- Ranked breakdowns are ordered by pageviews for exactly this reason;
      -- this column is a hint, not a reported metric.
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
