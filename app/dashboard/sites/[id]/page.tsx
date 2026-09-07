import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite, hasReceivedEvents } from "@/libs/webstats/sites";
import { snippetVariants } from "@/libs/webstats/snippet";
import { parseRange } from "@/libs/webstats/range";
import { getSiteStats } from "@/libs/webstats/stats";
import SiteStatsPanel from "@/components/dashboard/SiteStatsPanel";
import SiteTopicsPanel from "@/components/dashboard/SiteTopicsPanel";
import { getSiteTopics } from "@/libs/webstats/site-topics";
import { getProfileAccess } from "@/libs/access";
import { planForAccess } from "@/libs/plans";
import InstallSnippet from "@/components/dashboard/InstallSnippet";
import DeleteSiteButton from "@/components/dashboard/DeleteSiteButton";

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
  const user = await requireUser();

  const { id } = await params;
  const range = parseRange((await searchParams).range);
  const site = await getSite(id);

  if (!site) {
    notFound();
  }

  const installed = await hasReceivedEvents(site.id);

  // Only queried once there is something to query. Before the first beacon the
  // install snippet is the whole page, and an empty report competing with it
  // just adds noise to the one step that matters.
  const stats = installed ? await getSiteStats(site.id, range) : null;

  const access = await getProfileAccess(user.id);
  const plan = planForAccess(access?.has_access ?? false);
  const topics = installed ? await getSiteTopics(site.id, plan) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/dashboard/sites" className="text-sm text-muted hover:text-foreground">
          ← Analytics
        </Link>
        <h1 className="section-heading text-3xl font-extrabold">{site.name}</h1>
        <p className="text-muted">{site.domain}</p>
      </div>

      <InstallSnippet
        siteId={site.id}
        variants={snippetVariants(site.id)}
        initiallyInstalled={installed}
      />

      {stats ? (
        <>
          <SiteStatsPanel siteId={site.id} range={range} stats={stats} />
          <SiteTopicsPanel topics={topics} domain={site.domain} />
        </>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="section-heading text-lg font-extrabold">No data yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Install the snippet above and your first visitor will show up here.
          </p>
        </section>
      )}

      {/* Last, and visually quiet. A destructive control competing with the
          install steps would be the loudest thing on a page whose job is
          getting someone set up. */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <DeleteSiteButton siteId={site.id} domain={site.domain} />
      </section>
    </div>
  );
}
