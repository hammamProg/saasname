import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserPreferences, saveUserPreferences } from "@/libs/trends/preferences";

const maybeSingle = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());

vi.mock("@/libs/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "user_preferences") {
        return {
          select: () => ({ eq: () => ({ maybeSingle }) }),
          upsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserPreferences", () => {
  it("returns null when the user has no saved preferences", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await getUserPreferences("user-1")).toBeNull();
  });

  it("returns the selected categories when present", async () => {
    maybeSingle.mockResolvedValue({
      data: { selected_categories: ["ai", "saas"] },
      error: null,
    });

    expect(await getUserPreferences("user-1")).toEqual({
      selectedCategories: ["ai", "saas"],
    });
  });
});

describe("saveUserPreferences", () => {
  it("upserts the row keyed by user_id", async () => {
    upsert.mockResolvedValue({ error: null });

    await saveUserPreferences("user-1", ["ai", "dev-tools"]);

    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", selected_categories: ["ai", "dev-tools"] },
      { onConflict: "user_id" }
    );
  });
});
