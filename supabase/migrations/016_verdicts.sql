-- 016_verdicts.sql
-- Verdict and score columns, added now that a rollup exists to populate them.
--
-- 015 deliberately shipped without these. A verdict column that is null on
-- every row invites something downstream to read null as "clear", which the
-- design spec calls the single bug that would destroy trust in this product.

alter table public.checks
  add column if not exists verdict text
    check (verdict is null or verdict in ('clear', 'contested', 'blocked', 'unknown')),
  add column if not exists strength integer
    check (strength is null or (strength >= 0 and strength <= 100));

alter table public.candidates
  add column if not exists verdict text
    check (verdict is null or verdict in ('clear', 'contested', 'blocked', 'unknown')),
  add column if not exists score integer
    check (score is null or (score >= 0 and score <= 100)),
  add column if not exists explanation text;

create index if not exists candidates_verdict_idx
  on public.candidates (search_id, verdict);
