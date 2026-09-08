"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How often the count refreshes while the tab is in front. Shorter than the
 *  install poll because this is the one figure people watch, and the query is
 *  bounded and cheap. */
const REFRESH_MS = 15_000;

/** Live visitor count, refreshed in place.
 *
 *  Server-rendered with a real value so the tile is never briefly empty, then
 *  kept current without a page load. Three things make it actually feel live
 *  rather than merely being live:
 *
 *  - it refreshes immediately on mount, so the number is current from the
 *    first paint rather than up to a full interval stale;
 *  - it refreshes again when the tab comes back to the front, because polling
 *    is skipped while hidden and returning to a frozen number reads as broken;
 *  - the value flashes when it changes, which is the only evidence a reader
 *    gets that anything is happening at all. */
export default function OnlineTile({
  siteId,
  initial,
}: {
  siteId: string;
  initial: number;
}) {
  const [online, setOnline] = useState(initial);
  const [pulse, setPulse] = useState(0);
  const previous = useRef(initial);

  const refresh = useCallback(async () => {
    // Nobody is looking at a background tab, and this reads the raw event
    // table on every call.
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch(`/api/webstats/sites/${siteId}/online`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const body = (await response.json()) as { online?: number };
      if (typeof body.online !== "number") return;

      setOnline(body.online);

      // Re-key the flash only when the number actually moved. Flashing on
      // every poll would be decoration, and would train the eye to ignore it.
      if (body.online !== previous.current) {
        previous.current = body.online;
        setPulse((n) => n + 1);
      }
    } catch {
      // Keep showing the last known figure; the next tick retries.
    }
  }, [siteId]);

  useEffect(() => {
    // Scheduled rather than called straight from the effect body. The state
    // update inside `refresh` only happens after an await, so it is never
    // actually synchronous — but calling it here reads as a cascading render
    // to the linter, and deferring it costs nothing and removes the argument.
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);

    // Polling is skipped while hidden, so returning to the tab would otherwise
    // show a frozen number until the next tick.
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Online
        <span className="relative flex size-2" aria-hidden="true">
          {/* The ping only runs when someone is actually there. A dot that
              pulses at zero claims activity that is not happening. */}
          {online > 0 ? (
            <span className="absolute inline-flex size-full animate-live-pulse rounded-full bg-success" />
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

      <p
        key={pulse}
        className={`mt-1 text-2xl font-extrabold tabular-nums ${
          pulse > 0 ? "animate-count-change" : ""
        }`}
        aria-live="polite"
      >
        {online}
      </p>

      <p className="mt-1 text-xs text-muted">Active in the last 30 minutes</p>
    </div>
  );
}
