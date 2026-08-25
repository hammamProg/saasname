-- Reset Paddle subscription fields on profiles (dev / testing).
-- Run in Supabase SQL Editor.

BEGIN;

UPDATE public.profiles
SET
  has_access = false,
  paddle_customer_id = NULL,
  paddle_subscription_id = NULL,
  paddle_price_id = NULL,
  subscription_status = NULL,
  current_period_end = NULL,
  updated_at = now()
WHERE email = 'you@example.com'; -- change or remove WHERE to reset all users

COMMIT;
