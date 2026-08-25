import { ShieldCheck, Sparkles } from "lucide-react";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import config from "@/config";
import { getPriceRecord } from "@/libs/paddle/prices";
import MarketingBackdrop from "@/components/ui/MarketingBackdrop";

export default async function Pricing() {
  const prices = await getPriceRecord(
    config.pricing.plans.map((plan) => plan.priceId)
  );

  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      <MarketingBackdrop variant="section" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles size={14} />
            Simple pricing
          </div>
          <h2 className="section-heading mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            Pay once. Ship forever.
          </h2>
          <p className="mt-4 text-lg text-muted">
            Lifetime access to the boilerplate, launchpad setup guide, and integrations — no
            recurring subscription.
          </p>
        </div>

        <SubscriptionPlans variant="landing" prices={prices} />

        <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            Secure checkout via Paddle
          </span>
          <span>·</span>
          <span>Sandbox test card: 4242 4242 4242 4242</span>
        </div>
      </div>
    </section>
  );
}
