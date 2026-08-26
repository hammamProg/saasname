import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/libs/cn";
import type { Verdict } from "@/libs/scoring/verdict";

export type ReportRow = {
  id: string;
  idea_text: string | null;
  status: string;
  credits_spent: number;
  created_at: string;
  candidates: Array<{ name: string; verdict: Verdict | null }>;
};

/** Ordered worst-to-best so the summary leads with what needs attention. */
const VERDICT_ORDER: Verdict[] = ["clear", "contested", "blocked", "unknown"];

const VERDICT_STYLES: Record<Verdict, string> = {
  clear: "bg-verdict-clear/12 text-verdict-clear",
  contested: "bg-verdict-contested/12 text-verdict-contested",
  blocked: "bg-verdict-blocked/12 text-verdict-blocked",
  unknown: "bg-surface text-verdict-unknown",
};

const VERDICT_LABELS: Record<Verdict, string> = {
  clear: "clear",
  contested: "contested",
  blocked: "blocked",
  unknown: "unconfirmed",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Counts rather than a single "best" badge: a report where one name cleared
 *  and three were blocked is not the same as one where all four cleared, and
 *  the old list rendered both as "clear". */
function summarise(candidates: ReportRow["candidates"]) {
  const counts = new Map<Verdict, number>();

  for (const candidate of candidates) {
    const verdict = candidate.verdict ?? "unknown";
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
  }

  return VERDICT_ORDER.filter((verdict) => counts.has(verdict)).map((verdict) => ({
    verdict,
    count: counts.get(verdict) as number,
  }));
}

export default function ReportsTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60">
              <th scope="col" className="w-full px-5 py-3 font-semibold text-muted">
                Report
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-5 py-3 font-semibold text-muted"
              >
                Outcome
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold text-muted">
                Names
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold text-muted">
                Credits
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold text-muted">
                Date
              </th>
              <th scope="col" className="w-10 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const running = row.status !== "complete" && row.status !== "failed";
              const summary = summarise(row.candidates);
              const names = row.candidates.map((c) => c.name).join(", ");

              return (
                <tr
                  key={row.id}
                  className="group relative border-b border-border/60 transition-colors last:border-0 hover:bg-surface/50 focus-within:bg-surface/50"
                >
                  <td className="max-w-0 px-5 py-4">
                    <Link
                      href={`/dashboard/searches/${row.id}`}
                      className="block focus:outline-none"
                    >
                      {/* Stretches the link over the whole row so the entire
                          row is clickable without nesting anchors. */}
                      <span className="absolute inset-0" aria-hidden="true" />
                      <span className="block truncate font-semibold text-foreground">
                        {row.idea_text ?? "Direct name check"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {names || "No names recorded"}
                      </span>
                    </Link>
                  </td>

                  <td className="px-5 py-4">
                    {running ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                        Running
                      </span>
                    ) : summary.length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <span className="flex flex-nowrap gap-1.5">
                        {summary.map(({ verdict, count }) => (
                          <span
                            key={verdict}
                            className={cn(
                              "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                              VERDICT_STYLES[verdict]
                            )}
                          >
                            {count} {VERDICT_LABELS[verdict]}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right tabular-nums text-muted">
                    {row.candidates.length}
                  </td>

                  <td className="px-5 py-4 text-right tabular-nums text-muted">
                    {row.credits_spent}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-muted">
                    <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                  </td>

                  <td className="px-2 py-4 text-right">
                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
