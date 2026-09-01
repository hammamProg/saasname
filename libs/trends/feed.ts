import { createClient } from "@/libs/supabase/server";

export type TrendCardData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  stage: string;
  trendScore: number;
  confidenceScore: number;
  categoryId: string | null;
  categoryName: string | null;
  isFollowed: boolean;
  momentum: number;
  sourceCount: number;
  whyRecommended: string;
};

type TopicRow = {
  id: string;
  slug: string;
  canonical_name: string;
  description: string | null;
  stage: string;
  trend_score: number;
  confidence_score: number;
  category_id: string | null;
};

const FEED_LIMIT = 20;

async function hiddenTopicIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase.from("hidden_topics").select("topic_id").eq("user_id", userId);
  return (data ?? []).map((row) => row.topic_id as string);
}

async function followedTopicIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase.from("follows").select("topic_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.topic_id as string));
}

/** `topics.category_id` is a uuid; `selectedCategories` (from
 *  `user_preferences.selected_categories`) are slugs like "ai". Resolves
 *  slugs to their uuids before any `.in("category_id", ...)` filter —
 *  filtering directly on slugs sends the wrong type to Postgres. */
async function categoryIdsForSlugs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("categories").select("id").in("slug", slugs);

  if (error) {
    throw new Error(`Failed to resolve categories: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id as string);
}

async function categoryNamesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryIds: string[]
): Promise<Map<string, string>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", categoryIds);

  if (error) {
    throw new Error(`Failed to load category names: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
}

/** Latest (by snapshot_date) momentum per topic, from `topic_snapshots`. */
async function latestMomentumByTopic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicIds: string[]
): Promise<Map<string, number>> {
  if (topicIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("topic_snapshots")
    .select("topic_id, momentum, snapshot_date")
    .in("topic_id", topicIds)
    .order("snapshot_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to load momentum: ${error.message}`);
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const topicId = row.topic_id as string;
    if (!map.has(topicId)) {
      map.set(topicId, (row.momentum as number) ?? 0);
    }
  }
  return map;
}

/** Distinct `source_provider` count per topic, computed directly from
 *  `signals` — simplest correct approach for MVP feed volume rather than
 *  precomputing/storing it at snapshot time. */
async function sourceCountByTopic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicIds: string[]
): Promise<Map<string, number>> {
  if (topicIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("signals")
    .select("topic_id, source_provider")
    .in("topic_id", topicIds);

  if (error) {
    throw new Error(`Failed to load source counts: ${error.message}`);
  }

  const providersByTopic = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const topicId = row.topic_id as string;
    if (!providersByTopic.has(topicId)) {
      providersByTopic.set(topicId, new Set());
    }
    providersByTopic.get(topicId)!.add(row.source_provider as string);
  }

  return new Map(
    [...providersByTopic.entries()].map(([topicId, providers]) => [topicId, providers.size])
  );
}

function toCardData(
  row: TopicRow,
  followed: Set<string>,
  momentumByTopic: Map<string, number>,
  sourceCountByTopicMap: Map<string, number>,
  categoryNames: Map<string, string>,
  whyRecommended: string
): TrendCardData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.canonical_name,
    description: row.description,
    stage: row.stage,
    trendScore: row.trend_score,
    confidenceScore: row.confidence_score,
    categoryId: row.category_id,
    categoryName: row.category_id ? (categoryNames.get(row.category_id) ?? null) : null,
    isFollowed: followed.has(row.id),
    momentum: momentumByTopic.get(row.id) ?? 0,
    sourceCount: sourceCountByTopicMap.get(row.id) ?? 0,
    whyRecommended,
  };
}

async function enrichRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: TopicRow[],
  followed: Set<string>,
  whyFor: (row: TopicRow, categoryNames: Map<string, string>) => string
): Promise<TrendCardData[]> {
  const topicIds = rows.map((row) => row.id);
  const categoryIds = [...new Set(rows.map((row) => row.category_id).filter(Boolean))] as string[];

  const [momentumByTopic, sourceCountByTopicMap, categoryNames] = await Promise.all([
    latestMomentumByTopic(supabase, topicIds),
    sourceCountByTopic(supabase, topicIds),
    categoryNamesByIds(supabase, categoryIds),
  ]);

  return rows.map((row) =>
    toCardData(
      row,
      followed,
      momentumByTopic,
      sourceCountByTopicMap,
      categoryNames,
      whyFor(row, categoryNames)
    )
  );
}

/** Ranked by trend_score, filtered to the user's selected categories. An
 *  empty `selectedCategories` (onboarding skipped) means unfiltered, per the
 *  design doc — a picker with nothing selected must never yield an empty
 *  feed. */
export async function getForYouFeed(
  userId: string,
  selectedCategories: string[]
): Promise<TrendCardData[]> {
  const supabase = await createClient();
  const [hidden, followed] = await Promise.all([
    hiddenTopicIds(supabase, userId),
    followedTopicIds(supabase, userId),
  ]);

  let query = supabase
    .from("topics")
    .select("id, slug, canonical_name, description, stage, trend_score, confidence_score, category_id")
    .eq("editorial_status", "published");

  if (selectedCategories.length > 0) {
    const categoryIds = await categoryIdsForSlugs(supabase, selectedCategories);
    query = query.in("category_id", categoryIds);
  }
  if (hidden.length > 0) {
    query = query.not("id", "in", `(${hidden.join(",")})`);
  }

  const { data, error } = await query.order("trend_score", { ascending: false }).limit(FEED_LIMIT);

  if (error) {
    throw new Error(`Failed to load For You feed: ${error.message}`);
  }

  return enrichRows(supabase, (data ?? []) as TopicRow[], followed, (row, categoryNames) => {
    const categoryName = row.category_id ? categoryNames.get(row.category_id) : undefined;
    return categoryName ? `You follow ${categoryName}` : "Matches your interests";
  });
}

/** Unfiltered by category on purpose — the exploration slot that prevents
 *  the filter-bubble narrowing the design doc calls out. */
export async function getRisingFastFeed(userId: string): Promise<TrendCardData[]> {
  const supabase = await createClient();
  const [hidden, followed] = await Promise.all([
    hiddenTopicIds(supabase, userId),
    followedTopicIds(supabase, userId),
  ]);

  let query = supabase
    .from("topics")
    .select("id, slug, canonical_name, description, stage, trend_score, confidence_score, category_id")
    .eq("editorial_status", "published");

  if (hidden.length > 0) {
    query = query.not("id", "in", `(${hidden.join(",")})`);
  }

  const { data, error } = await query.order("trend_score", { ascending: false }).limit(10);

  if (error) {
    throw new Error(`Failed to load Rising Fast feed: ${error.message}`);
  }

  return enrichRows(supabase, (data ?? []) as TopicRow[], followed, () => "Trending across sources");
}
