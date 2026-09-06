-- Owners could not soft-delete their own sites.
--
-- 022's SELECT policy was `owner_id = auth.uid() AND deleted_at IS NULL`.
-- Postgres applies SELECT policies to the *new* row on UPDATE, so the instant
-- the update set `deleted_at`, the resulting row failed the read policy and
-- the whole statement was rejected with
--   42501: new row violates row-level security policy
-- while an update to any other column on the same row succeeded. The delete
-- would have failed in production with "Could not remove that website".
--
-- The mistake was putting soft-delete filtering in RLS. RLS exists to answer
-- "is this row yours" - a security question. "Is this row still active" is
-- application logic, and libs/webstats/sites.ts already filters
-- `deleted_at is null` on every read path (listSites, getSite), so nothing
-- user-facing starts showing deleted sites.
--
-- Keeping deleted rows readable by their owner is also the more honest model:
-- you cannot restore, audit, or explain a row you are forbidden to see.
--
-- The rollup policies are deliberately left alone. They filter on
-- `deleted_at is null` inside a subquery against webstats_sites, which is an
-- ordinary read of another table rather than a check on the row being written,
-- so a deleted site's reports stop being readable - which is what should
-- happen.

drop policy if exists "Owners read their sites" on public.webstats_sites;

create policy "Owners read their sites"
  on public.webstats_sites for select
  to authenticated
  using (owner_id = (select auth.uid()));
