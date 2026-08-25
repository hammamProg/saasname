-- Supabase project linked during setup step 2
alter table public.projects
  add column if not exists supabase_project_ref text,
  add column if not exists supabase_project_url text,
  add column if not exists supabase_anon_key text,
  add column if not exists supabase_service_role_key text,
  add column if not exists supabase_auth_callback_url text,
  add column if not exists supabase_site_url text,
  add column if not exists supabase_redirect_urls text[] not null default '{}',
  add column if not exists supabase_auth_configured boolean not null default false,
  add column if not exists google_oauth_client_id text,
  add column if not exists google_oauth_client_secret text;

create index if not exists projects_supabase_ref_idx
  on public.projects (supabase_project_ref)
  where supabase_project_ref is not null;
