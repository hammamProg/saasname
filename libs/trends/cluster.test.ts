import { describe, it, expect, vi, beforeEach } from "vitest";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";

const embedText = vi.hoisted(() => vi.fn());
vi.mock("@/libs/llm/openai-embeddings", () => ({ embedText }));

const state = vi.hoisted(() => ({
  signals: [] as Array<{ id: string; title: string; text_excerpt: string | null; category_hint: string | null }>,
  matches: [] as Array<{ id: string; similarity: number }>,
  categories: [{ id: "cat-ai", slug: "ai" }] as Array<{ id: string; slug: string }>,
  updatedSignal: null as { id: string; topic_id: string } | null,
  inserted: null as { slug: string; category_id: string | null } | null,
  upsertedAlias: null as { topic_id: string; alias_text: string } | null,
}));

function selectSignalsChain() {
  return {
    is: () => ({ limit: async () => ({ data: state.signals, error: null }) }),
  };
}

function fromMock(table: string) {
  if (table === "signals") {
    return {
      select: () => selectSignalsChain(),
      update: (values: { topic_id: string }) => ({
        eq: async (_col: string, id: string) => {
          state.updatedSignal = { id, topic_id: values.topic_id };
          return { error: null };
        },
      }),
    };
  }
  if (table === "categories") {
    return {
      select: async () => ({ data: state.categories, error: null }),
    };
  }
  if (table === "topics") {
    return {
      insert: (values: { slug: string; category_id: string | null }) => ({
        select: () => ({
          single: async () => {
            state.inserted = values;
            return { data: { id: "new-topic-id" }, error: null };
          },
        }),
      }),
    };
  }
  if (table === "topic_aliases") {
    return {
      upsert: async (values: { topic_id: string; alias_text: string }) => {
        state.upsertedAlias = values;
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: fromMock,
    rpc: async () => ({ data: state.matches, error: null }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.signals = [
    { id: "sig-1", title: "AI receptionist", text_excerpt: null, category_hint: "ai" },
  ];
  state.matches = [];
  state.categories = [{ id: "cat-ai", slug: "ai" }];
  state.updatedSignal = null;
  state.inserted = null;
  state.upsertedAlias = null;
  embedText.mockResolvedValue(new Array(1536).fill(0.01));
});

describe("clusterUnclusteredSignals", () => {
  it("creates a new topic when no existing topic clears the similarity threshold", async () => {
    state.matches = [{ id: "existing", similarity: 0.4 }];

    const result = await clusterUnclusteredSignals();

    expect(result).toEqual({ clustered: 1, newTopics: 1 });
    expect(state.inserted).toMatchObject({ slug: expect.stringContaining("ai-receptionist") });
    expect(state.updatedSignal).toEqual({ id: "sig-1", topic_id: "new-topic-id" });
  });

  it("resolves category_hint to the matching categories.id on the new topic", async () => {
    state.matches = [{ id: "existing", similarity: 0.4 }];

    await clusterUnclusteredSignals();

    expect(state.inserted).toMatchObject({ category_id: "cat-ai" });
  });

  it("leaves category_id null when the signal has no category_hint", async () => {
    state.matches = [{ id: "existing", similarity: 0.4 }];
    state.signals = [
      { id: "sig-1", title: "Something niche", text_excerpt: null, category_hint: null },
    ];

    await clusterUnclusteredSignals();

    expect(state.inserted).toMatchObject({ category_id: null });
  });

  it("merges into an existing topic when similarity clears the threshold", async () => {
    state.matches = [{ id: "existing-topic", similarity: 0.9 }];

    const result = await clusterUnclusteredSignals();

    expect(result).toEqual({ clustered: 1, newTopics: 0 });
    expect(state.updatedSignal).toEqual({ id: "sig-1", topic_id: "existing-topic" });
  });

  it("inserts a topic_aliases row with the signal's title when merging", async () => {
    state.matches = [{ id: "existing-topic", similarity: 0.9 }];

    await clusterUnclusteredSignals();

    expect(state.upsertedAlias).toEqual({
      topic_id: "existing-topic",
      alias_text: "AI receptionist",
    });
  });
});
