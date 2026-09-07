"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Site } from "@/libs/webstats/sites";
import type { SiteOverview } from "@/libs/webstats/overview";
import { formatCount } from "@/libs/webstats/format";
import SiteFavicon from "@/components/dashboard/SiteFavicon";

const REFRESH_MS = 30_000;

const EMPTY: SiteOverview = {
  connected: false,
  todayVisitors: 0,
  onlineVisitors: 0,
};

/** The sites list, with each card carrying its own status.
 *
 *  One poll for the whole grid rather than one per card: ten cards each
 *  refreshing themselves would be ten requests every interval to answer a
 *  question the server can answer once. */
export default function SitesGrid({
  sites,
  initial,
}: {
  sites: Site[];
  initial: Record<string, SiteOverview>;
}) {
  const [overview, setOverview] = useState(initial);

  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch("/api/webstats/sites/overview", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const body = (await response.json()) as {
        sites?: Record<string, SiteOverview>;
      };
      if (body.sites) setOverview(body.sites);
    } catch {
      // Keep the last known figures; the next tick retries.
    }
  }, []);

  useEffect(() => {
    // Deferred rather than called from the effect body, so the state update
    // is never synchronous within it.
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  return (
    /* Three up on a laptop, four on a wide screen. The container caps at
       max-w-6xl, so four columns is roughly 260px a card — narrow enough that
       the header has to be allowed to wrap rather than crush the name. */
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sites.map((site) => {
        const status = overview[site.id] ?? EMPTY;

        return (
          <li key={site.id}>
            <Link
              href={`/dashboard/sites/${site.id}`}
              className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              {/* Header is identity only. The status badge used to sit here
                  and, at four columns, squeezed the name down to "saasna...."
                  — the one string on the card a reader actually needs. */}
              <div className="flex min-w-0 items-center gap-3">
                <SiteFavicon domain={site.domain} size={28} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {site.name}
                  </p>
                  <p className="truncate text-sm text-muted">{site.domain}</p>
                </div>
              </div>

              {status.connected ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
                  <div>
                    <p className="text-lg font-extrabold tabular-nums">
                      {formatCount(status.todayVisitors)}
                    </p>
                    <p className="text-xs text-muted">Visitors today</p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-lg font-extrabold tabular-nums">
                      {formatCount(status.onlineVisitors)}
                      <span className="relative flex size-1.5" aria-hidden="true">
                        {status.onlineVisitors > 0 ? (
                          <span className="absolute inline-flex size-full animate-live-pulse rounded-full bg-success" />
                        ) : null}
                        <span
                          className={
                            status.onlineVisitors > 0
                              ? "relative inline-flex size-1.5 rounded-full bg-success"
                              : "relative inline-flex size-1.5 rounded-full bg-muted/50"
                          }
                        />
                      </span>
                    </p>
                    <p className="text-xs text-muted">Online now</p>
                  </div>

                  {/* Kept, quietly. Real numbers usually prove the tag works,
                      but a connected site with a genuine zero would otherwise
                      look identical to a broken one. */}
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 self-start text-xs font-semibold text-success"
                    title="Receiving data"
                  >
                    <span className="size-1.5 rounded-full bg-success" />
                    Connected
                  </span>
                </div>
              ) : (
                /* Not an error state. A site added a minute ago has simply not
                   been installed yet, and colouring that red would make the
                   normal first step look broken. */
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
                  <span className="font-semibold">Not connected</span> — add the
                  snippet to start collecting.
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
