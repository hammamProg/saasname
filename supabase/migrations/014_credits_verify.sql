-- 014_credits_verify.sql
-- Run manually in the Supabase SQL Editor after 014_credits.sql.
-- SQL functions cannot be covered by Vitest; this script is their test.
-- It rolls back at the end and leaves no data behind.
-- Expected output: eight PASS notices and no exception.

begin;

-- ---------------------------------------------------------------------------
-- Behaviour of the ledger functions (runs as the migration/owner role, i.e.
-- auth.uid() is null, which is how the service role calls them).
-- ---------------------------------------------------------------------------
do $$
declare
  v_user uuid;
  v_start integer;
  v_balance integer;
begin
  select id into v_user from auth.users limit 1;
  if v_user is null then
    raise exception 'No users exist -- sign up once before running this script';
  end if;

  v_start := public.credit_balance(v_user);

  -- grant increases balance
  v_balance := public.grant_credits(v_user, 10, 'test_grant');
  if v_balance <> v_start + 10 then
    raise exception 'FAIL: grant did not increase balance by 10 (% -> %)', v_start, v_balance;
  end if;
  raise notice 'PASS: grant increased balance % -> %', v_start, v_balance;

  -- spend decreases balance
  v_balance := public.spend_credits(v_user, 3, 'test_spend');
  if v_balance <> v_start + 7 then
    raise exception 'FAIL: spend returned %, expected %', v_balance, v_start + 7;
  end if;
  if public.credit_balance(v_user) <> v_balance then
    raise exception 'FAIL: credit_balance disagrees with spend_credits return value';
  end if;
  raise notice 'PASS: balance after spend = %', v_balance;

  -- overdraw is rejected
  begin
    perform public.spend_credits(v_user, 999999, 'test_overdraw');
    raise exception 'FAIL: overdraw was allowed';
  exception when others then
    if sqlerrm <> 'INSUFFICIENT_CREDITS' then raise; end if;
    raise notice 'PASS: overdraw rejected';
  end;

  -- zero and negative amounts are rejected
  begin
    perform public.spend_credits(v_user, 0, 'test_zero');
    raise exception 'FAIL: zero spend was allowed';
  exception when others then
    if sqlerrm <> 'AMOUNT_MUST_BE_POSITIVE' then raise; end if;
    raise notice 'PASS: zero spend rejected';
  end;

  begin
    perform public.grant_credits(v_user, -5, 'test_negative_grant');
    raise exception 'FAIL: negative grant was allowed';
  exception when others then
    if sqlerrm <> 'AMOUNT_MUST_BE_POSITIVE' then raise; end if;
    raise notice 'PASS: negative grant rejected';
  end;

  -- ledger is append-only
  begin
    update public.credit_ledger set delta = 100 where user_id = v_user;
    raise exception 'FAIL: ledger update was allowed';
  exception when others then
    if sqlerrm <> 'credit_ledger is append-only' then raise; end if;
    raise notice 'PASS: ledger update rejected';
  end;

  begin
    delete from public.credit_ledger where user_id = v_user;
    raise exception 'FAIL: ledger delete was allowed';
  exception when others then
    if sqlerrm <> 'credit_ledger is append-only' then raise; end if;
    raise notice 'PASS: ledger delete rejected';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Privilege checks: an end user must not be able to mint credits.
-- ---------------------------------------------------------------------------
do $$
begin
  if has_function_privilege('authenticated', 'public.grant_credits(uuid, integer, text)', 'execute') then
    raise exception 'FAIL: authenticated can execute grant_credits';
  end if;
  if has_function_privilege('anon', 'public.grant_credits(uuid, integer, text)', 'execute') then
    raise exception 'FAIL: anon can execute grant_credits';
  end if;
  if has_function_privilege('anon', 'public.spend_credits(uuid, integer, text, uuid)', 'execute') then
    raise exception 'FAIL: anon can execute spend_credits';
  end if;
  if has_table_privilege('authenticated', 'public.credit_ledger', 'insert')
     or has_table_privilege('authenticated', 'public.credit_ledger', 'update')
     or has_table_privilege('authenticated', 'public.credit_ledger', 'delete') then
    raise exception 'FAIL: authenticated has write privileges on credit_ledger';
  end if;
  raise notice 'PASS: minting and direct writes are not reachable by end users';
end $$;

-- ---------------------------------------------------------------------------
-- Cross-user guard: an authenticated caller may only touch their own account.
-- ---------------------------------------------------------------------------
do $$
declare
  v_user uuid;
  v_other uuid := '00000000-0000-0000-0000-0000000000ff';
begin
  select id into v_user from auth.users limit 1;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user::text)::text, true);

  if auth.uid() is distinct from v_user then
    raise notice 'SKIP: could not simulate auth.uid() in this session';
    return;
  end if;

  begin
    perform public.spend_credits(v_other, 1, 'test_cross_user');
    raise exception 'FAIL: spend against another user was allowed';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
    raise notice 'PASS: cross-user spend rejected';
  end;

  begin
    perform public.credit_balance(v_other);
    raise exception 'FAIL: reading another user balance was allowed';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
    raise notice 'PASS: cross-user balance read rejected';
  end;
end $$;

rollback;
