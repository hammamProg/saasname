import Link from "next/link";
import { notFound } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { getSite, hasReceivedEvents } from "@/libs/webstats/sites";
import { snippetVariants } from "@/libs/webstats/snippet";
import InstallSnippet from "@/components/dashboard/InstallSnippet";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Website analytics",
  description: "Traffic for one of your websites.",
  robots: { index: false, follow: false },
});

export default async function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const site = await getSite(id);

  if (!site) {
    notFound();
  }

  const installed = await hasReceivedEvents(site.id);

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

      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="section-heading text-lg font-extrabold">
          {installed ? "Building your first report" : "No data yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {installed
            ? "Traffic is arriving. Visitor and pageview reporting lands with the next release."
            : "Install the snippet above and your first visitor will show up here."}
        </p>
      </section>
    </div>
  );
}
