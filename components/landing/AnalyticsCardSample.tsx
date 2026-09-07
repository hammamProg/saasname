import { cn } from "@/libs/cn";

/** A static sample of the real site report, not wired to live data.
 *
 *  Labelled as an example for the same reason the old trend-product sample
 *  card was: the landing page must never imply a number the visitor's own
 *  account hasn't actually produced. Every figure and section here is one
 *  the real report also shows — SiteStatsPanel, SitesGrid — so the page
 *  promises exactly the product that ships. */

const REFERRERS = [
  { label: "Direct / none", value: 412 },
  { label: "Google", value: 268 },
  { label: "X", value: 151 },
];

export default function AnalyticsCardSample({
  className,
  frameless = false,
}: {
  className?: string;
  frameless?: boolean;
}) {
  return (
    <div
      className={cn(
        frameless ? "p-6 sm:p-7" : "glass-card overflow-hidden p-6 sm:p-7",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Example site
          </p>
          <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight">
            yourproduct.com
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" />
          Connected
        </span>
      </div>

      <div className="mt-5 flex items-center gap-8">
        <div>
          <p className="text-2xl font-extrabold tabular-nums">1,284</p>
          <p className="text-xs text-muted">Visitors today</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums">
            7
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-live-pulse rounded-full bg-success" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
          </p>
          <p className="text-xs text-muted">Online now</p>
        </div>
      </div>

      {/* Hand-drawn, not charted from numbers — an illustration of the shape
          of the real chart, not a data visualization of its own. */}
      <svg viewBox="0 0 280 64" className="mt-5 w-full text-primary" aria-hidden="true">
        <polyline
          points="0,48 30,42 60,44 90,28 120,32 150,18 180,22 210,10 240,14 280,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Top referrers
        </p>
        <ul className="mt-2.5 space-y-2">
          {REFERRERS.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{item.label}</span>
              <span className="font-semibold tabular-nums text-muted">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
