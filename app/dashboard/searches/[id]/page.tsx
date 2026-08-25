import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { getSEOTags } from "@/libs/seo";
import CheckCard, { type CheckRow } from "@/components/dashboard/CheckCard";
import VerdictBadge from "@/components/dashboard/VerdictBadge";
import type { Verdict } from "@/libs/scoring/verdict";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Name report",
  description: "What we found for your candidate names.",
});

type CandidateRow = {
  id: string;
  name: string;
  rationale: string | null;
  verdict: Verdict | null;
  score: number | null;
  explanation: string | null;
  checks: CheckRow[];
};

/** Worst verdict first: the names a user must rule out are the ones they need
 *  to see, and burying them under the clear ones wastes the report. */
const VERDICT_ORDER: Record<string, number> = {
  clear: 0,
  contested: 1,
  unknown: 2,
  blocked: 3,
};

export default async function SearchReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  // RLS scopes all three reads to the signed-in user, so a search belonging to
  // someone else simply returns nothing rather than needing an ownership check.
  const { data: search } = await supabase
    .from("searches")
    .select("id, status, idea_text, target_platform, credits_spent, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!search) {
    notFound();
  }

  const { data: candidates } = await supabase
    .from("candidates")
    .select(
      "id, name, rationale, verdict, score, explanation, checks(platform, status, signals, verdict, strength, evidence_url, error)"
    )
    .eq("search_id", id)
    .order("created_at", { ascending: true });

  const rows = ((candidates ?? []) as unknown as CandidateRow[])
    .slice()
    .sort(
      (a, b) =>
        (VERDICT_ORDER[a.verdict ?? "unknown"] ?? 2) -
        (VERDICT_ORDER[b.verdict ?? "unknown"] ?? 2)
    );
  const refunded = rows.filter((c) =>
    c.checks.some((check) => check.status !== "ok")
  ).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
          Name report
        </h1>
        {search.idea_text && (
          <p className="text-muted">“{search.idea_text}”</p>
        )}
        <p className="text-sm text-muted">
          {rows.length} {rows.length === 1 ? "name" : "names"} checked ·{" "}
          {search.credits_spent} {search.credits_spent === 1 ? "credit" : "credits"} spent
          {refunded > 0 && (
            <>
              {" "}·{" "}
              <span className="font-semibold text-foreground">
                {refunded} refunded
              </span>{" "}
              because a check could not be completed
            </>
          )}
        </p>
      </div>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
        Verdicts are computed from the checks below, which you can open and
        read yourself. “Could not confirm” means a check did not complete — it
        never means a name is free. None of this is legal advice.
      </p>

      <div className="space-y-6">
        {rows.map((candidate) => (
          <section key={candidate.id} className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight">{candidate.name}</h2>
                {candidate.verdict && <VerdictBadge verdict={candidate.verdict} />}
              </div>
              <p className="text-sm text-muted">
                {candidate.explanation ?? candidate.rationale}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {candidate.checks
                .slice()
                .sort((a, b) => a.platform.localeCompare(b.platform))
                .map((check) => (
                  <CheckCard key={check.platform} check={check} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
