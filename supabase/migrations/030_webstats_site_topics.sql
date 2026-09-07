-- Which trend topics a site's traffic is touching.
--
-- This is the join the rest of the analytics product exists to make possible:
-- anyone can report pageviews, but only this codebase already knows what is
-- rising across Hacker News, GitHub, npm and the rest, because it clusters
-- those signals nightly into `topics`.
--
-- Computed on a schedule rather than per request. The semantic half costs an
-- embedding call, and a dashboard that pays for one on every page load is a
-- dashboard nobody can afford to leave open.

create table if not exists public.webstats_site_topics (
  site_id uuid not null references public.webstats_sites (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,

  -- 0-1. Alias hits are exact and score 1; semantic hits carry their cosine
  -- similarity, so the two can be ranked together without pretending a fuzzy
  -- match is as good as a literal one.
  match_score numeric not null,
  source text not null check (source in ('alias', 'semantic')),

  -- The term or title that produced the match, shown in the UI. A match a
  -- user cannot see the reason for is a match they will not believe.
  evidence text,

  computed_at timestamptz not null default now(),

  primary key (site_id, topic_id)
);

create index if not exists webstats_site_topics_ranked
  on public.webstats_site_topics (site_id, match_score desc);

alter table public.webstats_site_topics enable row level security;

-- Read-only to owners; only the scheduled job writes, via the service role.
create policy "Owners read their site topics"
  on public.webstats_site_topics for select
  to authenticated
  using (
    site_id in (
      select id from public.webstats_sites
      where owner_id = (select auth.uid()) and deleted_at is null
    )
  );

-- Weekly, Mondays 03:00 UTC. Topic embeddings move slowly and a site's page
-- mix moves slower still, so a nightly run would spend an embedding call per
-- site to produce the same answer.
select cron.unschedule('webstats-match-topics')
where exists (select 1 from cron.job where jobname = 'webstats-match-topics');

select cron.schedule(
  'webstats-match-topics',
  '0 3 * * 1',
  $$select public.internal_cron_call('/api/internal/webstats/match-topics')$$
);
