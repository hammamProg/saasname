/** Date ranges for the analytics dashboard.
 *
 *  Every range aligns to whole buckets. A window that starts mid-hour makes the
 *  first column of the chart a partial hour rendered at full width, which reads
 *  as a dip that never happened — so the window begins at the first bucket
 *  rather than exactly N hours ago. */

export type Bucket = "hour" | "day" | "week";

export type Range = {
  key: RangeKey;
  label: string;
  bucket: Bucket;
  /** Buckets in the window, including the current partial one.
   *
   *  A function because "Today" is not a fixed width: it grows through the
   *  day. Padding it to a full 24 hours would draw empty bars for hours that
   *  have not happened yet, which reads as traffic collapsing rather than as
   *  time not having passed. */
  bucketCount: (now: Date) => number;
  startAt: (now: Date) => Date;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export function bucketSize(bucket: Bucket): number {
  if (bucket === "hour") return HOUR_MS;
  return bucket === "day" ? DAY_MS : WEEK_MS;
}

/** Snap a time down to the start of its bucket.
 *
 *  Weeks start on Monday, matching ISO-8601. A week that began on whatever
 *  weekday the site's first event happened to fall on would make two charts of
 *  the same data disagree about where a week boundary is. */
export function truncate(at: Date, bucket: Bucket): Date {
  const d = new Date(at);
  d.setUTCMinutes(0, 0, 0);

  if (bucket === "hour") return d;

  d.setUTCHours(0, 0, 0, 0);
  if (bucket === "day") return d;

  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - weekday);
  return d;
}

function windowStart(now: Date, bucket: Bucket, count: number): Date {
  return new Date(
    truncate(now, bucket).getTime() - (count - 1) * bucketSize(bucket),
  );
}

function make(
  key: RangeKey,
  label: string,
  bucket: Bucket,
  buckets: number | ((now: Date) => number),
): Range {
  const count = typeof buckets === "function" ? buckets : () => buckets;

  return {
    key,
    label,
    bucket,
    bucketCount: count,
    startAt: (now: Date) => windowStart(now, bucket, count(now)),
  };
}

/** Midnight UTC to the current hour, inclusive. One bucket at 00:xx, 24 at
 *  23:xx. */
function hoursElapsedToday(now: Date): number {
  return now.getUTCHours() + 1;
}

export const RANGES = {
  today: make("today", "Today", "hour", hoursElapsedToday),
  "24h": make("24h", "Last 24 hours", "hour", 24),
  "7d": make("7d", "Last 7 days", "day", 7),
  "30d": make("30d", "Last 30 days", "day", 30),
  "90d": make("90d", "Last 90 days", "day", 90),
  /* The window for "all" cannot be known here — it starts at the site's first
     recorded hour. `getSiteStats` resolves it, and also picks day or week
     buckets by span. The values below are only a placeholder so the range is
     selectable and labelled. */
  all: make("all", "All time", "day", 1),
} as const;

export type RangeKey = "today" | "24h" | "7d" | "30d" | "90d" | "all";

export const DEFAULT_RANGE: RangeKey = "7d";

/** Resolve a range from a query string value.
 *
 *  Unrecognised input falls back to the default rather than erroring: the value
 *  arrives from the URL, so a bad one is a stale link or a typo, not a fault
 *  worth showing someone an error page over. */
export function parseRange(key: string | undefined | null): Range {
  if (key && key in RANGES) return RANGES[key as RangeKey];
  return RANGES[DEFAULT_RANGE];
}

/** Every bucket in the window, oldest first.
 *
 *  Generated rather than derived from the rows so that quiet periods render as
 *  zero instead of collapsing. A chart that silently drops empty days makes a
 *  traffic drop look like a shorter week. */
export function bucketsFor(range: Range, now: Date): Date[] {
  return bucketsBetween(range.startAt(now), now, range.bucket);
}

/** Every bucket from `from` to `to` inclusive.
 *
 *  Used directly for "all time", where the start comes from the data rather
 *  than from a fixed offset. */
export function bucketsBetween(from: Date, to: Date, bucket: Bucket): Date[] {
  const size = bucketSize(bucket);
  const start = truncate(from, bucket).getTime();
  const end = truncate(to, bucket).getTime();
  const count = Math.max(1, Math.floor((end - start) / size) + 1);

  return Array.from({ length: count }, (_, i) => new Date(start + i * size));
}
