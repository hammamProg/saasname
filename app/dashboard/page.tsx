import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { planForAccess } from "@/libs/plans";
import { getUserPreferences } from "@/libs/trends/preferences";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";
import { getSEOTags } from "@/libs/seo";
import CategoryPicker from "@/components/dashboard/CategoryPicker";
import TrendCard from "@/components/dashboard/TrendCard";
import UpgradeCallout from "@/components/dashboard/UpgradeCallout";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Your trends",
  description: "Trends worth building on.",
  canonicalUrlRelative: "/dashboard",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);

  if (!preferences) {
    return <CategoryPicker />;
  }

  const access = await getProfileAccess(user.id);
  const plan = planForAccess(access?.has_access ?? false);

  const [forYou, risingFast] = await Promise.all([
    getForYouFeed(user.id, preferences.selectedCategories, plan),
    getRisingFastFeed(user.id, plan),
  ]);

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Worth building on
        </h1>
        <p className="max-w-2xl text-muted">
          Ranked by how strong the signal is right now. Each one is a candidate
          for a new product — or a feature in the one you already have.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="section-heading text-2xl font-extrabold">
            In your categories
          </h2>
          <span className="text-xs text-muted">Strongest first</span>
        </div>

        {forYou.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-muted">
            Nothing published in your categories yet. The pipeline scores trends
            nightly — check back soon, or widen your interests.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forYou.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        )}
      </section>

      {risingFast.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="section-heading text-2xl font-extrabold">
              Rising fast
            </h2>
            <span className="text-xs text-muted">Outside your categories</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {risingFast.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </section>
      )}

      {plan === "free" && <UpgradeCallout />}
    </div>
  );
}
