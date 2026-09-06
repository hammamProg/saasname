-- Moves the three sub-daily ingest crons off Vercel Cron and into Postgres.
--
-- Why: Vercel's Hobby plan rejects any cron that runs more than once a day, so
-- `0 * * * *` (hacker-news), `15 * * * *` (github) and `30 * * * *` (rss) fail
-- at deploy time with "Hobby accounts are limited to daily cron jobs". The
-- alternatives were to make them daily — which blunts a product whose whole
-- pitch is catching trends early — or to pay for Pro.
--
-- pg_cron schedules, pg_net makes the HTTP call. Both are free on every
-- Supabase plan and both are already in this instance's
-- shared_preload_libraries, so this needs no restart and no new vendor.
--
-- The seven daily crons stay on Vercel Cron: they are legal on Hobby, and
-- moving them would add failure modes for no benefit.
--
-- KNOWN LIMITATION — pg_net does not retry. A call that fails is skipped until
-- the next hour. It also fails *silently* if its background worker dies:
-- requests queue in net.http_request_queue and nothing raises. The staleness
-- check at the bottom is the guard against that, but it only reports; pair it
-- with an external uptime ping for out-of-band alerting.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Calling an internal route
-- ---------------------------------------------------------------------------

/* The bearer token lives in Vault, not in the cron command: `cron.job.command`
 * is plain text readable by anyone with database access, so inlining the
 * secret would hand it to every future reader of the job table.
 *
 * Set it once with the value already in the Vercel environment:
 *
 *   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
 *
 * Until that exists these jobs no-op with a warning rather than firing
 * unauthenticated requests that would just 401. */
create or replace function public.internal_cron_call(path text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  secret text;
  request_id bigint;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'cron_secret';

  if secret is null or secret = '' then
    raise warning 'internal_cron_call: vault secret "cron_secret" is not set; skipping %', path;
    return null;
  end if;

  -- Canonical host, not the apex. The origin is public information (it is in
  -- config.ts and every canonical URL) so it is inlined rather than stored as
  -- a secret, but it must be the host that actually serves: the Authorization
  -- header does not survive the apex's 308 to www, so the call arrives
  -- unauthenticated and is rejected.
  select net.http_get(
    url := 'https://www.saasna.me' || path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'User-Agent', 'saasname-pg-cron'
    ),
    -- pg_net's default is 2000ms, which every one of these routes exceeds.
    -- Without this each call is killed before the endpoint can answer.
    timeout_milliseconds := 60000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.internal_cron_call(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

-- Unschedule first so re-running this migration cannot create duplicates.
select cron.unschedule(jobname)
from cron.job
where jobname in ('ingest-hacker-news', 'ingest-github', 'ingest-rss');

select cron.schedule('ingest-hacker-news', '0 * * * *',
  $$select public.internal_cron_call('/api/internal/ingest/hacker-news')$$);

select cron.schedule('ingest-github', '15 * * * *',
  $$select public.internal_cron_call('/api/internal/ingest/github')$$);

select cron.schedule('ingest-rss', '30 * * * *',
  $$select public.internal_cron_call('/api/internal/ingest/rss')$$);

-- ---------------------------------------------------------------------------
-- Observability
-- ---------------------------------------------------------------------------

/* pg_net's failure mode is silence, so make the state inspectable:
 *
 *   select * from public.internal_cron_health();
 *
 * `worker_alive` false, or a last_status that is not 2xx, means ingest has
 * stopped even though every job still reports as scheduled. */
create or replace function public.internal_cron_health()
returns table (
  job text,
  last_run timestamptz,
  last_status integer,
  last_error text,
  worker_alive boolean
)
language sql
security definer
set search_path = public, extensions, pg_catalog
as $$
  select
    j.jobname::text,
    d.start_time,
    r.status_code,
    r.error_msg,
    exists (
      select 1 from pg_stat_activity
      where backend_type ilike '%pg_net%'
    )
  from cron.job j
  left join lateral (
    select start_time
    from cron.job_run_details
    where jobid = j.jobid
    order by start_time desc
    limit 1
  ) d on true
  left join lateral (
    select status_code, error_msg
    from net._http_response
    order by created desc
    limit 1
  ) r on true
  where j.jobname like 'ingest-%';
$$;

-- `authenticated` is revoked explicitly too: without it any signed-in user
-- could read pipeline job names, run times and failure messages over
-- /rest/v1/rpc/. Operational state is not customer-facing.
revoke all on function public.internal_cron_health() from public, anon, authenticated;
