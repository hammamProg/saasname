-- Waitlist / lead capture table
-- Run in Supabase: SQL Editor → New query → paste → Run

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- No public RLS policies — the API route uses the service_role key (server-only).
