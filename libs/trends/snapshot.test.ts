import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDailySnapshotAndScore } from "@/libs/trends/snapshot";

const state = vi.hoisted(() => ({
  topics: [{ id: "topic-1" }] as Array<{ id: string }>,
  todaySignals: [] as Array<{ source_provider: string; engagement_metrics: Record<string, number> }>,
  previousSnapshot: null as { signal_count: number; engagement_sum: number } | null,
  upsertedSnapshot: null as Record<string, unknown> | null,
  updatedTopic: null as Record<string, unknown> | null,
  updatedTopicIds: [] as string[],
  upsertError: null as { message: string } | null,
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      // Topics are read in stable-ordered pages rather than one capped
      // `.limit(500)`. The mock mirrors `.order().range()` and slices, so
      // multi-page paging is genuinely exercised rather than short-circuited.
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => ({
            data: state.topics.slice(from, to + 1),
            error: null,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          state.updatedTopic = values;
          state.updatedTopicIds.push(id);
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
        if (state.upsertError) {
          return { error: state.upsertError };
        }
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
  state.updatedTopicIds = [];
  state.upsertError = null;
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

  it("catches and logs a write failure for one topic without aborting the rest of the run", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    state.topics = [{ id: "topic-1" }, { id: "topic-2" }];
    state.upsertError = { message: "constraint violation" };

    const result = await runDailySnapshotAndScore();

    // Both topics fail the upsert in this scenario, so neither is counted as
    // processed and neither's topic row gets updated — but the loop still
    // ran to completion for both without throwing, and the failure was
    // logged rather than silently swallowed.
    expect(result).toEqual({ topicsProcessed: 0 });
    expect(state.updatedTopicIds).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[snapshot]",
      "topic-1",
      "constraint violation"
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[snapshot]",
      "topic-2",
      "constraint violation"
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("runDailySnapshotAndScore paging", () => {
  it("scores topics beyond the first page", async () => {
    // The bug this covers: a flat `.limit(500)` silently scored only the first
    // 500 topics every night, so anything past that could never reach the
    // publish threshold regardless of how much evidence accumulated.
    state.topics = Array.from({ length: 640 }, (_, index) => ({
      id: `topic-${index}`,
    }));

    const result = await runDailySnapshotAndScore();

    expect(result).toEqual({ topicsProcessed: 640 });
    expect(state.updatedTopicIds).toHaveLength(640);
    expect(state.updatedTopicIds).toContain("topic-639");
  });
});
