-- Goals/conversion tracking is removed: it required customers to
-- instrument analytics.goal() calls by hand, which was more setup work than
-- the feature was worth for this product. Nothing ever wrote a real row to
-- either table in production (verified before this migration), so this is a
-- clean drop, not a data-loss concern.
--
-- webstats_visitors, webstats_sessions, webstats_identity_events,
-- webstats_identity_links and the rest of the identity/attribution pipeline
-- are untouched — only the goal-specific tables go.

drop table if exists public.webstats_goal_completions;
drop table if exists public.webstats_goals;
