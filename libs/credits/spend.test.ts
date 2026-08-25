import { describe, it, expect, vi } from "vitest";
import { spendCredits } from "@/libs/credits/spend";
import { InsufficientCreditsError } from "@/libs/credits/errors";

declare global {
  var __fakeAdmin: { rpc: ReturnType<typeof vi.fn> } | null;
}

function fakeAdmin(response: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => globalThis.__fakeAdmin,
}));

describe("spendCredits", () => {
  it("returns the new balance on success", async () => {
    globalThis.__fakeAdmin = fakeAdmin({ data: 7, error: null });

    const balance = await spendCredits({
      userId: "user-1",
      amount: 3,
      reason: "search",
    });

    expect(balance).toBe(7);
  });

  it("calls spend_credits with the schema's parameter names", async () => {
    const admin = fakeAdmin({ data: 4, error: null });
    globalThis.__fakeAdmin = admin;

    await spendCredits({
      userId: "user-1",
      amount: 2,
      reason: "search",
      searchId: "search-9",
    });

    expect(admin.rpc).toHaveBeenCalledWith("spend_credits", {
      p_user_id: "user-1",
      p_amount: 2,
      p_reason: "search",
      p_search_id: "search-9",
    });
  });

  it("passes a null search id when none is supplied", async () => {
    const admin = fakeAdmin({ data: 4, error: null });
    globalThis.__fakeAdmin = admin;

    await spendCredits({ userId: "user-1", amount: 2, reason: "search" });

    expect(admin.rpc).toHaveBeenCalledWith(
      "spend_credits",
      expect.objectContaining({ p_search_id: null })
    );
  });

  it("throws InsufficientCreditsError when the balance is too low", async () => {
    globalThis.__fakeAdmin = fakeAdmin({
      data: null,
      error: { message: "INSUFFICIENT_CREDITS" },
    });

    await expect(
      spendCredits({ userId: "user-1", amount: 999, reason: "search" })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("throws a generic error for any other database failure", async () => {
    globalThis.__fakeAdmin = fakeAdmin({
      data: null,
      error: { message: "FORBIDDEN" },
    });

    const promise = spendCredits({ userId: "user-2", amount: 1, reason: "search" });

    await expect(promise).rejects.toThrow(/FORBIDDEN/);
    await expect(promise).rejects.not.toBeInstanceOf(InsufficientCreditsError);
  });

  it("rejects a non-positive amount without calling the database", async () => {
    const admin = fakeAdmin({ data: null, error: null });
    globalThis.__fakeAdmin = admin;

    await expect(
      spendCredits({ userId: "user-1", amount: 0, reason: "search" })
    ).rejects.toThrow("amount must be positive");

    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("rejects a fractional amount without calling the database", async () => {
    const admin = fakeAdmin({ data: null, error: null });
    globalThis.__fakeAdmin = admin;

    await expect(
      spendCredits({ userId: "user-1", amount: 1.5, reason: "search" })
    ).rejects.toThrow("amount must be positive");

    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("throws when the service-role client is unavailable", async () => {
    globalThis.__fakeAdmin = null;

    await expect(
      spendCredits({ userId: "user-1", amount: 1, reason: "search" })
    ).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
