import { requireUser } from "@/libs/supabase/require-user";
import { getCreditBalance } from "@/libs/credits/balance";
import { getSEOTags } from "@/libs/seo";
import CreditPacks from "@/components/CreditPacks";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Credits",
  description: "Buy search credits.",
  canonicalUrlRelative: "/dashboard/credits",
});

export default async function CreditsPage() {
  const user = await requireUser();
  const balance = await getCreditBalance(user.id);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Credits
        </h1>
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
