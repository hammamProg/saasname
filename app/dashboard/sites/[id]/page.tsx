import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite, hasReceivedEvents } from "@/libs/webstats/sites";
import { listGroups } from "@/libs/webstats/groups";
import { snippetVariants } from "@/libs/webstats/snippet";
import { parseRange } from "@/libs/webstats/range";
import { getSiteStats } from "@/libs/webstats/stats";
import { getOnlineVisitors } from "@/libs/webstats/online";
import SiteStatsPanel from "@/components/dashboard/SiteStatsPanel";
import InstallSnippet from "@/components/dashboard/InstallSnippet";
import SiteOptionsMenu from "@/components/dashboard/SiteOptionsMenu";
import SiteFavicon from "@/components/dashboard/SiteFavicon";
import SiteSectionNav from "@/components/dashboard/SiteSectionNav";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Website analytics",
  description: "Traffic for one of your websites.",
  robots: { index: false, follow: false },
});

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const range = parseRange((await searchParams).range);
  const site = await getSite(id);

  if (!site) {
    notFound();
  }

  const [installed, groups] = await Promise.all([
    hasReceivedEvents(site.id),
    listGroups(),
  ]);

  // Only queried once there is something to query. Before the first beacon the
  // install snippet is the whole page, and an empty report competing with it
  // just adds noise to the one step that matters.
  const [stats, online] = installed
    ? await Promise.all([getSiteStats(site.id, range), getOnlineVisitors(site.id)])
    : [null, 0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
            ← Analytics
          </Link>
          <div className="flex items-center gap-3">
            <SiteFavicon domain={site.domain} size={36} />
            <div className="min-w-0">
              <h1 className="section-heading truncate text-3xl font-extrabold">
                {site.name}
              </h1>
              <p className="truncate text-muted">{site.domain}</p>
            </div>
          </div>
        </div>

        {/* Beside the domain, not below the reports: these act on the site as
            a whole, so they belong with its name. */}
        <SiteOptionsMenu
          siteId={site.id}
          domain={site.domain}
          name={site.name}
          variants={snippetVariants(site.id)}
          installed={installed}
          groups={groups}
          groupId={site.groupId}
        />
      </div>

      <SiteSectionNav siteId={id} active="overview" />

      {/* Only while it is still the job. Once a beacon has arrived this moves
          into the options menu; leaving it here would push the reports below
          the fold permanently for a thing you need once. */}
      {installed ? null : (
        <InstallSnippet
          siteId={site.id}
          variants={snippetVariants(site.id)}
          initiallyInstalled={false}
        />
      )}

      {stats ? (
        <SiteStatsPanel siteId={site.id} range={range} stats={stats} online={online} />
      ) : (
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="section-heading text-lg font-extrabold">No data yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Install the snippet above and your first visitor will show up here.
          </p>
        </section>
      )}

    </div>
  );
}
