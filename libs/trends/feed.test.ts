import { describe, it, expect, vi, beforeEach } from "vitest";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";

const state = vi.hoisted(() => ({
  hidden: [{ topic_id: "hidden-1" }],
  follows: [{ topic_id: "topic-1" }],
  topics: [
    { id: "topic-1", slug: "ai-receptionists", canonical_name: "AI Receptionists", description: "d", stage: "accelerating", trend_score: 80, confidence_score: 60, category_id: "cat-ai" },
  ],
}));

function topicsQuery() {
  const builder: Record<string, unknown> = {};
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.not = () => builder;
  builder.order = () => builder;
  builder.limit = async () => ({ data: state.topics, error: null });
  return builder;
}

function fromMock(table: string) {
  if (table === "hidden_topics") {
    return { select: () => ({ eq: async () => ({ data: state.hidden, error: null }) }) };
  }
  if (table === "follows") {
    return { select: () => ({ eq: async () => ({ data: state.follows, error: null }) }) };
  }
  if (table === "topics") {
    return { select: () => topicsQuery() };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getForYouFeed", () => {
  it("returns topics mapped to card data, marked as followed", async () => {
    const feed = await getForYouFeed("user-1", ["ai"]);

    expect(feed).toEqual([
      {
        id: "topic-1",
        slug: "ai-receptionists",
        name: "AI Receptionists",
        description: "d",
        stage: "accelerating",
        trendScore: 80,
        confidenceScore: 60,
        categoryId: "cat-ai",
        isFollowed: true,
      },
    ]);
  });
});

describe("getRisingFastFeed", () => {
  it("returns topics unfiltered by category", async () => {
    const feed = await getRisingFastFeed("user-1");

    expect(feed).toHaveLength(1);
  });
});
