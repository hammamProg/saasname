import { describe, it, expect, vi, beforeEach } from "vitest";
import { setSearchSharing, generateShareToken } from "@/libs/searches/share";
import { createFakeAdmin, emptyDb, resetIds, type FakeDb } from "@/libs/searches/fake-admin";

const db = vi.hoisted(() => ({ current: null as unknown as FakeDb }));

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => createFakeAdmin(db.current),
}));

beforeEach(() => {
  resetIds();
  db.current = emptyDb();
  db.current.searches.push({
    id: "search-1",
    user_id: "user-1",
    is_public: false,
    share_token: null,
  });
});

describe("generateShareToken", () => {
  it("is long enough that a link cannot be guessed", () => {
    expect(generateShareToken().length).toBeGreaterThanOrEqual(32);
  });

  it("is URL-safe", () => {
    expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 50 }, generateShareToken));
    expect(tokens.size).toBe(50);
  });
});

describe("setSearchSharing", () => {
  it("creates a token and marks the search public", async () => {
    const { shareToken } = await setSearchSharing("search-1", "user-1", true);

    expect(shareToken).toBeTruthy();
    expect(db.current.searches[0].is_public).toBe(true);
    expect(db.current.searches[0].share_token).toBe(shareToken);
  });

  it("reuses the token so an already-sent link keeps working", async () => {
    const first = await setSearchSharing("search-1", "user-1", true);
    const second = await setSearchSharing("search-1", "user-1", true);

    expect(second.shareToken).toBe(first.shareToken);
  });

  it("clears the token when revoked, not just the flag", async () => {
    // Leaving the token behind would make an old link live again the next time
    // sharing was enabled.
    await setSearchSharing("search-1", "user-1", true);
    const { shareToken } = await setSearchSharing("search-1", "user-1", false);

    expect(shareToken).toBeNull();
    expect(db.current.searches[0].is_public).toBe(false);
    expect(db.current.searches[0].share_token).toBeNull();
  });

  it("issues a fresh token after a revoke", async () => {
    const first = await setSearchSharing("search-1", "user-1", true);
    await setSearchSharing("search-1", "user-1", false);
    const again = await setSearchSharing("search-1", "user-1", true);

    expect(again.shareToken).not.toBe(first.shareToken);
  });

  it("refuses to share a search belonging to someone else", async () => {
    // The service role bypasses RLS, so ownership must be enforced in code.
    await expect(setSearchSharing("search-1", "someone-else", true)).rejects.toThrow(
      /not found/
    );

    expect(db.current.searches[0].is_public).toBe(false);
  });
});
