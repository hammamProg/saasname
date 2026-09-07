import type { Breakdown } from "@/libs/webstats/stats";
import { formatCount } from "@/libs/webstats/format";

/** A ranked list with the proportion drawn behind each row.
 *
 *  The bar is relative to the top row, not to the total, so the shape answers
 *  "how does this compare to my best one" rather than "what share of
 *  everything is this" — which is the question people actually ask of a top-N
 *  list, and the only one it can answer honestly when the tail is cut off. */
export default function BreakdownCard({
  title,
  unit,
  rows,
  empty,
}: {
  title: string;
  /** What the number counts. Stated because the same list shape carries
   *  visitors for some dimensions and pageviews for others. */
  unit: "visitors" | "pageviews";
  rows: Breakdown;
  empty: string;
}) {
  const peak = Math.max(...rows.map((r) => r.value), 1);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="section-heading text-sm font-extrabold">{title}</h3>
        <span className="text-xs text-muted">{unit}</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map((row) => (
            <li key={row.label} className="relative">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-accent-soft"
                style={{ width: `${Math.max(2, (row.value / peak) * 100)}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-3 px-2 py-1.5">
                <span className="truncate text-sm" title={row.label}>
                  {row.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCount(row.value)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
