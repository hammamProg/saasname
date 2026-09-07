import Link from "next/link";
import { getProfileAccess } from "@/libs/access";
import { limitsForPlan, planForAccess } from "@/libs/plans";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { listSites } from "@/libs/webstats/sites";
import SiteFavicon from "@/components/dashboard/SiteFavicon";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Analytics",
  description: "Traffic for the websites you track.",
  canonicalUrlRelative: "/dashboard/sites",
});

export default async function SitesPage() {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);
  const limits = limitsForPlan(planForAccess(access?.has_access ?? false));

  const sites = await listSites();
  const atLimit =
    limits.siteLimit !== null && sites.length >= limits.siteLimit;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
            Analytics
          </h1>
          <p className="max-w-2xl text-muted">
            Add a script tag to your site and see who visits, where they come
            from, and which trends your traffic is touching.
          </p>
        </div>

        {sites.length > 0 && !atLimit ? (
          <Link href="/dashboard/sites/new" className="btn-gradient px-5 py-2.5 text-sm">
            Add website
          </Link>
        ) : null}
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="section-heading text-xl font-extrabold">
            Track your first website
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            One script tag, no cookies, no consent banner. You will see your
            first visitor within seconds of installing it.
          </p>
          <Link
            href="/dashboard/sites/new"
            className="btn-gradient mt-6 inline-block px-6 py-3 text-sm"
          >
            Add website
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={`/dashboard/sites/${site.id}`}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <SiteFavicon domain={site.domain} size={28} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {site.name}
                    </p>
                    <p className="truncate text-sm text-muted">{site.domain}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {atLimit && sites.length > 0 ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
          You are tracking {sites.length} of {limits.siteLimit} websites.{" "}
          <Link href="/dashboard/billing" className="font-semibold text-primary">
            Upgrade
          </Link>{" "}
          to add more.
        </p>
      ) : null}
    </div>
  );
}
