import { Check, ShieldCheck } from "lucide-react";
import { getPriceRecord, describeBillingCycle } from "@/libs/paddle/prices";
import { getCreditPacks } from "@/libs/credits/packs";
import ButtonCheckout from "@/components/ButtonCheckout";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

const included = [
  "Full source code",
  "Credits never expire",
  "Future updates",
  "Documentation",
  "Production-ready architecture",
  "Payments integration",
  "Authentication system",
  "Email infrastructure",
];

export default async function LandingPricing() {
  const packs = getCreditPacks();
  const plan = packs.find((p) => p.isFeatured) ?? packs[0];

  // No pack has a Paddle price ID configured -- render nothing rather than an
  // empty card with a checkout button that cannot work.
  if (!plan) {
    return null;
  }

  // Live amount and cadence from Paddle -- see components/SubscriptionPlans.tsx.
  const prices = await getPriceRecord([plan.priceId]);
  const price = prices[plan.priceId];

  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      <MarketingBackdrop variant="section" dark />

      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Pricing
          </p>
          <h2 className="section-heading mt-2 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            Everything You Need To Launch
          </h2>
          <p className="mt-4 text-lg text-muted">
            One payment. Credits never expire. No subscription.
          </p>
        </div>

        <article className="relative mt-12 overflow-hidden rounded-3xl border border-brand-cyan/30 bg-black/40 p-8 shadow-2xl shadow-brand-blue/15 backdrop-blur-xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-blue/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-brand-violet/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-end justify-center gap-2">
              {price ? (
                <>
                  <span className="text-6xl font-extrabold tracking-tight">
                    {price.formatted}
                  </span>
                  <div className="pb-2 text-left">
                    <span className="block text-xs font-semibold uppercase text-muted">
                      {price.currency}
                    </span>
                    <span className="block text-sm font-bold text-accent">
                      {price.isSubscription ? describeBillingCycle(price) : "One-time"}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-2xl font-semibold text-muted">
                  Price shown at checkout
                </span>
              )}
            </div>

            <ul className="mt-10 space-y-3.5">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <ButtonCheckout
                label="Start Building Today"
                priceId={plan.priceId}
                source="landing"
                extraStyle="btn-gradient w-full py-4 text-base"
              />
            </div>

            <p className="mt-6 text-center text-sm italic text-muted">
              Every week spent building boilerplate is a week not talking to customers.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-accent" />
              Secure checkout via Paddle
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
