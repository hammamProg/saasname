import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  followTopic,
  unfollowTopic,
  hideTopic,
  FollowLimitReachedError,
} from "@/libs/trends/follows";

const upsert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const del = vi.hoisted(() => vi.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) })));
const existingFollows = vi.hoisted(() => ({ rows: [] as Array<{ topic_id: string }> }));

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "follows" || table === "hidden_topics") {
        return {
          upsert,
          delete: del,
          select: () => ({
            eq: async () => ({ data: existingFollows.rows, error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  existingFollows.rows = [];
});

describe("followTopic follow limit", () => {
  it("allows the write when no limit applies", async () => {
    existingFollows.rows = [{ topic_id: "a" }, { topic_id: "b" }, { topic_id: "c" }];

    await followTopic("user-1", "topic-new", null);

    expect(upsert).toHaveBeenCalled();
  });

  it("refuses a new follow once the cap is reached", async () => {
    existingFollows.rows = [{ topic_id: "a" }, { topic_id: "b" }, { topic_id: "c" }];

    await expect(followTopic("user-1", "topic-new", 3)).rejects.toBeInstanceOf(
      FollowLimitReachedError
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("stays idempotent for an already-followed topic at the cap", async () => {
    existingFollows.rows = [{ topic_id: "a" }, { topic_id: "b" }, { topic_id: "c" }];

    await followTopic("user-1", "b", 3);

    expect(upsert).toHaveBeenCalled();
  });

  it("allows a new follow below the cap", async () => {
    existingFollows.rows = [{ topic_id: "a" }];

    await followTopic("user-1", "topic-new", 3);

    expect(upsert).toHaveBeenCalled();
  });
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
