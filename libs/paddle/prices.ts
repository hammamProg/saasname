import { cache } from "react";
import type { Price } from "@paddle/paddle-node-sdk";
import { getPaddleServer, isPaddleServerConfigured } from "@/libs/paddle/server";

/** A Paddle price reduced to what the UI needs to render it honestly. */
export type ResolvedPrice = {
  priceId: string;
  /** Amount in major units (79, not 7900). */
  amount: number;
  currency: string;
  /** Localised, e.g. "$79" or "$19.99". */
  formatted: string;
  /** "month" | "year" | ... , or null for a one-time price. */
  interval: string | null;
  frequency: number | null;
  isSubscription: boolean;
  /** False for archived prices -- checkout on these fails. */
  isActive: boolean;
};

/** How many minor units make up one major unit of a currency. JPY has none,
 *  USD has two, so dividing blindly by 100 is wrong. */
function minorUnitDivisor(currency: string): number {
  const digits =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;

  return 10 ** digits;
}

/** Formats a Paddle minor-unit amount, dropping ".00" so $79 does not read
 *  as $79.00 next to a $19.99 sibling. */
export function formatMoney(minorAmount: string, currency: string): string {
  const amount = Number(minorAmount) / minorUnitDivisor(currency);
  const isWhole = Number.isInteger(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: isWhole ? 0 : undefined,
  }).format(amount);
}

export function toResolvedPrice(price: Price): ResolvedPrice {
  const { amount, currencyCode } = price.unitPrice;
  const cycle = price.billingCycle;

  return {
    priceId: price.id,
    amount: Number(amount) / minorUnitDivisor(currencyCode),
    currency: currencyCode,
    formatted: formatMoney(amount, currencyCode),
    interval: cycle?.interval ?? null,
    frequency: cycle?.frequency ?? null,
    isSubscription: !!cycle,
    isActive: price.status === "active",
  };
}

/**
 * Fetches the live prices for the given IDs, keyed by price ID.
 *
 * Prices are read from Paddle rather than hardcoded, because a hardcoded
 * amount silently drifts from what the customer is actually charged the
 * moment anyone edits the price in the Paddle dashboard.
 *
 * Never throws: a pricing page that cannot reach Paddle should render without
 * an amount, not 500.
 */
export async function loadPrices(
  priceIds: string[]
): Promise<Map<string, ResolvedPrice>> {
  const ids = [...new Set(priceIds.map((id) => id.trim()).filter(Boolean))];
  const empty = new Map<string, ResolvedPrice>();

  if (ids.length === 0 || !isPaddleServerConfigured()) {
    return empty;
  }

  try {
    const prices = await getPaddleServer().prices.list({ id: ids }).next();
    return new Map(prices.map((p) => [p.id, toResolvedPrice(p)]));
  } catch (error) {
    console.error(
      "[paddle] Failed to load prices:",
      error instanceof Error ? error.message : error
    );
    return empty;
  }
}

/** Human billing period for a price, e.g. "/month", "every 3 months", or
 *  "one-time". The UI must never assert a cadence the price does not have. */
export function describeBillingCycle(price: ResolvedPrice): string {
  if (!price.isSubscription || !price.interval) {
    return "one-time";
  }

  const frequency = price.frequency ?? 1;
  return frequency === 1
    ? `/${price.interval}`
    : `every ${frequency} ${price.interval}s`;
}

/** Request-deduplicated wrapper; several components may ask for the same
 *  prices while rendering one page. */
export const getPrices = cache(loadPrices);

/** Same data as {@link getPrices}, but a plain object so it can be handed to a
 *  client component as a prop. A Map does not survive the RSC boundary. */
export const getPriceRecord = cache(async function getPriceRecord(
  priceIds: string[]
): Promise<PriceRecord> {
  return Object.fromEntries(await loadPrices(priceIds));
});

export type PriceRecord = Record<string, ResolvedPrice>;
