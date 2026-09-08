import { MousePointerClick } from "lucide-react";
import type { Breakdown } from "@/libs/webstats/stats";
import { formatCount } from "@/libs/webstats/format";
import { browserIcon, countryName, flagIcon } from "@/libs/webstats/icons";
import SiteFavicon from "@/components/dashboard/SiteFavicon";

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
  kind,
}: {
  title: string;
  /** What the number counts. Stated because the same list shape carries
   *  visitors for some dimensions and pageviews for others. */
  unit: "visitors" | "pageviews" | "sessions";
  rows: Breakdown;
  empty: string;
  /** Adds an icon, and for countries expands the ISO code to a name. `source`
   *  fetches the referrer's own favicon straight from its domain — same
   *  technique and privacy rationale as SiteFavicon — and gives "Direct /
   *  none" a dedicated glyph instead of a broken favicon request. Omitted for
   *  pages, where the label is already the whole story. */
  kind?: "browser" | "country" | "source";
}) {
  const peak = Math.max(...rows.map((r) => r.value), 1);

  const decorate = (label: string) => {
    if (kind === "browser") {
      return { src: browserIcon(label), text: label };
    }
    if (kind === "country") {
      return { src: flagIcon(label), text: countryName(label) };
    }
    return null;
  };

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
                <span className="flex min-w-0 items-center gap-2">
                  {kind === "source" ? (
                    row.label === "Direct / none" ? (
                      <span
                        aria-hidden="true"
                        className="flex size-4 shrink-0 items-center justify-center rounded-[2px] bg-surface text-muted"
                      >
                        <MousePointerClick size={11} />
                      </span>
                    ) : (
                      <SiteFavicon domain={row.label} size={16} />
                    )
                  ) : decorate(row.label) ? (
                    // A plain img, not next/image: these are local SVGs a few
                    // KB each, already the size they render at, and the
                    // optimizer has nothing to do for them.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={decorate(row.label)!.src}
                      alt=""
                      width={16}
                      height={16}
                      className="size-4 shrink-0 rounded-[2px] object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span
                    className="truncate text-sm"
                    title={decorate(row.label)?.text ?? row.label}
                  >
                    {decorate(row.label)?.text ?? row.label}
                  </span>
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
