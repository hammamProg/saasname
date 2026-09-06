import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { getPriceRecord } from "@/libs/paddle/prices";
import { configuredProPrices, planForAccess } from "@/libs/plans";
import { getSEOTags } from "@/libs/seo";
import PlanCards from "@/components/PlanCards";
import PurchaseTracker from "@/components/dashboard/PurchaseTracker";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Billing",
  description: "Your plan.",
  canonicalUrlRelative: "/dashboard/billing",
});

type BillingPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const access = await getProfileAccess(user.id);
  const plan = planForAccess(access?.has_access ?? false);
  const prices = await getPriceRecord(
    configuredProPrices().map((price) => price.priceId)
  );
  const checkoutSucceeded = params.checkout === "success";

  return (
    <div className="space-y-8">
      {checkoutSucceeded && <PurchaseTracker />}

      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Billing
        </h1>
        <p className="text-muted">
          {plan === "pro"
            ? "You're on Pro — every stage, the full feed, unlimited follows."
            : "You're on Free. Upgrade to see trends while they're still early."}
        </p>
      </div>

      {plan === "pro" && access?.current_period_end && (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">
          Your plan renews on{" "}
          {new Date(access.current_period_end).toLocaleDateString()}.
        </p>
      )}

      <PlanCards prices={prices} source="dashboard" />
    </div>
  );
}
