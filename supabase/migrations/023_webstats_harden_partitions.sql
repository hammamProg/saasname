-- 022 enabled RLS and revoked grants on `webstats_events`, but neither applies
-- to a partitioned table's children: each partition is its own relation in the
-- `public` schema, so PostgREST exposed `webstats_events_202609` and friends
-- directly while the parent looked locked down. The advisor caught it as
-- `rls_disabled_in_public` (ERROR).
--
-- It also flagged `webstats_ensure_partition` as a SECURITY DEFINER function
-- callable by `anon` over `/rest/v1/rpc/` — i.e. an unauthenticated visitor
-- could create tables. That function exists for the scheduled job, not for the
-- API surface.
--
-- Additive fix — 022 is left untouched.

-- ---------------------------------------------------------------------------
-- Close the existing partitions
-- ---------------------------------------------------------------------------

do $$
declare
  part record;
begin
  for part in
    select child.relname
    from pg_inherits
    join pg_class child on child.oid = pg_inherits.inhrelid
    join pg_class parent on parent.oid = pg_inherits.inhparent
    join pg_namespace ns on ns.oid = parent.relnamespace
    where parent.relname = 'webstats_events'
      and ns.nspname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security', part.relname
    );
    execute format(
      'revoke all on public.%I from anon, authenticated', part.relname
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Make new partitions closed by construction
-- ---------------------------------------------------------------------------

-- Every future partition gets the same treatment at creation time, so this
-- cannot regress the next time the scheduled job rolls a month forward.
create or replace function public.webstats_ensure_partition(at timestamptz)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  start_at date := date_trunc('month', at at time zone 'UTC')::date;
  end_at   date := (date_trunc('month', at at time zone 'UTC') + interval '1 month')::date;
  part     text := format('webstats_events_%s', to_char(start_at, 'YYYYMM'));
begin
  if to_regclass(format('public.%I', part)) is null then
    execute format(
      'create table public.%I partition of public.webstats_events for values from (%L) to (%L)',
      part, start_at, end_at
    );
    execute format('alter table public.%I enable row level security', part);
    execute format('revoke all on public.%I from anon, authenticated', part);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Take the function off the public API surface
-- ---------------------------------------------------------------------------

-- PUBLIC holds EXECUTE on new functions by default, so revoking only from
-- anon/authenticated would leave the grant intact through role inheritance.
revoke all on function public.webstats_ensure_partition(timestamptz)
  from public, anon, authenticated;
