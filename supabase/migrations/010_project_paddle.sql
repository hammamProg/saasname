-- Paddle billing setup (step 6)
alter table public.projects
  add column if not exists paddle_provisioned boolean not null default false,
  add column if not exists paddle_client_token text,
  add column if not exists paddle_api_key text,
  add column if not exists paddle_webhook_secret text,
  add column if not exists paddle_webhook_url text,
  add column if not exists paddle_starter_price_id text,
  add column if not exists paddle_pro_price_id text,
  add column if not exists paddle_notification_setting_id text;
