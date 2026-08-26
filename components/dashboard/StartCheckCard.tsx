import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";

/** The dashboard reports; the work happens on /dashboard/new. This is the
 *  handoff between the two, and the only call to action on the overview. */
export default function StartCheckCard({ credits }: { credits: number }) {
  const isEmpty = credits === 0;

  return (
    <section className="card relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-soft blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-xl font-bold">Check a name</h2>
          <p className="text-sm leading-relaxed text-muted">
            {isEmpty
              ? "You are out of credits. Top up to run another check — generating names stays free."
              : "Describe an idea and we will name it, or paste names you already have. One credit per name, across all six sources."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {isEmpty ? (
            <Link
              href="/dashboard/credits"
              className="btn-primary rounded-xl px-5 py-3 text-sm font-bold"
            >
              Buy credits
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard/new"
                className="btn-primary rounded-xl px-5 py-3 text-sm font-bold"
              >
                <Sparkles size={16} aria-hidden="true" />
                Name an idea
              </Link>
              <Link
                href="/dashboard/new?mode=check"
                className="btn-ghost rounded-xl px-5 py-3 text-sm font-bold"
              >
                <Search size={16} aria-hidden="true" />
                Check a name
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
