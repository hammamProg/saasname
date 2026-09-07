-- Removes the analytics-to-trends join.
--
-- 030 tied a site's traffic to the trend topics this app clusters. That was
-- built as the differentiator, but the two products are being kept separate
-- for now, and a table that nothing writes to is worse than no table: it looks
-- like a feature to whoever reads the schema next.
--
-- The table is dropped rather than left empty. It held no rows - the matcher
-- wrote nothing once 031 made match_topics honour its threshold - so nothing
-- is lost, and 030 plus this file are the record of what was tried.
--
-- 031 is deliberately NOT reverted. match_topics ignoring its match_threshold
-- was a real defect in the trends clustering path, independent of analytics.

select cron.unschedule('webstats-match-topics')
where exists (select 1 from cron.job where jobname = 'webstats-match-topics');

drop table if exists public.webstats_site_topics;
