-- 036 gave webstats_identity_links a *partial* unique index
-- (site_id, visitor_id, user_id) where unlinked_at is null, anticipating a
-- future unlink/relink flow. Nothing built since then ever sets
-- unlinked_at, and Postgres cannot use a partial index as the arbiter for a
-- plain `ON CONFLICT (columns) DO NOTHING` — it requires the predicate to be
-- restated in the conflict clause, which supabase-js's `.upsert()` does not
-- do. The result: every identify() call's link-write silently failed
-- (42P10, caught and swallowed by the ingest handler's catch-all) and
-- webstats_identity_links stayed empty regardless of how many identify()
-- calls came in. Caught by live end-to-end testing, not by the unit suite,
-- because this is a database-arbiter concern no mock can reproduce.
--
-- Fix: an ordinary unique index, which matches what the code actually does
-- today (one row per (visitor, user) pair, ever, appended once and never
-- touched again). Revisit if/when unlink is actually implemented.

drop index if exists public.webstats_identity_links_open;

create unique index if not exists webstats_identity_links_pair
  on public.webstats_identity_links (site_id, visitor_id, user_id);
