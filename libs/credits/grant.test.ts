import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantCreditsForTransaction } from "@/libs/credits/grant";

const rpc = vi.fn();

vi.mock("@/libs/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc }),
}));

vi.mock("@/libs/paddle/server", () => ({
  getUserIdFromCustomData: (data: unknown) =>
    (data as { userId?: string })?.userId ?? null,
}));

vi.mock("@/libs/credits/packs", () => ({
  creditsForPriceId: (id: string) => (id === "pri_known" ? 25 : null),
}));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: 30, error: null });
});

describe("grantCreditsForTransaction", () => {
  it("grants the pack's credits for a recognised price ID", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_1",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_known" } }],
    });

    expect(granted).toBe(25);
    expect(rpc).toHaveBeenCalledWith("grant_credits", {
      p_user_id: "user-1",
      p_amount: 25,
      p_reason: "purchase:txn_1",
    });
  });

  it("grants nothing for an unrecognised price ID", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_2",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_subscription" } }],
    });

    expect(granted).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("grants nothing when the transaction has no user", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_3",
      customData: {},
      items: [{ price: { id: "pri_known" } }],
    });

    expect(granted).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sums credits across multiple pack line items", async () => {
    const granted = await grantCreditsForTransaction({
      id: "txn_4",
      customData: { userId: "user-1" },
      items: [{ price: { id: "pri_known" } }, { price: { id: "pri_known" } }],
    });

    expect(granted).toBe(50);
  });

  it("surfaces a failed grant instead of reporting credits that were not added", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "ledger is down" } });

    await expect(
      grantCreditsForTransaction({
        id: "txn_5",
        customData: { userId: "user-1" },
        items: [{ price: { id: "pri_known" } }],
      })
    ).rejects.toThrow(/ledger is down/);
  });
});
