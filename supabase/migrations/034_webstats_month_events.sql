-- Events recorded for a site in the current UTC month, for plan quota
-- enforcement at ingest.
--
-- Reads the visit rollup rather than the raw firehose. A COUNT over a month of
-- raw events on a busy site is exactly the query you cannot afford to run on
-- the hot path, and the rollup already carries per-visit pageview totals. It
-- lags by up to six minutes, which for a monthly quota is irrelevant.
--
-- SECURITY DEFINER with no grant to anon or authenticated: this is called by
-- the ingest route with the service role, and the number is not something a
-- visitor to a customer's site should be able to ask for.
create or replace function public.webstats_month_events(p_site_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(sum(v.views), 0)::bigint
  from public.webstats_visit_hourly v
  where v.site_id = p_site_id
    and v.hour >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc');
$$;

revoke all on function public.webstats_month_events(uuid) from public, anon, authenticated;
