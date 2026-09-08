-- 036 revoked ALL privileges on webstats_identity_links from both `anon` and
-- `authenticated` — every other table in that migration only revoked from
-- `anon`, keeping the owner-scoped SELECT policy reachable for
-- `authenticated`. This one line went further by mistake.
--
-- The result: a table-level GRANT is checked before RLS ever runs, so
-- revoking SELECT from `authenticated` entirely meant the "Owners read their
-- identity links" policy could never be reached, even by the actual owner.
-- Every call to listRecentVisitors() (the Acquisition page's visitor list)
-- failed with "permission denied for table webstats_identity_links" —
-- caught in production via Vercel runtime error logs, not by any local
-- test, since local test/dev accounts hadn't hit this specific query path.

grant select on public.webstats_identity_links to authenticated;
