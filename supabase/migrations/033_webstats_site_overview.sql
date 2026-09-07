-- Per-site status for the sites list: is it connected, how many visitors
-- today, how many right now.
--
-- One function rather than three queries per card, because PostgREST cannot
-- GROUP BY and a list of ten sites would otherwise be thirty round trips.
--
-- SECURITY DEFINER because it reads `webstats_events`, which has RLS on with
-- no policy for `authenticated` by design. It takes no arguments and scopes
-- itself to `auth.uid()` internally: an owner_id parameter would let any
-- signed-in user read another account's traffic by guessing a uuid.
--
-- Both live figures read raw events rather than the rollup. The rollup lags by
-- up to six minutes, and the moment that matters most is the one right after
-- someone installs the snippet - a card reading "connected" beside "0 visitors
-- today" is exactly the confusion the install screen exists to prevent. The
-- cost is a day-bounded scan per site; revisit if a single site passes roughly
-- a million events a day.
--
-- The day boundary is cast back to UTC explicitly. Comparing a timestamp to a
-- timestamptz resolves using the server's TimeZone setting, which is UTC here
-- but would shift the boundary silently if it ever changed.
--
-- "Today" therefore means the UTC day, matching the hourly rollups. A visitor
-- in UTC+3 sees their day roll over at 03:00 local. Per-site timezones are
-- worth adding once someone asks; guessing one would be worse than being
-- consistent.
create or replace function public.webstats_site_overview()
returns table (
  site_id uuid,
  connected boolean,
  today_visitors integer,
  online_visitors integer
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    s.id,
    exists (
      select 1 from public.webstats_events e where e.site_id = s.id
    ) as connected,
    (
      select count(distinct e.session_id)::int
      from public.webstats_events e
      where e.site_id = s.id
        and e.occurred_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
        and e.event_type = 1
    ) as today_visitors,
    (
      select count(distinct e.session_id)::int
      from public.webstats_events e
      where e.site_id = s.id
        and e.occurred_at >= now() - interval '5 minutes'
    ) as online_visitors
  from public.webstats_sites s
  where s.owner_id = (select auth.uid())
    and s.deleted_at is null;
$$;

revoke all on function public.webstats_site_overview() from public, anon;
grant execute on function public.webstats_site_overview() to authenticated;
