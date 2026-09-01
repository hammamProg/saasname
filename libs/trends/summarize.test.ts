import { describe, it, expect, vi, beforeEach } from "vitest";
import { summarizeTopicsNeedingSummary } from "@/libs/trends/summarize";

const complete = vi.hoisted(() => vi.fn());
vi.mock("@/libs/llm/openai", () => ({
  isOpenAiConfigured: () => true,
  createOpenAiProvider: () => ({ complete }),
}));

const state = vi.hoisted(() => ({
  topics: [{ id: "topic-1", canonical_name: "AI Receptionists" }] as Array<{
    id: string;
    canonical_name: string;
  }>,
  signals: [{ title: "Show HN: AI receptionist", canonical_url: "https://x.com/1" }],
  updated: null as Record<string, unknown> | null,
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({ is: () => ({ limit: async () => ({ data: state.topics, error: null }) }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.updated = values;
          return { error: null };
        },
      }),
    };
  }
  if (table === "signals") {
    return {
      select: () => ({
        eq: () => ({ limit: async () => ({ data: state.signals, error: null }) }),
      }),
    };
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.updated = null;
  complete.mockResolvedValue(
    JSON.stringify({
      description: "Automated agents that answer customer calls and messages.",
      whyTrending: "Search and launch activity both accelerated this week.",
    })
  );
});

describe("summarizeTopicsNeedingSummary", () => {
  it("writes the parsed description and why_trending onto the topic", async () => {
    const result = await summarizeTopicsNeedingSummary();

    expect(result).toEqual({ summarized: 1 });
    expect(state.updated).toMatchObject({
      description: "Automated agents that answer customer calls and messages.",
      why_trending: "Search and launch activity both accelerated this week.",
    });
  });

  it("skips a topic whose completion is not valid JSON rather than throwing", async () => {
    complete.mockResolvedValueOnce("not json");

    const result = await summarizeTopicsNeedingSummary();

    expect(result).toEqual({ summarized: 0 });
  });
});
