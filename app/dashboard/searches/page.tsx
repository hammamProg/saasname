import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { getSEOTags } from "@/libs/seo";
import VerdictBadge from "@/components/dashboard/VerdictBadge";
import type { Verdict } from "@/libs/scoring/verdict";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Your reports",
  description: "Every name check you have run.",
  canonicalUrlRelative: "/dashboard/searches",
});

type SearchRow = {
  id: string;
  idea_text: string | null;
  status: string;
  credits_spent: number;
  created_at: string;
  candidates: Array<{ name: string; verdict: Verdict | null }>;
};

export default async function SearchesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("searches")
    .select("id, idea_text, status, credits_spent, created_at, candidates(name, verdict)")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as SearchRow[];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Your reports
        </h1>
        <p className="text-muted">Every name check you have run.</p>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Search size={24} className="text-muted" aria-hidden="true" />
          <p className="text-sm text-muted">
            No reports yet. Describe an idea on the dashboard to get started.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary rounded-xl px-4 py-2 text-sm font-bold"
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            // Best verdict first so the row leads with the usable name, which
            // is what someone scanning their history is looking for.
            const best = row.candidates
              .filter((c) => c.verdict === "clear")
              .map((c) => c.name);

            return (
              <li key={row.id}>
                <Link
                  href={`/dashboard/searches/${row.id}`}
                  className="card flex flex-col gap-2 p-5 transition-colors hover:border-primary/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {row.idea_text ?? "Direct name check"}
                    </p>
                    <time
                      dateTime={row.created_at}
                      className="shrink-0 text-xs text-muted"
                    >
                      {new Date(row.created_at).toLocaleDateString()}
                    </time>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {row.status !== "complete" && row.status !== "failed" && (
                      <span className="text-xs font-semibold text-primary">
                        Still running…
                      </span>
                    )}
                    {best.length > 0 ? (
                      <>
                        <VerdictBadge verdict="clear" size="sm" />
                        <span className="text-xs text-muted">
                          {best.slice(0, 3).join(", ")}
                          {best.length > 3 ? ` +${best.length - 3}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted">
                        {row.candidates.length}{" "}
                        {row.candidates.length === 1 ? "name" : "names"} checked
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
