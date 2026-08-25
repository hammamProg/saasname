import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatMoney,
  toResolvedPrice,
  loadPrices,
  describeBillingCycle,
} from "@/libs/paddle/prices";

const getPaddleServer = vi.hoisted(() => vi.fn());
const isPaddleServerConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/libs/paddle/server", () => ({
  getPaddleServer,
  isPaddleServerConfigured,
}));

/** Shape of the Paddle SDK Price entity, narrowed to what we read. */
function paddlePrice(overrides: Record<string, unknown> = {}) {
  return {
    id: "pri_starter",
    status: "active",
    unitPrice: { amount: "7900", currencyCode: "USD" },
    billingCycle: { interval: "month", frequency: 1 },
    product: { name: "SaaSName — Starter" },
    ...overrides,
  };
}

function mockPaddleReturning(prices: unknown[]) {
  getPaddleServer.mockReturnValue({
    prices: { list: () => ({ next: async () => prices }) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isPaddleServerConfigured.mockReturnValue(true);
});

describe("formatMoney", () => {
  it("renders whole amounts without trailing zeros", () => {
    expect(formatMoney("7900", "USD")).toBe("$79");
  });

  it("keeps the cents when an amount is not whole", () => {
    expect(formatMoney("1999", "USD")).toBe("$19.99");
  });

  it("respects currencies that have no minor unit", () => {
    // JPY has 0 decimal places -- dividing by 100 would be wrong.
    expect(formatMoney("5000", "JPY")).toBe("¥5,000");
  });
});

describe("toResolvedPrice", () => {
  it("reports a recurring price as a subscription with its interval", () => {
    const resolved = toResolvedPrice(paddlePrice() as never);

    expect(resolved).toMatchObject({
      priceId: "pri_starter",
      amount: 79,
      currency: "USD",
      formatted: "$79",
      interval: "month",
      frequency: 1,
      isSubscription: true,
      isActive: true,
    });
  });

  it("reports a price with no billing cycle as one-time", () => {
    const resolved = toResolvedPrice(paddlePrice({ billingCycle: null }) as never);

    expect(resolved.isSubscription).toBe(false);
    expect(resolved.interval).toBeNull();
  });

  it("flags an archived price as inactive so the UI can refuse to sell it", () => {
    const resolved = toResolvedPrice(paddlePrice({ status: "archived" }) as never);

    expect(resolved.isActive).toBe(false);
  });
});

describe("loadPrices", () => {
  it("keys the resolved prices by their price ID", async () => {
    mockPaddleReturning([paddlePrice(), paddlePrice({ id: "pri_pro", unitPrice: { amount: "9900", currencyCode: "USD" } })]);

    const prices = await loadPrices(["pri_starter", "pri_pro"]);

    expect(prices.get("pri_starter")?.formatted).toBe("$79");
    expect(prices.get("pri_pro")?.formatted).toBe("$99");
  });

  it("ignores blank IDs rather than asking Paddle for them", async () => {
    const list = vi.fn(() => ({ next: async () => [] }));
    getPaddleServer.mockReturnValue({ prices: { list } });

    await loadPrices(["pri_starter", "", "   "]);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ id: ["pri_starter"] }));
  });

  it("returns an empty map when no IDs are configured, without calling Paddle", async () => {
    mockPaddleReturning([paddlePrice()]);

    expect((await loadPrices([])).size).toBe(0);
    expect(getPaddleServer).not.toHaveBeenCalled();
  });

  it("returns an empty map when Paddle is not configured", async () => {
    isPaddleServerConfigured.mockReturnValue(false);

    expect((await loadPrices(["pri_starter"])).size).toBe(0);
    expect(getPaddleServer).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the Paddle call fails", async () => {
    // A pricing page must still render if Paddle is down; it falls back to
    // hiding the amount rather than taking the whole route down.
    getPaddleServer.mockReturnValue({
      prices: {
        list: () => ({
          next: async () => {
            throw new Error("paddle is down");
          },
        }),
      },
    });

    expect((await loadPrices(["pri_starter"])).size).toBe(0);
  });
});

describe("describeBillingCycle", () => {
  it("renders a once-per-interval subscription compactly", () => {
    expect(describeBillingCycle(toResolvedPrice(paddlePrice() as never))).toBe("/month");
  });

  it("spells out a multi-interval cycle", () => {
    const price = paddlePrice({ billingCycle: { interval: "month", frequency: 3 } });
    expect(describeBillingCycle(toResolvedPrice(price as never))).toBe("every 3 months");
  });

  it("calls a price with no billing cycle one-time", () => {
    const price = paddlePrice({ billingCycle: null });
    expect(describeBillingCycle(toResolvedPrice(price as never))).toBe("one-time");
  });
});
