-- 019_trends_schema.sql enabled RLS on `signals` but never added a SELECT
-- policy, so the user-scoped client used by `libs/trends/topic-detail.ts`
-- got zero rows (RLS denies by default) for every trend-detail evidence
-- query. Additive fix — 019 is left untouched.
-- See docs/superpowers/specs/2026-09-01-trend-discover-mvp-design.md.

create policy "Anyone can read signals of published topics"
  on public.signals for select
  using (
    exists (
      select 1 from public.topics
      where topics.id = signals.topic_id
        and topics.editorial_status = 'published'
    )
  );
