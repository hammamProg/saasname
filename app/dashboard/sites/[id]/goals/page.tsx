import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite } from "@/libs/webstats/sites";
import { listGoals } from "@/libs/webstats/goals";
import GoalForm from "@/components/dashboard/GoalForm";
import DeleteGoalButton from "@/components/dashboard/DeleteGoalButton";
import SiteSectionNav from "@/components/dashboard/SiteSectionNav";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Goals",
  description: "Conversion goals for one of your websites.",
  robots: { index: false, follow: false },
});

const DEDUPE_LABEL: Record<string, string> = {
  every: "Every occurrence",
  once_per_session: "Once per session",
  once_per_visitor: "Once per visitor",
};

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const goals = await listGoals(id);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href={`/dashboard/sites/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {site.name}
        </Link>
        <h1 className="section-heading text-3xl font-extrabold">Goals</h1>
        <p className="max-w-2xl text-muted">
          Call <code>analytics.goal(&quot;key&quot;, {"{"} ... {"}"})</code> from the
          snippet to record a completion. Each one is stored with an
          attribution snapshot — first-touch, session source, last-touch and
          last non-direct source — that never changes after the fact.
        </p>
      </div>

      <SiteSectionNav siteId={id} active="goals" />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="section-heading text-lg font-extrabold">New goal</h2>
        <div className="mt-4">
          <GoalForm siteId={id} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="section-heading text-lg font-extrabold">
          Configured goals
        </h2>

        {goals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
            No goals yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{goal.name}</p>
                  <p className="text-xs text-muted">
                    <code>{goal.key}</code> · {goal.type} ·{" "}
                    {DEDUPE_LABEL[goal.dedupe] ?? goal.dedupe}
                  </p>
                </div>
                <DeleteGoalButton siteId={id} goalId={goal.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
