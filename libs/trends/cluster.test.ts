import { describe, it, expect, vi, beforeEach } from "vitest";
import { clusterUnclusteredSignals } from "@/libs/trends/cluster";

const embedText = vi.hoisted(() => vi.fn());
vi.mock("@/libs/llm/openai-embeddings", () => ({ embedText }));

const state = vi.hoisted(() => ({
  signals: [] as Array<{ id: string; title: string; text_excerpt: string | null; category_hint: string | null }>,
  matches: [] as Array<{ id: string; similarity: number }>,
  updatedSignal: null as { id: string; topic_id: string } | null,
  inserted: null as { slug: string } | null,
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
  if (table === "topics") {
    return {
      insert: (values: { slug: string }) => ({
        select: () => ({
          single: async () => {
            state.inserted = values;
            return { data: { id: "new-topic-id" }, error: null };
          },
        }),
      }),
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
  state.updatedSignal = null;
  state.inserted = null;
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

  it("merges into an existing topic when similarity clears the threshold", async () => {
    state.matches = [{ id: "existing-topic", similarity: 0.9 }];

    const result = await clusterUnclusteredSignals();

    expect(result).toEqual({ clustered: 1, newTopics: 0 });
    expect(state.updatedSignal).toEqual({ id: "sig-1", topic_id: "existing-topic" });
  });
});
