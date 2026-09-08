-- Allowlist of extra domains permitted to load a site's public embed
-- (app/embed/live/[id] and /api/webstats/embed/[id]/live). The site's own
-- `domain` is always implicitly allowed and is not duplicated in here; this
-- table is only for additional hosts an owner explicitly approves (a staging
-- subdomain, a partner's site mirroring the widget, etc).
--
-- owner_id is denormalized rather than joined through webstats_sites, same
-- pattern as webstats_site_groups (035): RLS becomes a direct comparison
-- instead of a join, and it is set once at insert time from the
-- authenticated caller, never trusted from the row being read.
create table if not exists public.webstats_site_embed_domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists webstats_site_embed_domains_site_domain
  on public.webstats_site_embed_domains (site_id, domain);

create index if not exists webstats_site_embed_domains_site
  on public.webstats_site_embed_domains (site_id);

alter table public.webstats_site_embed_domains enable row level security;

-- No policy for anon/authenticated beyond these: the public embed page and
-- its API read this table through the service-role client (see
-- libs/webstats/embed-domains.ts), which bypasses RLS by design — there is
-- no session to check ownership against on a customer's own site.
create policy "Owners read their embed domains"
  on public.webstats_site_embed_domains for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners add embed domains"
  on public.webstats_site_embed_domains for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners remove embed domains"
  on public.webstats_site_embed_domains for delete
  to authenticated
  using (owner_id = (select auth.uid()));
