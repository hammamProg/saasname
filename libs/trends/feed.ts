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
  isFollowed: boolean;
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

function toCardData(
  row: {
    id: string;
    slug: string;
    canonical_name: string;
    description: string | null;
    stage: string;
    trend_score: number;
    confidence_score: number;
    category_id: string | null;
  },
  followed: Set<string>
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
    isFollowed: followed.has(row.id),
  };
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
    query = query.in("category_id", selectedCategories);
  }
  if (hidden.length > 0) {
    query = query.not("id", "in", `(${hidden.join(",")})`);
  }

  const { data, error } = await query.order("trend_score", { ascending: false }).limit(FEED_LIMIT);

  if (error) {
    throw new Error(`Failed to load For You feed: ${error.message}`);
  }

  return (data ?? []).map((row) => toCardData(row, followed));
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

  return (data ?? []).map((row) => toCardData(row, followed));
}
