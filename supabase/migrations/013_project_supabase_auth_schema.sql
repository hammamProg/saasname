-- Track optional schema scripts applied during Supabase Auth setup (step 4)
alter table public.projects
  add column if not exists supabase_auth_schema_options jsonb not null default '{"leads": true, "profiles": true}'::jsonb,
  add column if not exists supabase_auth_schema_applied jsonb not null default '{}'::jsonb;
