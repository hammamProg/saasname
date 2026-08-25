-- Resend email domain setup (steps 5–6)
alter table public.projects
  add column if not exists resend_domain text,
  add column if not exists resend_region text not null default 'us-east-1',
  add column if not exists resend_from_name text,
  add column if not exists resend_support_email text,
  add column if not exists resend_domain_id text,
  add column if not exists resend_domain_status text,
  add column if not exists resend_dns_records jsonb not null default '[]'::jsonb,
  add column if not exists resend_domain_added boolean not null default false;

create index if not exists projects_resend_domain_idx
  on public.projects (resend_domain)
  where resend_domain is not null;
