import { Suspense } from "react";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { getPriceRecord } from "@/libs/paddle/prices";
import { getCreditPacks } from "@/libs/credits/packs";
import { getSEOTags } from "@/libs/seo";
import DashboardAccess from "@/components/DashboardAccess";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import GenerateForm from "@/components/dashboard/GenerateForm";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentReports, {
  type RecentReport,
} from "@/components/dashboard/RecentReports";
import EmptyStateGuide from "@/components/dashboard/EmptyStateGuide";
import { getCreditBalance } from "@/libs/credits/balance";

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

  // Counted server-side rather than derived from the fetched page: totals taken
  // from a `limit`ed list silently stop growing once the user passes the limit.
  // RLS scopes all three to this user.
  const [{ data: searchRows }, reportCount, nameCount, clearCount, credits] =
    await Promise.all([
      supabase
        .from("searches")
        .select("id, idea_text, status, created_at, candidates(name, verdict)")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("searches").select("id", { count: "exact", head: true }),
      supabase.from("candidates").select("id", { count: "exact", head: true }),
      supabase
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("verdict", "clear"),
      getCreditBalance(user.id),
    ]);

  const reports = (searchRows ?? []) as unknown as RecentReport[];

  const stats = {
    credits,
    reports: reportCount.count ?? 0,
    namesChecked: nameCount.count ?? 0,
    namesClear: clearCount.count ?? 0,
  };

  return (
    <div className="space-y-8">
      <DashboardOverview displayName={displayName} hasReports={stats.reports > 0} />
      <DashboardStats stats={stats} />
      <GenerateForm />
      {reports.length > 0 ? (
        <RecentReports reports={reports} />
      ) : (
        <EmptyStateGuide />
      )}
    </div>
  );
}
