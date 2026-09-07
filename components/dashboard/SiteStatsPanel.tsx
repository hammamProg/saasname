import Link from "next/link";
import {
  formatCount,
  formatDuration,
  formatPercent,
} from "@/libs/webstats/format";
import { RANGES, type Range, type RangeKey } from "@/libs/webstats/range";
import type { SiteStats } from "@/libs/webstats/stats";
import BreakdownCard from "@/components/dashboard/BreakdownCard";
import TrafficChart from "@/components/dashboard/TrafficChart";

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function SiteStatsPanel({
  siteId,
  range,
  stats,
}: {
  siteId: string;
  range: Range;
  stats: SiteStats;
}) {
  const { summary } = stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-heading text-xl font-extrabold">Traffic</h2>

        <nav className="flex flex-wrap gap-1" aria-label="Date range">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={`/dashboard/sites/${siteId}?range=${key}`}
              aria-current={key === range.key ? "page" : undefined}
              className={
                key === range.key
                  ? "rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                  : "rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
              }
            >
              {RANGES[key].label.replace("Last ", "")}
            </Link>
          ))}
        </nav>
      </div>

      {stats.truncated ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This range has more data than one report can read. The figures below
          are a floor, not a total — narrow the range for exact numbers.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Visitors" value={formatCount(summary.visitors)} />
        <Tile label="Pageviews" value={formatCount(summary.pageviews)} />
        <Tile
          label="Bounce rate"
          value={formatPercent(summary.bounceRate)}
          hint="One page, no clicks"
        />
        <Tile
          label="Visit duration"
          value={formatDuration(summary.avgDurationMs)}
          hint="Average, time on page"
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <TrafficChart series={stats.series} bucket={stats.bucket} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Top pages"
          unit="pageviews"
          rows={stats.topPages}
          empty="No pages recorded yet."
        />
        <BreakdownCard
          title="Top sources"
          unit="pageviews"
          rows={stats.topSources}
          empty="Everyone arrived directly, with no referrer."
        />
        <BreakdownCard
          title="Entry pages"
          unit="visitors"
          rows={stats.entryPages}
          empty="No entry pages recorded yet."
        />
        <BreakdownCard
          title="Countries"
          unit="visitors"
          kind="country"
          rows={stats.countries}
          empty="No locations recorded yet."
        />
        <BreakdownCard
          title="Browsers"
          unit="visitors"
          kind="browser"
          rows={stats.browsers}
          empty="No browsers recorded yet."
        />
        <BreakdownCard
          title="Devices"
          unit="visitors"
          rows={stats.devices}
          empty="No devices recorded yet."
        />
      </div>

      {/* Stated rather than buried: two of these lists rank by a different
          unit, and a reader comparing them deserves to know why. */}
      <p className="text-xs text-muted">
        Pages and sources rank by pageviews. Unique visitors cannot be summed
        across hours without counting the same person twice, so the lists that
        can report visitors do, and the ones that cannot say so.
      </p>
    </div>
  );
}
