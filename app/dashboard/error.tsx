"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Catches an error anywhere under /dashboard, without unmounting the app.
 *
 *  Before this file existed, any uncaught error here — even on one page —
 *  propagated all the way up to app/global-error.tsx, which is required by
 *  Next.js to define its own bare <html>/<body> and therefore never gets
 *  globals.css, the font, or the theme-detection script that runs in the
 *  real root layout. The visible symptom was exactly that: the whole app
 *  vanished and reappeared as an unstyled white page, which read as "it
 *  switched me to light mode" even though no theme actually changed —
 *  there was just no CSS left to apply one.
 *
 *  This boundary sits inside app/dashboard/layout.tsx, so DashboardTopBar,
 *  the theme, and globals.css all stay mounted; only the broken page's own
 *  content is replaced. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="section-heading text-xl font-extrabold">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          We couldn&apos;t load this page. Try again, or head back to your
          sites.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-gradient px-5 py-2.5 text-sm">
            Try again
          </button>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-muted transition hover:text-foreground"
          >
            Back to Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
