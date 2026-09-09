import LiveVisitorsCard from "@/components/webstats/LiveVisitorsCard";

/** The hero window's contents: a real, polling instance of the same widget
 *  every customer's dashboard uses, pointed at a synthetic public endpoint
 *  (/api/webstats/demo/live) instead of a tracked site. A visitor sees the
 *  product actually move, not a screenshot of it. */
export default function HeroLiveDemo() {
  return (
    <div className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Live demo
          </p>
          <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight">
            yoursite.com
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" />
          Tracking
        </span>
      </div>

      <div className="mt-5">
        <LiveVisitorsCard endpoint="/api/webstats/demo/live" frameless />
      </div>
    </div>
  );
}
