import { formatCount } from "@/libs/webstats/format";
import type { Bucket } from "@/libs/webstats/range";

type Point = { at: Date; visitors: number; pageviews: number };

/** Roughly how many dated ticks to put along the bottom. The real count lands
 *  on a whole-bucket interval near this, so labels always sit under a bar
 *  rather than between two. */
const TARGET_TICKS = 5;

/** Visitors per bucket, with a labelled scale on both axes.
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
  bucket: Bucket;
}) {
  const peak = Math.max(...series.map((p) => p.visitors), 1);
  const total = series.reduce((sum, p) => sum + p.visitors, 0);

  // A week bucket is labelled by the day it starts, same as a day bucket —
  // "w/c 1 Sep" would be more precise and less readable at axis size.
  const label = (at: Date) =>
    bucket === "hour"
      ? `${String(at.getUTCHours()).padStart(2, "0")}:00`
      : at.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        });

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
        No visitors in this period
      </div>
    );
  }

  /* Ticks land on a fixed stride so they stay evenly spaced whatever the
     bucket count, and the last bucket always gets one — the most recent point
     is the one people look for first. */
  const stride = Math.max(1, Math.round(series.length / TARGET_TICKS));
  const ticks = new Set<number>();
  for (let i = 0; i < series.length; i += stride) ticks.add(i);
  ticks.add(series.length - 1);

  /* Whole-number gridlines. A "3.5 visitors" line is nonsense, so on small
     counts the scale steps by one instead of by halves. */
  const steps = peak >= 4 ? [1, 0.5, 0] : peak >= 2 ? [1, 0.5, 0] : [1, 0];
  const gridlines = steps.map((fraction) => ({
    fraction,
    value: Math.round(peak * fraction),
  }));

  return (
    <div>
      <div className="flex gap-3">
        {/* Y axis. Absolutely placed against the same box as the gridlines so
            a label always sits on its line rather than near it. */}
        <div className="relative h-48 w-9 shrink-0">
          {gridlines.map((line) => (
            <span
              key={line.fraction}
              className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted"
              style={{ top: `${(1 - line.fraction) * 100}%` }}
            >
              {formatCount(line.value)}
            </span>
          ))}
        </div>

        <div
          className="relative h-48 flex-1"
          role="img"
          aria-label={`Visitors per ${bucket}, peaking at ${peak}.`}
        >
          {gridlines.map((line) => (
            <div
              key={line.fraction}
              className={
                line.fraction === 0
                  ? "pointer-events-none absolute inset-x-0 border-t border-border"
                  : "pointer-events-none absolute inset-x-0 border-t border-dashed border-border/70"
              }
              style={{ top: `${(1 - line.fraction) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {series.map((point) => {
              // A bucket with traffic always shows at least a sliver: a bar
              // rounded to nothing is indistinguishable from a quiet period.
              const height =
                point.visitors === 0
                  ? 0
                  : Math.max(2, (point.visitors / peak) * 100);

              return (
                <div
                  key={point.at.toISOString()}
                  className="group relative h-full flex-1"
                  title={`${label(point.at)} — ${point.visitors} visitors, ${point.pageviews} pageviews`}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t-[3px] bg-accent/70 transition-colors group-hover:bg-accent"
                    style={{ height: `${height}%` }}
                  />
                  <span className="sr-only">
                    {label(point.at)}: {point.visitors} visitors,{" "}
                    {point.pageviews} pageviews
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis. Positioned by percentage against the plot rather than laid out
          in a matching flex row, so a label stays centred on its bar at any
          bucket count. The first and last are pinned to the edges instead of
          centred, which would push them outside the chart. */}
      <div className="relative ml-12 mt-2 h-4">
        {[...ticks].sort((a, b) => a - b).map((index) => {
          const isFirst = index === 0;
          const isLast = index === series.length - 1;
          const centre = ((index + 0.5) / series.length) * 100;

          return (
            <span
              key={index}
              className={`absolute whitespace-nowrap text-[11px] text-muted ${
                isFirst || isLast ? "" : "-translate-x-1/2"
              }`}
              style={
                isLast
                  ? { right: 0 }
                  : isFirst
                    ? { left: 0 }
                    : { left: `${centre}%` }
              }
            >
              {label(series[index].at)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
