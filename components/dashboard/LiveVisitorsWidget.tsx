"use client";

import { useEffect, useState } from "react";
import { flagIcon } from "@/libs/webstats/icons";

const REFRESH_MS = 15_000;

type LiveVisitors = {
  count: number;
  series: number[];
  countries: { code: string; name: string; count: number }[];
};

/** Live preview for the badge panel: the same shape of widget a "Powered by"
 *  badge is usually paired with elsewhere — count, a 30-minute activity
 *  shape, and where those visitors are. Polls while the panel is open;
 *  `active` lets the caller stop polling the moment the dialog closes rather
 *  than paying for a background timer nobody is looking at. */
export default function LiveVisitorsWidget({
  siteId,
  active,
}: {
  siteId: string;
  active: boolean;
}) {
  const [data, setData] = useState<LiveVisitors | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch(`/api/webstats/sites/${siteId}/live`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const body = (await response.json()) as LiveVisitors;
        if (!cancelled) setData(body);
      } catch {
        // Keep showing the last known figures; the next tick retries.
      }
    }

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [siteId, active]);

  const count = data?.count ?? 0;
  const series = data?.series ?? [];
  const peak = Math.max(...series, 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Users in last 30 minutes
      </p>

      <p className="mt-2 flex items-center gap-2 text-3xl font-extrabold tabular-nums">
        {count}
        <span className="relative flex size-2.5" aria-hidden="true">
          {count > 0 ? (
            <span className="absolute inline-flex size-full animate-live-pulse rounded-full bg-primary" />
          ) : null}
          <span
            className={
              count > 0
                ? "relative inline-flex size-2.5 rounded-full bg-primary"
                : "relative inline-flex size-2.5 rounded-full bg-muted/50"
            }
          />
        </span>
      </p>

      <div
        className="mt-4 flex h-16 items-end gap-[3px]"
        role="img"
        aria-label="Activity over the last 30 minutes"
      >
        {(series.length > 0 ? series : new Array(30).fill(0)).map((value, index) => (
          <span
            key={index}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${Math.max(4, (value / peak) * 100)}%` }}
          />
        ))}
      </div>

      {data && data.countries.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Country
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.countries.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flagIcon(c.code)}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0 rounded-[2px] object-cover"
                  />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
