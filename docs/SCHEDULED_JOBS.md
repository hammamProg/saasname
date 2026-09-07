# Scheduled jobs

Jobs run in two places. Which one a job lives in is decided by a single
constraint: **Vercel's Hobby plan rejects any cron that runs more than once a
day, at deploy time.** A sub-daily entry in `vercel.json` fails the build with
*"Hobby accounts are limited to daily cron jobs."*

| Where | Jobs | Why there |
|---|---|---|
| **Vercel Cron** (`vercel.json`) | 7 daily ingest jobs + the nightly pipeline | Daily is legal on Hobby, and these need the app's TypeScript connectors |
| **pg_cron** (Supabase) | `webstats-maintenance` (5 min), `ingest-hacker-news`, `ingest-github`, `ingest-rss` (hourly), `webstats-cron-history-prune` (daily), `webstats-match-topics` (weekly) | Sub-daily, so Vercel Cron is not an option on Hobby. `webstats-match-topics` is weekly and could live on Vercel, but it belongs with the job that feeds it |

Both are free. Neither needs a Vercel plan upgrade.

## The two kinds of pg_cron job

**Pure SQL — `webstats-maintenance`.** Rolls raw analytics events into the
dashboard tables, keeps a partition ready ahead of the month boundary, and
destroys salts past their 48h window. Touches no HTTP and no application code,
so running it in Postgres is strictly better than paying a function invocation
to execute statements the database could run itself. It also keeps running when
the app is down.

**HTTP — the three hourly ingest jobs.** `pg_net` calls the existing
`/api/internal/ingest/*` routes, which still hold all the connector logic.
Postgres is only the clock.

## Required setup

The HTTP jobs authenticate with the same `CRON_SECRET` the routes already
expect (`libs/trends/verify-cron.ts`). It lives in Supabase Vault, **not** in
the cron command — `cron.job.command` is plain text readable by anyone with
database access.

Set it once, using the value already in the Vercel environment:

```sql
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

Until that exists, the jobs no-op with a warning rather than firing
unauthenticated requests that would only 401.

## Checking health

```sql
select * from public.internal_cron_health();
```

```sql
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d join cron.job j using (jobid)
order by d.start_time desc limit 20;
```

## Things that will bite

- **pg_net does not retry.** A failed call is skipped until the next schedule.
- **pg_net fails silently.** If its background worker dies, requests queue in
  `net.http_request_queue` and nothing raises — every job still reports as
  scheduled. `worker_alive` in `internal_cron_health()` is the check. Consider
  an external uptime ping for out-of-band alerting, since a monitor inside the
  thing being monitored cannot report its own death.
- **pg_net's default timeout is 2000 ms**, which every ingest route exceeds.
  `internal_cron_call` passes `timeout_milliseconds := 60000` explicitly.
- **A newly created pg_cron extension is not picked up immediately.** The
  launcher loads its schedule at server start; after `create extension` it took
  roughly 45 minutes before the first job fired. Nothing is wrong — wait before
  concluding it is broken, and do not restart the database over it.
- **pg_cron shares the instance with ingest.** There is no isolated worker
  pool, so scheduled work competes with live queries for CPU and IOPS. Keep
  jobs small and incremental; Supabase suggests at most a handful concurrent.
- **`cron.job_run_details` grows without bound.** Pruned weekly by
  `webstats-cron-history-prune`.

## If you move to Vercel Pro

Pro allows once-per-minute crons, so the three hourly ingest jobs could move
back to `vercel.json`. `webstats-maintenance` should stay on pg_cron regardless
— it is pure SQL, and paying a function invocation to run it would buy nothing.

Worth knowing separately: Vercel's Hobby plan is for non-commercial use. This
project takes payments through Paddle, so the plan question is not only about
cron limits.
