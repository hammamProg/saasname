import { formatCount } from "@/libs/webstats/format";

type Point = { at: Date; visitors: number; pageviews: number };

/** Visitors per bucket.
 *
 *  One series, not two. Visitors and pageviews count different things — people
 *  and views — so stacking them would imply a sum that does not exist, and
 *  drawing both as bars invites reading the gap as meaningful. Visitors is the
 *  number people act on; pageviews rides along in the hover label.
 *
 *  Empty buckets are rendered, not skipped. A chart that drops quiet days makes
 *  a traffic drop look like a shorter week. */
export default function TrafficChart({
  series,
  bucket,
}: {
  series: Point[];
  bucket: "hour" | "day";
}) {
  const peak = Math.max(...series.map((p) => p.visitors), 1);
  const total = series.reduce((sum, p) => sum + p.visitors, 0);

  const label = (at: Date) =>
    bucket === "hour"
      ? `${String(at.getUTCHours()).padStart(2, "0")}:00 UTC`
      : at.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        });

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
        No visitors in this period
      </div>
    );
  }

  return (
    <div>
      {/* The peak belongs at the top of the plot, where a maximum is read.
          On the axis row it sat between the two dates and parsed as a third
          date. */}
      <div className="relative flex h-40 items-end gap-[2px]" role="img"
        aria-label={`Visitors per ${bucket}. Peak ${peak}.`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="pointer-events-none absolute -top-2 left-0 bg-card pr-2 text-xs text-muted">
          {formatCount(peak)}
        </span>
        {series.map((point) => {
          // A bucket with traffic always shows at least a sliver: a bar
          // rounded to nothing is indistinguishable from a quiet period.
          const height =
            point.visitors === 0
              ? 0
              : Math.max(3, Math.round((point.visitors / peak) * 100));

          return (
            <div
              key={point.at.toISOString()}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-[3px] bg-accent/70 transition-colors group-hover:bg-accent"
                style={{ height: `${height}%` }}
              />
              {/* Native title rather than a JS tooltip: it works without
                  hydration, on keyboard focus, and costs nothing. */}
              <span className="sr-only">
                {label(point.at)}: {point.visitors} visitors,{" "}
                {point.pageviews} pageviews
              </span>
              <div
                className="absolute inset-0"
                title={`${label(point.at)} — ${point.visitors} visitors, ${point.pageviews} pageviews`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{label(series[0].at)}</span>
        <span>{label(series[series.length - 1].at)}</span>
      </div>
    </div>
  );
}
