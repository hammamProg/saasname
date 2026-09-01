import { requireUser } from "@/libs/supabase/require-user";
import { getUserPreferences } from "@/libs/trends/preferences";
import { getForYouFeed, getRisingFastFeed } from "@/libs/trends/feed";
import { getSEOTags } from "@/libs/seo";
import CategoryPicker from "@/components/dashboard/CategoryPicker";
import TrendCard from "@/components/dashboard/TrendCard";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Discover",
  description: "Your personalized trend radar.",
  canonicalUrlRelative: "/dashboard",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);

  if (!preferences) {
    return (
      <div className="space-y-8">
        <CategoryPicker />
      </div>
    );
  }

  const [forYou, risingFast] = await Promise.all([
    getForYouFeed(user.id, preferences.selectedCategories),
    getRisingFastFeed(user.id),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">For you</h1>
        {forYou.length === 0 ? (
          <p className="text-muted">
            No published trends match your interests yet — check back soon.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forYou.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="section-heading text-2xl font-extrabold">Rising fast</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {risingFast.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </section>
    </div>
  );
}
