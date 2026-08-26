-- Rate-limit ledger for the public landing-page demo.
--
-- The demo runs real probes for anonymous visitors, so it spends real API
-- quota. This table is what bounds that spend. It is written only by the
-- service role from the demo route.
--
-- No raw IP is stored. `ip_hash` is a salted digest computed in the
-- application, which is enough to count requests from the same source without
-- retaining an identifier we would then have to explain in the privacy policy.

create table if not exists public.demo_checks (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  normalized_name text not null,
  created_at timestamptz not null default now()
);

-- Both reads are "how many rows since a cutoff", one scoped to a hash and one
-- global, so the index leads with created_at.
create index if not exists demo_checks_recent_idx
  on public.demo_checks (created_at desc);

create index if not exists demo_checks_ip_recent_idx
  on public.demo_checks (ip_hash, created_at desc);

-- RLS on with NO policy and no grants: service role only, like platform_cache.
-- The advisor flags this as rls_enabled_no_policy; that is intended.
alter table public.demo_checks enable row level security;
