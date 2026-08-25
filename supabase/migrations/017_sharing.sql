-- 017_sharing.sql
-- Opt-in sharing. Reports are private by default; a share link exists only when
-- the owner asks for one.
--
-- Revoking clears share_token as well as is_public (see libs/searches/share.ts),
-- so a link that was already copied stops working immediately instead of coming
-- back to life the next time sharing is enabled.

alter table public.searches
  add column if not exists share_token text unique,
  add column if not exists is_public boolean not null default false;

create index if not exists searches_share_token_idx
  on public.searches (share_token)
  where share_token is not null;

-- Every policy below requires BOTH is_public AND a token. Either field alone
-- can therefore never expose a report: not a stray is_public, not a leftover
-- token on a row that has since been made private.
drop policy if exists "Anyone can read a shared search" on public.searches;
create policy "Anyone can read a shared search"
  on public.searches for select
  to anon, authenticated
  using (is_public = true and share_token is not null);

drop policy if exists "Anyone can read candidates of a shared search" on public.candidates;
create policy "Anyone can read candidates of a shared search"
  on public.candidates for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.searches s
      where s.id = candidates.search_id
        and s.is_public = true
        and s.share_token is not null
    )
  );

drop policy if exists "Anyone can read checks of a shared search" on public.checks;
create policy "Anyone can read checks of a shared search"
  on public.checks for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.candidates c
      join public.searches s on s.id = c.search_id
      where c.id = checks.candidate_id
        and s.is_public = true
        and s.share_token is not null
    )
  );

-- anon needs table-level SELECT for the policies above to apply at all; RLS is
-- what narrows it to shared rows. platform_cache and credit_ledger are
-- deliberately not granted.
grant select on table public.searches to anon;
grant select on table public.candidates to anon;
grant select on table public.checks to anon;
