"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RANGES, type RangeKey } from "@/libs/webstats/range";
import { cn } from "@/libs/cn";

/** Range navigation was a plain `<Link href="?range=...">` in three places,
 *  each a full RSC round-trip with no feedback while the new range's data
 *  loads — on a slow query the click looked like it hadn't registered.
 *  `useTransition` + `router.push` gets a `pending` flag in the same
 *  component as the buttons, so the clicked pill can show a spinner and the
 *  stale content below can dim, instead of the page just sitting there.
 *
 *  Takes `activeKey` + `basePath` rather than a `Range` object or a
 *  `buildHref` function — a Server Component caller can't pass either of
 *  those to a Client Component. `Range` carries function fields
 *  (`bucketCount`, `startAt`), and a function prop of any kind is rejected
 *  outright ("Functions cannot be passed directly to Client Components").
 *  Only serializable data crosses that boundary, so the href is built here
 *  instead of by the caller. */
export default function RangeFilter({
  header,
  align = "center",
  activeKey,
  basePath,
  children,
}: {
  /** Whatever sits on the left of the nav row — a section heading, or a
   *  richer block like a back-link + title + description. */
  header: ReactNode;
  align?: "center" | "start";
  activeKey: RangeKey;
  /** Path to navigate to, without the `?range=` query string — e.g.
   *  `/dashboard/sites/${siteId}`. */
  basePath: string;
  /** Server-rendered content that should read as "reloading" while the new
   *  range's data is in flight. */
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-wrap justify-between gap-3",
          align === "center" ? "items-center" : "items-start gap-x-3 gap-y-4",
        )}
      >
        {header}

        <nav className="flex flex-wrap gap-1" aria-label="Date range">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => {
            const active = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  startTransition(() => router.push(`${basePath}?range=${key}`))
                }
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:text-foreground",
                )}
              >
                {RANGES[key].label.replace("Last ", "")}
                {isPending && active ? (
                  <span
                    className="size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "space-y-6 transition-opacity duration-150",
          isPending && "pointer-events-none opacity-50",
        )}
        aria-busy={isPending}
      >
        {children}
      </div>
    </div>
  );
}
