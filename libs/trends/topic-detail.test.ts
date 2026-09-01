import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopicDetail } from "@/libs/trends/topic-detail";

const state = vi.hoisted(() => ({
  topic: {
    id: "topic-1",
    slug: "ai-receptionists",
    canonical_name: "AI Receptionists",
    description: "d",
    why_trending: "w",
    stage: "accelerating",
    trend_score: 80,
    confidence_score: 60,
  },
  snapshots: [{ snapshot_date: "2026-08-30", signal_count: 5, momentum: 2 }],
  signals: [{ title: "t", canonical_url: "https://x.com/1", source_provider: "hacker_news" }],
}));

function fromMock(table: string) {
  if (table === "topics") {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.topic, error: null }) }),
      }),
    };
  }
  if (table === "topic_snapshots") {
    return {
      select: () => ({
        eq: () => ({ order: async () => ({ data: state.snapshots, error: null }) }),
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

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTopicDetail", () => {
  it("returns the topic with its snapshots and evidence", async () => {
    const detail = await getTopicDetail("ai-receptionists");

    expect(detail).toMatchObject({
      name: "AI Receptionists",
      whyTrending: "w",
      snapshots: [{ snapshotDate: "2026-08-30", signalCount: 5, momentum: 2 }],
      evidence: [{ title: "t", url: "https://x.com/1", source: "hacker_news" }],
    });
  });

  it("returns null when no topic matches the slug", async () => {
    state.topic = null as never;
    expect(await getTopicDetail("missing")).toBeNull();
  });
});
