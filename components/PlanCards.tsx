import { Check } from "lucide-react";
import ButtonCheckout from "@/components/ButtonCheckout";
import { configuredProPrices } from "@/libs/plans";
import { describeBillingCycle, type PriceRecord } from "@/libs/paddle/prices";
import { cn } from "@/libs/cn";

const FREE_FEATURES = [
  "The full ranked feed",
  "12 personalised trends, 6 rising fast",
  "Follow up to 3 topics",
  "Source evidence on every trend you can see",
];

const PRO_FEATURES = [
  "Everything in Free, plus:",
  "The top-scoring trends unlocked",
  "24 personalised trends, 12 rising fast",
  "Unlimited follows",
  "All 12 categories",
];

/** Amounts are read from Paddle at render time. A hardcoded price string drifts
 *  the moment it is edited in the dashboard, and the customer is charged
 *  Paddle's number, not ours — so the fallback label is only used when the
 *  live price could not be read. */
export default function PlanCards({
  prices,
  source = "landing",
}: {
  prices: PriceRecord;
  source?: "landing" | "dashboard";
}) {
  const proPrices = configuredProPrices();

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
        <h3 className="text-lg font-bold">Free</h3>
        <p className="mt-1 text-sm text-muted">
          Enough to see whether the signal is real.
        </p>
        <p className="mt-6 text-4xl font-extrabold tracking-tight">$0</p>
        <ul className="mt-6 space-y-3 text-sm">
          {FREE_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border-2 border-primary bg-card p-8 shadow-[0_20px_40px_-24px_rgba(225,101,64,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Pro</h3>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            The early stages
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          See it while it&apos;s still cheap to act on.
        </p>

        <div className="mt-6 space-y-4">
          {proPrices.map((planPrice) => {
            const live = prices[planPrice.priceId];
            const cycle = live ? describeBillingCycle(live) : null;
            const sellable = !live || live.isActive;

            if (!sellable) return null;

            return (
              <div key={planPrice.priceId} className="space-y-2">
                <p className="text-2xl font-extrabold tracking-tight">
                  {live?.formatted ?? planPrice.fallbackLabel}
                  {cycle && (
                    <span className="ml-1 text-sm font-medium text-muted">
                      {cycle}
                    </span>
                  )}
                </p>
                <ButtonCheckout
                  priceId={planPrice.priceId}
                  source={source}
                  label={
                    planPrice.cycle === "annual"
                      ? "Go Pro annually — 2 months free"
                      : "Go Pro monthly"
                  }
                  extraStyle={cn("w-full justify-center")}
                />
              </div>
            );
          })}

          {proPrices.length === 0 && (
            <p className="text-sm text-muted">
              Pricing is being finalised — check back shortly.
            </p>
          )}
        </div>

        <ul className="mt-7 space-y-3 text-sm">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
