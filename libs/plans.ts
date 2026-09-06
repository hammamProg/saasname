/** Subscription plans for the trend-intelligence product.
 *
 *  The paywall locks the *strongest* trends, not whole stages. Free accounts
 *  still see the full feed and every card's evidence — the top few by trend
 *  score are blurred behind an upgrade. Two reasons:
 *
 *  1. A user who can see what they're missing converts better than one shown
 *     a shorter list, because the value is concrete rather than implied.
 *  2. Gating by lifecycle stage left the free tier literally empty on a fresh
 *     database, since every newly-clustered topic starts at `early_signal`.
 *
 *  Source evidence is never gated at any tier: "no number without a link" is
 *  the product's trust rule, and a paywalled citation is worse than none. */

export type PlanId = "free" | "pro";

export type PlanLimits = {
  /** Trends returned in the personalised "For You" section. */
  forYouLimit: number;
  /** Trends returned in the unfiltered "Rising Fast" section. */
  risingFastLimit: number;
  /** Topics a user may follow. `null` means unlimited. */
  followLimit: number | null;
  /** How many of the highest-scoring trends are locked. 0 means none. */
  lockedTopN: number;
  /** Websites the user may track in the analytics product. `null` means
   *  unlimited. */
  siteLimit: number | null;
  /** Analytics events accepted per calendar month across all of a user's
   *  sites. Over-quota beacons are dropped at ingest rather than rejected: a
   *  traffic spike must never make a customer's install look broken. */
  monthlyEventLimit: number;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    forYouLimit: 12,
    risingFastLimit: 6,
    followLimit: 3,
    lockedTopN: 3,
    siteLimit: 1,
    monthlyEventLimit: 10_000,
  },
  pro: {
    forYouLimit: 24,
    risingFastLimit: 12,
    followLimit: null,
    lockedTopN: 0,
    siteLimit: 10,
    monthlyEventLimit: 1_000_000,
  },
};

export function planForAccess(hasAccess: boolean): PlanId {
  return hasAccess ? "pro" : "free";
}

export function limitsForPlan(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Which topics are locked is resolved against the database, not feed
 *  position: position is per-user, so the same trend could be locked in one
 *  user's feed and reachable by direct URL from another's. Deterministic
 *  "top N published topics by trend_score" is enforceable in both the feed
 *  and the detail page. See libs/trends/locked-topics.ts. */

export type PlanPrice = {
  /** Paddle price id. Empty string means unconfigured — the UI hides it
   *  rather than rendering a checkout button that cannot complete. */
  priceId: string;
  cycle: "monthly" | "annual";
  /** Fallback label only; the real amount is read from Paddle at render time
   *  so it can never drift from what the customer is charged. */
  fallbackLabel: string;
};

export const PRO_PRICES: PlanPrice[] = [
  {
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_MONTHLY?.trim() ?? "",
    cycle: "monthly",
    fallbackLabel: "$29 / month",
  },
  {
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_ANNUAL?.trim() ?? "",
    cycle: "annual",
    fallbackLabel: "$290 / year",
  },
];

export function configuredProPrices(): PlanPrice[] {
  return PRO_PRICES.filter((price) => price.priceId.length > 0);
}
