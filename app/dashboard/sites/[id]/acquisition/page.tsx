import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite } from "@/libs/webstats/sites";
import { getAcquisitionSummary, getAcquisitionBreakdowns } from "@/libs/webstats/acquisition";
import { listRecentVisitors } from "@/libs/webstats/journey";
import { RANGES, parseRange } from "@/libs/webstats/range";
import { formatCount } from "@/libs/webstats/format";
import BreakdownCard from "@/components/dashboard/BreakdownCard";
import SiteSectionNav from "@/components/dashboard/SiteSectionNav";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Acquisition",
  description: "Where visitors come from, and what they do once they arrive.",
  robots: { index: false, follow: false },
});

export default async function AcquisitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const range = parseRange((await searchParams).range);
  const now = new Date();
  const from = range.startAt(now);

  const [summary, breakdowns, visitors] = await Promise.all([
    getAcquisitionSummary(id, from, now),
    getAcquisitionBreakdowns(id, from, now),
    listRecentVisitors(id, 15),
  ]);

  const stats = [
    { label: "Unique visitors", value: formatCount(summary.uniqueVisitors) },
    { label: "Sessions", value: formatCount(summary.sessions) },
    { label: "Pageviews", value: formatCount(summary.pageviews) },
    { label: "Events", value: formatCount(summary.events) },
    {
      label: "New vs. returning",
      value: `${formatCount(summary.newVisitors)} / ${formatCount(summary.returningVisitors)}`,
    },
    {
      label: "Identified vs. anonymous",
      value: `${formatCount(summary.identifiedSessions)} / ${formatCount(summary.anonymousSessions)}`,
    },
  ];

  const toValueRows = (rows: { label: string; sessions: number }[]) =>
    rows.map((r) => ({ label: r.label, value: r.sessions }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/dashboard/sites/${id}`}
            className="text-sm text-muted hover:text-foreground"
          >
            ← {site.name}
          </Link>
          <h1 className="section-heading text-3xl font-extrabold">Acquisition</h1>
          <p className="max-w-2xl text-muted">
            Session-level source data — requires the identity SDK (visitor
            cookie, sessions, identify) to be active on this site.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.values(RANGES).map((r) => (
            <Link
              key={r.key}
              href={`/dashboard/sites/${id}/acquisition?range=${r.key}`}
              className={
                r.key === range.key
                  ? "rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                  : "rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
              }
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <SiteSectionNav siteId={id} active="acquisition" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-2xl font-extrabold tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="Channel"
          unit="sessions"
          rows={toValueRows(breakdowns.channel)}
          empty="No sessions in this range."
        />
        <BreakdownCard
          title="Source"
          unit="sessions"
          rows={toValueRows(breakdowns.source)}
          empty="No sessions in this range."
        />
        <BreakdownCard
          title="Medium"
          unit="sessions"
          rows={toValueRows(breakdowns.medium)}
          empty="No sessions in this range."
        />
        <BreakdownCard
          title="Campaign"
          unit="sessions"
          rows={toValueRows(breakdowns.campaign)}
          empty="No campaigns in this range."
        />
        <BreakdownCard
          title="Referrer"
          unit="sessions"
          rows={toValueRows(breakdowns.referrer)}
          empty="No referrals in this range."
        />
        <BreakdownCard
          title="Landing page"
          unit="sessions"
          rows={toValueRows(breakdowns.landingPage)}
          empty="No sessions in this range."
        />
        <BreakdownCard
          title="Country"
          unit="sessions"
          rows={toValueRows(breakdowns.country)}
          empty="No sessions in this range."
          kind="country"
        />
        <BreakdownCard
          title="Browser"
          unit="sessions"
          rows={toValueRows(breakdowns.browser)}
          empty="No sessions in this range."
          kind="browser"
        />
      </div>

      <div className="space-y-3">
        <h2 className="section-heading text-lg font-extrabold">Recent visitors</h2>

        {visitors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
            No visitors recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {visitors.map((visitor) => (
              <li key={visitor.visitorId}>
                <Link
                  href={`/dashboard/sites/${id}/visitors/${visitor.visitorId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {visitor.userIds[0] ?? "Anonymous visitor"}
                    </p>
                    <p className="text-xs text-muted">
                      First touch: {visitor.firstTouch.channel} ({visitor.firstTouch.source})
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    Last seen {new Date(visitor.lastSeenAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
