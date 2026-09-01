import { describe, it, expect, vi, beforeEach } from "vitest";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";

const state = vi.hoisted(() => ({
  hidden: [{ topic_id: "hidden-1" }],
  follows: [{ topic_id: "topic-1" }],
  categories: [
    { id: "cat-ai", slug: "ai", name: "AI" },
    { id: "cat-saas", slug: "saas", name: "SaaS" },
  ],
  topics: [
    { id: "topic-1", slug: "ai-receptionists", canonical_name: "AI Receptionists", description: "d", stage: "accelerating", trend_score: 80, confidence_score: 60, category_id: "cat-ai" },
  ],
  snapshots: [{ topic_id: "topic-1", momentum: 12, snapshot_date: "2026-08-30" }],
  signals: [
    { topic_id: "topic-1", source_provider: "hacker_news" },
    { topic_id: "topic-1", source_provider: "github" },
  ],
}));

const inSpy = vi.hoisted(() => vi.fn());

function topicsQuery() {
  const builder: Record<string, unknown> = {};
  builder.eq = () => builder;
  builder.in = (...args: unknown[]) => {
    inSpy(...args);
    return builder;
  };
  builder.not = () => builder;
  builder.order = () => builder;
  builder.limit = async () => ({ data: state.topics, error: null });
  return builder;
}

function categoriesQuery() {
  return {
    in: async (column: string, values: string[]) => {
      if (column === "slug") {
        return { data: state.categories.filter((c) => values.includes(c.slug)), error: null };
      }
      return { data: state.categories.filter((c) => values.includes(c.id)), error: null };
    },
  };
}

function snapshotsQuery() {
  const builder: Record<string, unknown> = {};
  builder.in = () => builder;
  builder.order = async () => ({ data: state.snapshots, error: null });
  return builder;
}

function signalsQuery() {
  return {
    in: async () => ({ data: state.signals, error: null }),
  };
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
  if (table === "categories") {
    return { select: () => categoriesQuery() };
  }
  if (table === "topic_snapshots") {
    return { select: () => snapshotsQuery() };
  }
  if (table === "signals") {
    return { select: () => signalsQuery() };
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
  it("resolves selected category slugs to uuids before filtering topics", async () => {
    await getForYouFeed("user-1", ["ai"]);

    // The bug this covers: passing slugs straight into `.in("category_id", ...)`
    // sends strings where Postgres expects uuids. Assert the *value*, not just
    // that `.in` was called, or an identity-function mock would pass regardless.
    expect(inSpy).toHaveBeenCalledWith("category_id", ["cat-ai"]);
  });

  it("returns topics mapped to card data, marked as followed, with momentum/source/why fields", async () => {
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
        categoryName: "AI",
        isFollowed: true,
        momentum: 12,
        sourceCount: 2,
        whyRecommended: "You follow AI",
      },
    ]);
  });

  it("does not filter by category when selectedCategories is empty", async () => {
    await getForYouFeed("user-1", []);

    expect(inSpy).not.toHaveBeenCalledWith("category_id", expect.anything());
  });
});

describe("getRisingFastFeed", () => {
  it("returns topics unfiltered by category, with a generic why-recommended string", async () => {
    const feed = await getRisingFastFeed("user-1");

    expect(feed).toHaveLength(1);
    expect(feed[0].whyRecommended).toBe("Trending across sources");
  });
});
