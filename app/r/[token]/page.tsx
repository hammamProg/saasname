import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/libs/supabase/server";
import { getSEOTags } from "@/libs/seo";
import CheckCard, { type CheckRow } from "@/components/dashboard/CheckCard";
import VerdictBadge from "@/components/dashboard/VerdictBadge";
import BrandLogo from "@/components/BrandLogo";
import type { Verdict } from "@/libs/scoring/verdict";

export const dynamic = "force-dynamic";

export const metadata = getSEOTags({
  title: "Shared name report",
  description: "A SaaSNa.me name report shared with you.",
  // Shared links are unlisted, not published. Keeping them out of the index is
  // the difference between "anyone with the link" and "anyone".
  robots: { index: false, follow: false },
});

type CandidateRow = {
  id: string;
  name: string;
  rationale: string | null;
  verdict: Verdict | null;
  explanation: string | null;
  checks: CheckRow[];
};

const VERDICT_ORDER: Record<string, number> = {
  clear: 0,
  contested: 1,
  unknown: 2,
  blocked: 3,
};

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // No auth. RLS exposes only rows that are both public and hold a token, so an
  // unknown or revoked token simply finds nothing.
  const { data: search } = await supabase
    .from("searches")
    .select("id, idea_text, created_at")
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle();

  if (!search) {
    notFound();
  }

  const { data: candidates } = await supabase
    .from("candidates")
    .select(
      "id, name, rationale, verdict, explanation, checks(platform, status, signals, verdict, strength, evidence_url, error)"
    )
    .eq("search_id", search.id)
    .order("created_at", { ascending: true });

  const rows = ((candidates ?? []) as unknown as CandidateRow[])
    .slice()
    .sort(
      (a, b) =>
        (VERDICT_ORDER[a.verdict ?? "unknown"] ?? 2) -
        (VERDICT_ORDER[b.verdict ?? "unknown"] ?? 2)
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="space-y-8">
        <div className="space-y-3">
          <BrandLogo size="md" />
          <h1 className="section-heading text-3xl font-extrabold md:text-4xl">
            Name report
          </h1>
          {search.idea_text && <p className="text-muted">“{search.idea_text}”</p>}
        </div>

        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
          Shared with you. Verdicts are computed from the checks below. “Could
          not confirm” means a check did not complete — it never means a name is
          free. None of this is legal advice.
        </p>

        <div className="space-y-6">
          {rows.map((candidate) => (
            <section key={candidate.id} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight">
                    {candidate.name}
                  </h2>
                  {candidate.verdict && <VerdictBadge verdict={candidate.verdict} />}
                </div>
                <p className="text-sm text-muted">
                  {candidate.explanation ?? candidate.rationale}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted">
            Checked with{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              SaaSNa.me
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
