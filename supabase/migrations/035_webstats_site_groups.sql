-- Site groups: lets an owner split their sites list into named sections
-- ("Client work", "Personal projects") instead of one flat grid.
--
-- A group belongs to one owner, same ownership model as webstats_sites. A
-- site's group is nullable and set null when its group is deleted, so
-- deleting a group ungroups its sites rather than deleting them -- the group
-- is purely an organizing label, never a container the sites depend on.

create table if not exists public.webstats_site_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive: "Clients" and "clients" read as the same group to
-- someone picking from a list, so a collision that only differs by case
-- would be confusing rather than intentional.
create unique index if not exists webstats_site_groups_owner_name
  on public.webstats_site_groups (owner_id, lower(name));

create index if not exists webstats_site_groups_owner
  on public.webstats_site_groups (owner_id);

alter table public.webstats_sites
  add column if not exists group_id uuid
  references public.webstats_site_groups (id) on delete set null;

create index if not exists webstats_sites_group
  on public.webstats_sites (group_id);

alter table public.webstats_site_groups enable row level security;

-- auth.uid() wrapped in a subselect throughout, matching 022's policies on
-- webstats_sites: the planner treats it as an InitPlan and evaluates it once
-- per statement instead of once per row.
create policy "Owners read their groups"
  on public.webstats_site_groups for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners create their groups"
  on public.webstats_site_groups for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners rename their groups"
  on public.webstats_site_groups for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their groups"
  on public.webstats_site_groups for delete
  to authenticated
  using (owner_id = (select auth.uid()));
