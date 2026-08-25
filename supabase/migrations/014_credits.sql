-- 014_credits.sql
-- Append-only credit ledger. Balance is always SUM(delta) -- never a stored counter.
-- Run in the Supabase SQL Editor after 003_profiles.sql.
--
-- Security model:
--   * credit_ledger has RLS on. Users may SELECT their own rows and nothing else.
--     There is no INSERT/UPDATE/DELETE policy, so no non-superuser role can write
--     the table directly; all writes go through the SECURITY DEFINER functions.
--   * grant_credits mints credits. It is service_role only -- an authenticated
--     user must never be able to call it, or they can mint themselves free credits.
--   * spend_credits and credit_balance are callable by authenticated users but are
--     pinned to the caller's own account (auth.uid() guard). The service role
--     (auth.uid() is null) may act on any account.
--   * spend_credits takes a per-user transaction advisory lock before reading the
--     balance, so two concurrent spends cannot both pass the check and overdraw.

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (char_length(trim(reason)) >= 1),
  search_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

-- Signup grants must be idempotent even if a profile row is recreated.
create unique index if not exists credit_ledger_one_signup_grant_idx
  on public.credit_ledger (user_id)
  where reason = 'signup_grant';

alter table public.credit_ledger enable row level security;

-- Table-level privileges: read-only for end users, defence in depth behind RLS.
revoke all on table public.credit_ledger from anon, authenticated;
grant select on table public.credit_ledger to authenticated;

drop policy if exists "Users can read own ledger" on public.credit_ledger;
create policy "Users can read own ledger"
  on public.credit_ledger for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Append-only enforcement
-- ---------------------------------------------------------------------------
-- UPDATE is never allowed. DELETE is allowed only when the owning auth.users row
-- is already gone, i.e. the delete is the ON DELETE CASCADE from erasing a user.
-- Without that exemption the trigger would make user deletion impossible.
create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  raise exception 'credit_ledger is append-only';
end;
$$;

drop trigger if exists credit_ledger_no_update on public.credit_ledger;
create trigger credit_ledger_no_update
  before update or delete on public.credit_ledger
  for each row execute function public.reject_ledger_mutation();

create or replace function public.reject_ledger_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_ledger is append-only';
end;
$$;

drop trigger if exists credit_ledger_no_truncate on public.credit_ledger;
create trigger credit_ledger_no_truncate
  before truncate on public.credit_ledger
  for each statement execute function public.reject_ledger_truncate();

-- ---------------------------------------------------------------------------
-- credit_balance
-- ---------------------------------------------------------------------------
create or replace function public.credit_balance(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is not null and v_caller <> p_user_id then
    raise exception 'FORBIDDEN';
  end if;

  return (
    select coalesce(sum(l.delta), 0)::integer
    from public.credit_ledger l
    where l.user_id = p_user_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- spend_credits -- atomic debit
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_search_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  if v_caller is not null and v_caller <> p_user_id then
    raise exception 'FORBIDDEN';
  end if;

  -- Serialise concurrent spends for this user. Held until the transaction ends,
  -- so the balance read below cannot be raced by another spend_credits call.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select coalesce(sum(l.delta), 0) into v_balance
  from public.credit_ledger l
  where l.user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_ledger (user_id, delta, reason, search_id)
  values (p_user_id, -p_amount, p_reason, p_search_id);

  return v_balance - p_amount;
end;
$$;

-- ---------------------------------------------------------------------------
-- grant_credits -- mints credits. Service role only.
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);

  select coalesce(sum(l.delta), 0)::integer into v_balance
  from public.credit_ledger l
  where l.user_id = p_user_id;

  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges
-- ---------------------------------------------------------------------------
-- Functions are EXECUTE-to-PUBLIC by default, AND Supabase's default privileges
-- additionally grant EXECUTE on new functions directly to anon and authenticated.
-- Revoking from PUBLIC alone therefore does NOT lock these down -- anon and
-- authenticated must be named explicitly. Strip everything, then hand back only
-- what each caller legitimately needs.
revoke all on function public.credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.reject_ledger_mutation() from public, anon, authenticated;
revoke all on function public.reject_ledger_truncate() from public, anon, authenticated;

grant execute on function public.credit_balance(uuid) to authenticated, service_role;
grant execute on function public.spend_credits(uuid, integer, text, uuid) to authenticated, service_role;
-- Deliberately NOT granted to anon or authenticated: minting is server-side only.
grant execute on function public.grant_credits(uuid, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- Signup grant
-- ---------------------------------------------------------------------------
create or replace function public.grant_signup_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Idempotent: the partial unique index guarantees at most one signup_grant per
  -- user, and a repeat attempt must not break profile creation.
  begin
    perform public.grant_credits(new.id, 5, 'signup_grant');
  exception when unique_violation then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists grant_signup_credits on public.profiles;
create trigger grant_signup_credits
  after insert on public.profiles
  for each row execute function public.grant_signup_credits();
