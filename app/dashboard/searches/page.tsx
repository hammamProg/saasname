import Link from "next/link";
import { FileSearch } from "lucide-react";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { getSEOTags } from "@/libs/seo";
import ReportsTable, { type ReportRow } from "@/components/dashboard/ReportsTable";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Reports",
  description: "Every name check you have run.",
  canonicalUrlRelative: "/dashboard/searches",
});

export default async function SearchesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("searches")
    .select("id, idea_text, status, credits_spent, created_at, candidates(name, verdict)")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as ReportRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
            Reports
          </h1>
          <p className="text-muted">
            {rows.length === 0
              ? "Every name check you run is kept here."
              : `${rows.length} ${rows.length === 1 ? "report" : "reports"}, newest first.`}
          </p>
        </div>

        <Link
          href="/dashboard/new"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          New check
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <FileSearch size={22} aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-muted">
            No reports yet. Name an idea, or check a name you already have.
          </p>
          <Link
            href="/dashboard/new"
            className="btn-primary mt-1 rounded-xl px-4 py-2 text-sm font-bold"
          >
            New name check
          </Link>
        </div>
      ) : (
        <ReportsTable rows={rows} />
      )}
    </div>
  );
}
