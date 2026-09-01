import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";

const state = vi.hoisted(() => ({
  topics: [{ id: "topic-1" }] as Array<{ id: string }>,
  todaySignals: [] as Array<{ source_provider: string; engagement_metrics: Record<string, number> }>,
  previousSnapshot: null as { signal_count: number; engagement_sum: number } | null,
  upsertedSnapshot: null as Record<string, unknown> | null,
  updatedTopic: null as Record<string, unknown> | null,
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({ limit: async () => ({ data: state.topics, error: null }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.updatedTopic = values;
          return { error: null };
        },
      }),
    };
  }
  if (table === "signals") {
    return {
      select: () => ({
        eq: () => ({ gte: async () => ({ data: state.todaySignals, error: null }) }),
      }),
    };
  }
  if (table === "topic_snapshots") {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ data: state.previousSnapshot ? [state.previousSnapshot] : [], error: null }) }),
        }),
      }),
      upsert: async (values: Record<string, unknown>) => {
        state.upsertedSnapshot = values;
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.topics = [{ id: "topic-1" }];
  state.todaySignals = [
    { source_provider: "hacker_news", engagement_metrics: { score: 10 } },
    { source_provider: "github", engagement_metrics: { stars: 5 } },
  ];
  state.previousSnapshot = null;
  state.upsertedSnapshot = null;
  state.updatedTopic = null;
});

describe("runDailySnapshotAndScore", () => {
  it("writes a snapshot and updates the topic's score and stage", async () => {
    const result = await runDailySnapshotAndScore();

    expect(result).toEqual({ topicsProcessed: 1 });
    expect(state.upsertedSnapshot).toMatchObject({
      topic_id: "topic-1",
      signal_count: 2,
    });
    expect(state.updatedTopic).toMatchObject({
      trend_score: expect.any(Number),
      confidence_score: expect.any(Number),
      stage: expect.any(String),
    });
  });
});
