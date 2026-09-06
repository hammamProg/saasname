-- Moves analytics maintenance off Vercel Cron and into Postgres.
--
-- Why: the rollup is pure SQL. Running it from a Vercel Cron meant
--   * Vercel's Hobby plan caps crons at once per day, so `*/5 * * * *` fails
--     deployment outright;
--   * ~8,600 function invocations a month to execute statements the database
--     can run itself;
--   * the job only runs while the app deploys and responds.
--
-- pg_cron runs inside the database, on any Supabase plan, at any interval,
-- whether or not the web app is healthy. For a job that touches no HTTP and
-- no application code, it is strictly the better home.
--
-- Trade-off worth knowing: pg_cron executes on the same instance as ingest and
-- competes with it for CPU and IOPS — there is no isolated worker pool. That
-- is why this job stays small and incremental (watermark-driven) rather than
-- recomputing anything. Supabase's guidance is to keep such jobs under ten
-- minutes and to run at most a handful concurrently.
--
-- `/api/internal/webstats/rollup` is kept as a manual trigger for debugging
-- and backfills, but nothing schedules it any more.

create extension if not exists pg_cron;

create or replace function public.webstats_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result record;
  destroyed integer;
begin
  -- Ahead of time, so a month boundary never arrives to find nowhere to write.
  perform public.webstats_ensure_partition(now() + interval '5 days');

  select * into result from public.webstats_rollup();

  -- Destroying the salt is what turns a day's visitor identifiers from
  -- pseudonymous into irreversible. See libs/webstats/identity.ts.
  delete from public.webstats_salts
  where day < ((now() at time zone 'utc')::date - 2);
  get diagnostics destroyed = row_count;

  return jsonb_build_object(
    'rolled_from', result.rolled_from,
    'rolled_to', result.rolled_to,
    'visit_rows', result.visit_rows,
    'salts_destroyed', destroyed
  );
end;
$$;

revoke all on function public.webstats_maintenance() from public, anon, authenticated;

-- Unschedule first so re-running this migration does not create a duplicate
-- job under a second id.
select cron.unschedule('webstats-maintenance')
where exists (select 1 from cron.job where jobname = 'webstats-maintenance');

select cron.schedule(
  'webstats-maintenance',
  '*/5 * * * *',
  $$select public.webstats_maintenance()$$
);

-- cron.job_run_details grows without bound and Supabase does not prune it.
select cron.unschedule('webstats-cron-history-prune')
where exists (select 1 from cron.job where jobname = 'webstats-cron-history-prune');

select cron.schedule(
  'webstats-cron-history-prune',
  '0 4 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
