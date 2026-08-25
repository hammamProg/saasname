import { Check } from "lucide-react";
import config from "@/config";
import ButtonCheckout from "@/components/ButtonCheckout";
import { cn } from "@/libs/cn";
import { describeBillingCycle, type PriceRecord } from "@/libs/paddle/prices";

type SubscriptionPlansProps = {
  variant?: "landing" | "dashboard";
  /** Live Paddle prices keyed by price ID, resolved by the server. */
  prices: PriceRecord;
};

export default function SubscriptionPlans({
  variant = "landing",
  prices,
}: SubscriptionPlansProps) {
  const gridClass =
    variant === "dashboard"
      ? "grid gap-6 lg:grid-cols-2"
      : "mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2";

  return (
    <div className={gridClass}>
      {config.pricing.plans.map((plan) => {
        const price = prices[plan.priceId];
        const cycle = price ? describeBillingCycle(price) : null;
        const isOneTime = price ? !price.isSubscription : false;
        // An archived price cannot be checked out, so do not offer it.
        const sellable = !price || price.isActive;

        return (
          <article
            key={plan.name}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300",
              plan.isFeatured
                ? "border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/20 lg:scale-[1.02]"
                : "border-border hover:border-primary/25 hover:shadow-md"
            )}
          >
            {plan.isFeatured && (
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Best value
              </span>
            )}

            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
              <p className="text-sm text-muted">{plan.description}</p>
            </div>

            <div className="mt-8 flex items-end gap-2">
              {price ? (
                <>
                  {plan.priceAnchor && (
                    <span className="pb-1 text-lg text-muted line-through">
                      ${plan.priceAnchor}
                    </span>
                  )}
                  <span className="text-5xl font-extrabold tracking-tight">
                    {price.formatted}
                  </span>
                  <div className="pb-1">
                    <span className="block text-xs font-semibold uppercase text-muted">
                      {price.currency}
                    </span>
                    <span className="block text-xs font-bold text-primary">
                      {isOneTime ? "One-time" : cycle}
                    </span>
                  </div>
                </>
              ) : (
                // Paddle unreachable or price not configured. Showing nothing
                // beats showing a number we cannot stand behind.
                <span className="text-lg font-semibold text-muted">
                  Price shown at checkout
                </span>
              )}
            </div>

            <ul className="mt-8 flex-1 space-y-3.5">
              {plan.features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {sellable ? (
                <ButtonCheckout
                  extraStyle="w-full shadow-md shadow-primary/20"
                  priceId={plan.priceId}
                  label={`Get ${plan.name}`}
                  source={variant}
                />
              ) : (
                <p className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-muted">
                  Currently unavailable
                </p>
              )}
            </div>

            {price && (
              <p className="mt-3 text-center text-xs text-muted">
                {isOneTime
                  ? "One-time payment"
                  : `Billed ${cycle === "/month" ? "monthly" : cycle}. Cancel anytime.`}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
