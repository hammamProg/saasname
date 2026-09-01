import { requireUser } from "@/libs/supabase/require-user";
import { getCreditBalance } from "@/libs/credits/balance";
import { getSEOTags } from "@/libs/seo";
import CreditPacks from "@/components/CreditPacks";
import PurchaseTracker from "@/components/dashboard/PurchaseTracker";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Credits",
  description: "Buy search credits.",
  canonicalUrlRelative: "/dashboard/credits",
});

type CreditsPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const balance = await getCreditBalance(user.id);
  const checkoutSucceeded = params.checkout === "success";

  return (
    <div className="space-y-8">
      {checkoutSucceeded && <PurchaseTracker />}
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Credits
        </h1>
        {checkoutSucceeded && (
          <p className="rounded-lg bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
            Purchase complete — your credits have been added.
          </p>
        )}
        <p className="text-muted">
          You have <strong className="text-foreground">{balance}</strong>{" "}
          {balance === 1 ? "credit" : "credits"}. One credit validates one name
          across every platform.
        </p>
      </div>

      <CreditPacks />
    </div>
  );
}
