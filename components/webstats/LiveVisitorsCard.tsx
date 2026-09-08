"use client";

import { useEffect, useState } from "react";
import { flagIcon } from "@/libs/webstats/icons";

const REFRESH_MS = 15_000;

type LiveVisitors = {
  count: number;
  series: number[];
  countries: { code: string; name: string; count: number }[];
};

/** Live "who's online" card: count, a 30-minute activity shape, and where
 *  those visitors are. Two callers, two endpoints behind the same shape:
 *
 *  - The badge panel's preview, pointed at the owner-scoped
 *    /api/webstats/sites/[id]/live — `active` lets it stop polling the
 *    moment the dialog closes rather than paying for a background timer
 *    nobody is looking at.
 *  - The embeddable widget at app/embed/live/[id], pointed at the public
 *    /api/webstats/embed/[id]/live — always active, since the whole page is
 *    the widget. */
export type CardBadge = {
  href: string;
  iconUrl: string;
  appName: string;
};

export default function LiveVisitorsCard({
  endpoint,
  active = true,
  badge,
}: {
  endpoint: string;
  active?: boolean;
  /** A small "Powered by" credit tucked in the card's own corner, the way
   *  comparable widgets do it — not a separate boxed-out badge below, which
   *  reads as an ad bolted onto the thing it's meant to be a quiet credit
   *  for. Optional because the dashboard's own preview of this card (in the
   *  site page, unrelated to the badge panel) has no reason to credit
   *  itself. */
  badge?: CardBadge;
}) {
  const [data, setData] = useState<LiveVisitors | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
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
  }, [endpoint, active]);

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

      {badge ? (
        <div className="mt-4 flex justify-end">
          <a
            href={badge.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted no-underline hover:text-foreground"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badge.iconUrl}
              alt=""
              width={12}
              height={12}
              className="rounded-[2px]"
            />
            Powered by {badge.appName}
          </a>
        </div>
      ) : null}
    </div>
  );
}
