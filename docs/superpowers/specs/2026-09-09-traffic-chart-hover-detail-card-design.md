# Traffic chart hover detail card

## Problem

`TrafficChart` (used on the per-site analytics page, `components/dashboard/SiteStatsPanel.tsx`) shows one bar per bucket (hour/day/week) with visitors as height. Hover currently only surfaces a native browser `title` tooltip with date, visitors, and pageviews — plain, unstyled, and limited to what's already in `series`.

## Goal

Hovering a bar shows a themed floating detail card, anchored next to that bar, with the bucket's date/time, visitors, pageviews, bounce rate, and average visit duration. Disappears on mouse-out. No click required.

## Data layer changes

### `libs/webstats/metrics.ts`

`seriesFor(rows, buckets, bucket)` currently hand-computes `visitors` (distinct `session_id` count) and `pageviews` (summed `views`) per bucket via two `Map`s.

Change: group `rows` into per-bucket slices (same `truncate(hour, bucket)` key as today), then call the existing `summarize()` on each slice instead of hand-rolling the counts. `summarize()` already derives `visitors`, `pageviews`, `bounceRate`, and `avgDurationMs` from a row slice via `foldVisits`, so this is reuse, not new logic.

Bounce/duration are computed from only the rows that fall in that bucket — i.e., if a visit spans two hourly buckets, each bucket scores the bounce/duration of its own portion of that visit. This matches how visitors/pageviews already work per-bucket (a spanning visit is counted in each bucket it touches, per the existing code comment), so the semantics stay consistent with the rest of the file. It intentionally does not attempt to fold a whole visit before bucketing.

New return type:

```ts
export type SeriesPoint = {
  at: Date;
  visitors: number;
  pageviews: number;
  bounceRate: number;
  avgDurationMs: number;
};
```

`seriesFor` returns `SeriesPoint[]` instead of the current inline `{ at, visitors, pageviews }[]`.

### `libs/webstats/stats.ts`

`SiteStats.series` type updates to `SeriesPoint[]` (imported from `./metrics`). No changes to `getSiteStats` beyond the type — it just passes through `seriesFor`'s return value as it does today.

## Component changes

### `components/dashboard/TrafficChart.tsx`

- Add `"use client"` (needed for hover state).
- `Point` type becomes `SeriesPoint` (imported from `@/libs/webstats/metrics`), replacing the local inline type.
- Add `hoveredIndex: number | null` state.
- Each bar's wrapper gets `onMouseEnter={() => setHoveredIndex(i)}` / `onMouseLeave={() => setHoveredIndex(null)}` in place of the current `title` attribute (removed — replaced by the new card). The existing `sr-only` label stays for accessibility (screen readers don't get hover state).
- When `hoveredIndex !== null`, render `<ChartPointCard point={series[hoveredIndex]} bucket={bucket} />` absolutely positioned:
  - Horizontally centered over the hovered bar's column, clamped so the card doesn't overflow the chart container's left/right edge (same clamping idea already used for axis tick labels via `isFirst`/`isLast`).
  - Vertically anchored above the bar (`bottom: <bar height>% + gap`), so it sits above the bar's top edge regardless of bar height, not fixed to the chart top.

### `components/dashboard/ChartPointCard.tsx` (new)

Dedicated presentational component. Props: `{ point: SeriesPoint; bucket: Bucket }`.

Renders a small card:
- Full date/time label (more precise than the axis label — e.g. axis shows "9 Sep", card shows the full date; for `hour` bucket, shows date + hour).
- Visitors, pageviews (via `formatCount`).
- Bounce rate (via `formatPercent`).
- Avg. duration (via `formatDuration`).

Styling: `bg-card`, `border border-border`, `rounded-xl`, `shadow-lg`, `text-foreground` for values, `text-muted` for labels — all existing theme tokens, so it matches light/dark automatically with zero new theme work. `pointer-events-none` so it never intercepts the mouse-leave that would dismiss it.

## Out of scope

- No new backend query — bounce/duration were already on the rollup rows, just not folded per-bucket.
- No mobile/touch tap-to-show behavior — hover-only, matching the existing interaction model of the rest of the dashboard.
- No changes to `BreakdownCard` or other dashboard sections.

## Testing

- Unit test `seriesFor` in `libs/webstats/metrics.ts` (no existing test file for it — this is the first): a visit spanning two buckets should contribute bounce/duration independently to each bucket's slice; an empty bucket should return zero visitors/pageviews and `bounceRate: 0`, `avgDurationMs: 0` (matching `summarize()`'s empty-input behavior).
- Manual check: hover each bar on a site with real data, confirm card appears/disappears correctly at the first and last bars (no overflow past chart edges) and in both light and dark theme.
