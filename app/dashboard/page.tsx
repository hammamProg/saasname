import { Suspense } from "react";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { getPriceRecord } from "@/libs/paddle/prices";
import { getCreditPacks } from "@/libs/credits/packs";
import { getSEOTags } from "@/libs/seo";
import DashboardAccess from "@/components/DashboardAccess";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import CreditBalance from "@/components/CreditBalance";
import GenerateForm from "@/components/dashboard/GenerateForm";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Dashboard",
  description: "Your SaaSNa.me workspace.",
  canonicalUrlRelative: "/dashboard",
});

type DashboardPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: profile }, access, prices] = await Promise.all([
    supabase.from("profiles").select("email").eq("id", user.id).maybeSingle(),
    getProfileAccess(user.id),
    getPriceRecord(getCreditPacks().map((pack) => pack.priceId)),
  ]);

  const metadata = user.user_metadata as {
    full_name?: string;
    name?: string;
  };
  const displayName = metadata.full_name ?? metadata.name ?? "there";
  const hasAccess = access?.has_access ?? false;
  const checkoutSuccess = params.checkout === "success";
  const email = profile?.email ?? user.email ?? "";

  if (!hasAccess || checkoutSuccess) {
    return (
      <div className="space-y-8">
        <section className="space-y-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {checkoutSuccess ? "Checkout complete" : "Billing"}
            </p>
            <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
              {checkoutSuccess ? "Almost there…" : `Hi, ${displayName}`}
            </h1>
            <p className="text-muted">Signed in as {email}</p>
          </div>

          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
                Loading checkout…
              </div>
            }
          >
            <DashboardAccess
              initialHasAccess={hasAccess}
              initialAccess={access}
              displayName={displayName}
              prices={prices}
            />
          </Suspense>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardOverview displayName={displayName} />
      <GenerateForm />
      <CreditBalance userId={user.id} />
    </div>
  );
}
