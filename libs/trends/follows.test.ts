import { describe, it, expect, vi, beforeEach } from "vitest";
import { followTopic, unfollowTopic, hideTopic } from "@/libs/trends/follows";

const upsert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const del = vi.hoisted(() => vi.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) })));

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "follows" || table === "hidden_topics") {
        return { upsert, delete: del };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("follows", () => {
  it("followTopic upserts a follows row", async () => {
    await followTopic("user-1", "topic-1");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", topic_id: "topic-1" },
      { onConflict: "user_id,topic_id" }
    );
  });

  it("unfollowTopic deletes the row", async () => {
    await unfollowTopic("user-1", "topic-1");
    expect(del).toHaveBeenCalled();
  });

  it("hideTopic upserts a hidden_topics row with an optional reason", async () => {
    await hideTopic("user-1", "topic-1", "temporary_fad");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", topic_id: "topic-1", reason: "temporary_fad" },
      { onConflict: "user_id,topic_id" }
    );
  });
});
