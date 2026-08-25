-- Custom Paddle subscription plans per project (name + target price)
alter table public.projects
  add column if not exists paddle_plans jsonb not null default '[]'::jsonb;
