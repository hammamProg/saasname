"use client";

import { useEffect, useState } from "react";

/** Live visitor count.
 *
 *  Server-rendered with a real value and then refreshed, so the tile is never
 *  briefly wrong or empty. Thirty seconds rather than five: the number is a
 *  glance, not a monitor, and this reads the raw event table on every call. */
export default function OnlineTile({
  siteId,
  initial,
}: {
  siteId: string;
  initial: number;
}) {
  const [online, setOnline] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Nobody is looking at a background tab, and this is the most expensive
      // read in the dashboard.
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch(`/api/webstats/sites/${siteId}/online`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const body = (await response.json()) as { online?: number };
        if (!cancelled && typeof body.online === "number") setOnline(body.online);
      } catch {
        // Keep showing the last known figure; the next tick will retry.
      }
    }

    const timer = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [siteId]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Online
        <span className="relative flex size-2" aria-hidden="true">
          {/* The ping only runs when someone is actually there. A dot that
              pulses at zero claims activity that is not happening. */}
          {online > 0 ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
          ) : null}
          <span
            className={
              online > 0
                ? "relative inline-flex size-2 rounded-full bg-success"
                : "relative inline-flex size-2 rounded-full bg-muted/50"
            }
          />
        </span>
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{online}</p>
      <p className="mt-1 text-xs text-muted">Active in the last 5 minutes</p>
    </div>
  );
}
