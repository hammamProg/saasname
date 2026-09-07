-- `match_topics` accepted a `match_threshold` argument and never used it.
-- There was no WHERE on similarity, so it returned the nearest `match_count`
-- topics however unrelated they were, while its signature promised a filter.
--
-- libs/trends/cluster.ts survived this because it re-checks
-- `best.similarity >= MERGE_THRESHOLD` in TypeScript. The trends-in-traffic
-- matcher trusted the parameter and wrote matches scoring 0.31-0.38 against a
-- stated threshold of 0.78 - topics with no relationship to the site.
--
-- Making the parameter do what its name says removes the trap. Clustering is
-- unaffected: it asks for one row and filters again, so a stricter RPC either
-- returns the same row or none, and "none" already means "create a new topic".

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
    and 1 - (topics.embedding <=> query_embedding) >= match_threshold
  order by topics.embedding <=> query_embedding
  limit match_count;
$$;
