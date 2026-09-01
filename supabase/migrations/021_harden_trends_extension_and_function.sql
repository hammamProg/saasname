-- Hardens two advisories introduced by 019_trends_schema.sql:
-- 1. `vector` was installed in the public schema; this project's convention
--    (uuid-ossp, pgcrypto) is the `extensions` schema.
-- 2. `match_topics` had a mutable search_path (function_search_path_mutable).

alter extension vector set schema extensions;

create or replace function public.match_topics(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
returns table (id uuid, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select topics.id, 1 - (topics.embedding <=> query_embedding) as similarity
  from public.topics
  where topics.embedding is not null
  order by topics.embedding <=> query_embedding
  limit match_count;
$$;
