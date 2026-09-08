import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/libs/supabase";
import config from "@/config";
import { badgeHref, badgeIconUrl } from "@/libs/webstats/badge";
import {
  getEmbedAllowlist,
  isEmbedHostAllowed,
  refererHostname,
} from "@/libs/webstats/embed-domains";
import { getSEOTags } from "@/libs/seo";
import LiveVisitorsCard from "@/components/webstats/LiveVisitorsCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return getSEOTags({
    title: "Live visitors",
    description: "Live visitor widget.",
    canonicalUrlRelative: `/embed/live/${id}`,
    robots: { index: false, follow: false },
  });
}

/** What a customer's `liveEmbedSnippet` iframe actually loads.
 *
 *  Deliberately outside app/dashboard: no session exists on a customer's own
 *  site, so this looks the site up with the admin client rather than the
 *  owner-scoped one — same trust model as the public collection endpoint. A
 *  site id is already public the moment the tracking snippet ships, so
 *  serving its live count here tells a visitor nothing the snippet doesn't
 *  already imply.
 *
 *  The domain is only used to build the badge's UTM-tagged link (matching
 *  the dashboard preview and the credit-link snippet); it's read the same
 *  admin way, not accepted from the caller.
 *
 *  Gated by the Referer header — the only signal a cross-origin iframe load
 *  carries — against the site's own domain plus its allowlist (see
 *  libs/webstats/embed-domains.ts). Anyone can read the site id out of a
 *  pasted snippet, so without this any page could show off another site's
 *  live traffic as its own. A mismatch renders a blocked state rather than
 *  a 404: the site id is real, access to it is what's missing, and the two
 *  read very differently to whoever is trying to debug it. */
export default async function LiveEmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const site = admin
    ? (
        await admin
          .from("webstats_sites")
          .select("id, domain")
          .eq("id", id)
          .is("deleted_at", null)
          .maybeSingle<{ id: string; domain: string }>()
      ).data
    : null;

  if (!site) notFound();

  const referer = (await headers()).get("referer");
  const allowlist = await getEmbedAllowlist(site.id);
  const allowed = isEmbedHostAllowed(refererHostname(referer), site.domain, allowlist);

  if (!allowed) {
    return (
      <div className="flex min-h-full items-start justify-center bg-background p-3">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted">
          This live widget is not enabled for this website.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-start justify-center bg-background p-3">
      <div className="w-full max-w-sm">
        <LiveVisitorsCard
          endpoint={`/api/webstats/embed/${site.id}/live`}
          badge={{
            href: badgeHref(site.domain),
            iconUrl: badgeIconUrl(),
            appName: config.appName,
          }}
        />
      </div>
    </div>
  );
}
