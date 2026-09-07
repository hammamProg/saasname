import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import { requireUser } from "@/libs/supabase/require-user";
import { listGroups } from "@/libs/webstats/groups";
import AddSiteForm from "@/components/dashboard/AddSiteForm";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Add a website",
  description: "Start tracking a website.",
  canonicalUrlRelative: "/dashboard/sites/new",
});

export default async function NewSitePage() {
  await requireUser();
  const groups = await listGroups();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="space-y-2">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Analytics
        </Link>
        <h1 className="section-heading text-3xl font-extrabold">Add a website</h1>
        <p className="text-muted">
          You will get an install snippet on the next screen.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <AddSiteForm groups={groups} />
      </div>
    </div>
  );
}
