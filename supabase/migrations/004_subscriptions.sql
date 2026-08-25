-- Paddle subscription fields on profiles (ShipFast has_access equivalent)
-- Run after 003_profiles.sql

alter table public.profiles
  add column if not exists has_access boolean not null default false,
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_price_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create index if not exists profiles_paddle_customer_id_idx
  on public.profiles (paddle_customer_id)
  where paddle_customer_id is not null;

create index if not exists profiles_paddle_subscription_id_idx
  on public.profiles (paddle_subscription_id)
  where paddle_subscription_id is not null;

-- Only webhooks (service role) may change billing fields; users can still update email
create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  new.has_access := old.has_access;
  new.paddle_customer_id := old.paddle_customer_id;
  new.paddle_subscription_id := old.paddle_subscription_id;
  new.paddle_price_id := old.paddle_price_id;
  new.subscription_status := old.subscription_status;
  new.current_period_end := old.current_period_end;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields on public.profiles;

create trigger protect_profile_billing_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_billing_fields();
