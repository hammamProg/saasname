import { notFound } from "next/navigation";
import { requireUser } from "@/libs/supabase/require-user";
import { getProfileAccess } from "@/libs/access";
import { planForAccess } from "@/libs/plans";
import { lockedTopicIds } from "@/libs/trends/locked-topics";
import { getTopicDetail } from "@/libs/trends/topic-detail";
import { getSEOTags } from "@/libs/seo";
import LockedTrendNotice from "@/components/dashboard/LockedTrendNotice";

const STAGE_LABELS: Record<string, string> = {
  early_signal: "Early signal",
  emerging: "Emerging",
  accelerating: "Accelerating",
  established: "Established",
  cooling: "Cooling",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getTopicDetail(slug);

  // Metadata is rendered before the access check, so a locked trend's name
  // would otherwise leak through the page title.
  if (detail) {
    const locked = await lockedTopicIds("free");
    if (locked.has(detail.id)) {
      return getSEOTags({
        title: "Locked trend",
        description: "One of the strongest trends right now.",
        canonicalUrlRelative: `/dashboard/trends/${slug}`,
      });
    }
  }

  return getSEOTags({
    title: detail?.name ?? "Trend",
    description: detail?.description ?? "Trend detail",
    canonicalUrlRelative: `/dashboard/trends/${slug}`,
  });
}

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const detail = await getTopicDetail(slug);

  if (!detail) {
    notFound();
  }

  // The feed redacts locked trends, but a slug can still be guessed or shared,
  // so the gate is enforced here too rather than only at the list level.
  const access = await getProfileAccess(user.id);
  const plan = planForAccess(access?.has_access ?? false);
  const locked = await lockedTopicIds(plan);

  if (locked.has(detail.id)) {
    return <LockedTrendNotice />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {STAGE_LABELS[detail.stage] ?? detail.stage}
        </span>
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">{detail.name}</h1>
        {detail.description && <p className="text-muted">{detail.description}</p>}
      </div>

      {detail.whyTrending && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Why it&apos;s trending</h2>
          <p className="mt-2 text-sm text-muted">{detail.whyTrending}</p>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Activity</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {detail.snapshots.map((snapshot) => (
            <li key={snapshot.snapshotDate}>
              {snapshot.snapshotDate}: {snapshot.signalCount} signals (momentum{" "}
              {snapshot.momentum >= 0 ? "+" : ""}
              {snapshot.momentum})
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Source evidence</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {detail.evidence.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {item.title}
              </a>{" "}
              <span className="text-muted">— {item.source}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
