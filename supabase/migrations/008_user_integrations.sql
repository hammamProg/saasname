-- Persist Composio integration metadata per user (e.g. Supabase organization id)

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  connection_id text,
  organization_id text,
  organization_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_integrations_user_provider_idx
  on public.user_integrations (user_id, provider);

alter table public.user_integrations enable row level security;

create policy "Users can read own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

create policy "Users can insert own integrations"
  on public.user_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own integrations"
  on public.user_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete own integrations"
  on public.user_integrations for delete
  using (auth.uid() = user_id);
