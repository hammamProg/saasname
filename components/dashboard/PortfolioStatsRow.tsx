import Link from "next/link";
import { formatCount } from "@/libs/webstats/format";
import type { Range } from "@/libs/webstats/range";
import type { PortfolioStats } from "@/libs/webstats/portfolio";
import SiteFavicon from "@/components/dashboard/SiteFavicon";
import RangeFilter from "@/components/dashboard/RangeFilter";

function Tile({
  label,
  value,
  hint,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function PortfolioStatsRow({
  range,
  stats,
}: {
  range: Range;
  stats: PortfolioStats;
}) {
  const { topSite } = stats;

  return (
    <RangeFilter
      header={<h2 className="section-heading text-xl font-extrabold">Overview</h2>}
      range={range}
      buildHref={(key) => `/dashboard?range=${key}`}
    >
      {stats.truncated ? (
        <p className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
          This range has more data than one report can read across all your
          sites. The figures below are a floor, not a total.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Visitors"
          value={formatCount(stats.totalVisitors)}
          hint={range.label}
        />
        <Tile
          label="Pageviews"
          value={formatCount(stats.totalPageviews)}
          hint={range.label}
        />
        <Tile
          label="Most visited"
          value={
            topSite ? (
              <Link
                href={`/dashboard/sites/${topSite.id}`}
                className="flex items-center gap-2 text-base font-bold hover:text-primary"
              >
                <SiteFavicon domain={topSite.domain} size={18} />
                <span className="truncate">{topSite.name}</span>
              </Link>
            ) : (
              "—"
            )
          }
          hint={topSite ? `${formatCount(topSite.visitors)} visitors` : "No traffic yet"}
        />
        {/* Last in the row, and the only tile that ignores the date range:
            "now" is not a period. */}
        <Tile
          label={
            <span className="flex items-center gap-2">
              Online now
              <span className="relative flex size-2" aria-hidden="true">
                {stats.onlineNow > 0 ? (
                  <span className="absolute inline-flex size-full animate-live-pulse rounded-full bg-success" />
                ) : null}
                <span
                  className={
                    stats.onlineNow > 0
                      ? "relative inline-flex size-2 rounded-full bg-success"
                      : "relative inline-flex size-2 rounded-full bg-muted/50"
                  }
                />
              </span>
            </span>
          }
          value={formatCount(stats.onlineNow)}
          hint="Across all websites"
        />
      </div>
    </RangeFilter>
  );
}
