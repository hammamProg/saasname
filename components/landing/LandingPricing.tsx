import { getPriceRecord } from "@/libs/paddle/prices";
import { configuredProPrices } from "@/libs/plans";
import { SectionHeader } from "@/components/landing/shared";
import PlanCards from "@/components/PlanCards";

export default async function LandingPricing() {
  const prices = await getPriceRecord(
    configuredProPrices().map((price) => price.priceId)
  );

  return (
    <section id="pricing" className="relative bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="Pricing"
          title="Free gets you the feed. Pro gets you the best of it."
          subtitle="Start free with the full ranked list and real evidence. Upgrade to unlock the highest-scoring trends — the ones worth moving on first."
          className="mb-14"
        />

        <PlanCards prices={prices} source="landing" />

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted">
          Month to month, cancel anytime. Source evidence is never paywalled on
          any plan.
        </p>
      </div>
    </section>
  );
}
