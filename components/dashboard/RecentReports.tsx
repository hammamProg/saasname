import Link from "next/link";
import { ArrowRight, Clock, FileSearch } from "lucide-react";
import VerdictBadge from "@/components/dashboard/VerdictBadge";
import type { Verdict } from "@/libs/scoring/verdict";

export type RecentReport = {
  id: string;
  idea_text: string | null;
  status: string;
  created_at: string;
  candidates: Array<{ name: string; verdict: Verdict | null }>;
};

/** Relative time without pulling in a date library for four branches. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;

  return new Date(iso).toLocaleDateString();
}

export default function RecentReports({ reports }: { reports: RecentReport[] }) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Recent reports</h2>
        <Link
          href="/dashboard/searches"
          className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          View all
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <ul className="space-y-3">
        {reports.map((report) => {
          const clear = report.candidates
            .filter((c) => c.verdict === "clear")
            .map((c) => c.name);
          const running = report.status !== "complete" && report.status !== "failed";

          return (
            <li key={report.id}>
              <Link
                href={`/dashboard/searches/${report.id}`}
                className="card flex items-center gap-4 p-4 transition-colors hover:border-primary/25"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <FileSearch size={18} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {report.idea_text ?? "Direct name check"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {running && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <Clock size={12} aria-hidden="true" />
                        Still running…
                      </span>
                    )}
                    {clear.length > 0 ? (
                      <>
                        <VerdictBadge verdict="clear" size="sm" />
                        <span className="truncate text-xs text-muted">
                          {clear.slice(0, 3).join(", ")}
                          {clear.length > 3 ? ` +${clear.length - 3}` : ""}
                        </span>
                      </>
                    ) : (
                      !running && (
                        <span className="text-xs text-muted">
                          {report.candidates.length}{" "}
                          {report.candidates.length === 1 ? "name" : "names"} checked,
                          none clear
                        </span>
                      )
                    )}
                  </div>
                </div>

                <time
                  dateTime={report.created_at}
                  className="shrink-0 text-xs text-muted"
                >
                  {timeAgo(report.created_at)}
                </time>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
