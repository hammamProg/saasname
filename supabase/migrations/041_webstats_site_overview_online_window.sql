-- webstats_site_overview() hardcoded a 5-minute "online now" window, but
-- libs/webstats/online.ts (the single-site live count) moved to 30 minutes so
-- readers who are still on a longer page do not drop out of the count. Left
-- alone, the all-sites overview and a single site's live tile would disagree
-- about who counts as online.
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
        and e.occurred_at >= now() - interval '30 minutes'
    ) as online_visitors
  from public.webstats_sites s
  where s.owner_id = (select auth.uid())
    and s.deleted_at is null;
$$;
