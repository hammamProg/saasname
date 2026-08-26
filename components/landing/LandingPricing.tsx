import { Check, ShieldCheck } from "lucide-react";
import config from "@/config";
import { getPriceRecord, describeBillingCycle } from "@/libs/paddle/prices";
import { getCreditPacks } from "@/libs/credits/packs";
import ButtonCheckout from "@/components/ButtonCheckout";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

export default async function LandingPricing() {
  const packs = getCreditPacks();

  // No pack has a Paddle price ID configured -- render nothing rather than an
  // empty card with a checkout button that cannot work.
  if (packs.length === 0) {
    return null;
  }

  // Live amounts and cadence from Paddle -- see components/SubscriptionPlans.tsx.
  const prices = await getPriceRecord(packs.map((pack) => pack.priceId));

  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      <MarketingBackdrop variant="section" dark />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Pricing
          </p>
          <h2 className="section-heading mt-2 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            One Credit Per Name Checked
          </h2>
          <p className="mt-4 text-lg text-muted">
            {config.credits.signupGrant} free searches when you sign up. After
            that, buy a pack — credits never expire and nothing renews.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {packs.map((pack) => {
            const price = prices[pack.priceId];
            const perCredit =
              price && pack.credits > 0
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: price.currency,
                  }).format(price.amount / pack.credits)
                : null;

            return (
              <article
                key={pack.id}
                className={`relative overflow-hidden rounded-3xl border bg-black/40 p-8 backdrop-blur-xl ${
                  pack.isFeatured
                    ? "border-brand-cyan/30 shadow-2xl shadow-brand-blue/15"
                    : "border-white/10"
                }`}
              >
                {pack.isFeatured && (
                  <>
                    <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-blue/20 blur-3xl" />
                    <span className="absolute right-6 top-6 rounded-full bg-brand-blue/20 px-3 py-1 text-xs font-semibold text-accent">
                      Most popular
                    </span>
                  </>
                )}

                <div className="relative">
                  <h3 className="text-lg font-bold">{pack.name}</h3>
                  <p className="mt-1 text-sm text-muted">{pack.description}</p>

                  <div className="mt-6 flex items-end gap-2">
                    {price ? (
                      <>
                        <span className="text-5xl font-extrabold tracking-tight">
                          {price.formatted}
                        </span>
                        <div className="pb-2 text-left">
                          <span className="block text-xs font-semibold uppercase text-muted">
                            {price.currency}
                          </span>
                          <span className="block text-sm font-bold text-accent">
                            {price.isSubscription
                              ? describeBillingCycle(price)
                              : "One-time"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-2xl font-semibold text-muted">
                        Price shown at checkout
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-muted">
                    {pack.credits} credits
                    {perCredit ? ` · ${perCredit} per name` : ""}
                  </p>

                  <ul className="mt-8 space-y-3">
                    {pack.features.map((feature) => (
                      <li key={feature.name} className="flex items-center gap-3 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        {feature.name}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <ButtonCheckout
                      label={`Get ${pack.credits} credits`}
                      priceId={pack.priceId}
                      source="landing"
                      extraStyle={`w-full py-4 text-base ${
                        pack.isFeatured ? "btn-gradient" : "btn-ghost justify-center"
                      }`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} className="text-accent" />
          Secure checkout via Paddle · VAT handled at checkout
        </div>
      </div>
    </section>
  );
}
