/** Date ranges for the analytics dashboard.
 *
 *  Every range aligns to whole buckets. A window that starts mid-hour makes the
 *  first column of the chart a partial hour rendered at full width, which reads
 *  as a dip that never happened — so the window begins at the first bucket
 *  rather than exactly N hours ago. */

export type Bucket = "hour" | "day";

export type Range = {
  key: RangeKey;
  label: string;
  bucket: Bucket;
  /** Number of buckets in the window, including the current partial one. */
  buckets: number;
  startAt: (now: Date) => Date;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function truncate(at: Date, bucket: Bucket): Date {
  const d = new Date(at);
  d.setUTCMinutes(0, 0, 0);
  if (bucket === "day") d.setUTCHours(0, 0, 0, 0);
  return d;
}

function windowStart(now: Date, bucket: Bucket, count: number): Date {
  const size = bucket === "hour" ? HOUR_MS : DAY_MS;
  return new Date(truncate(now, bucket).getTime() - (count - 1) * size);
}

function make(
  key: RangeKey,
  label: string,
  bucket: Bucket,
  buckets: number,
): Range {
  return {
    key,
    label,
    bucket,
    buckets,
    startAt: (now: Date) => windowStart(now, bucket, buckets),
  };
}

export const RANGES = {
  "24h": make("24h", "Last 24 hours", "hour", 24),
  "7d": make("7d", "Last 7 days", "day", 7),
  "30d": make("30d", "Last 30 days", "day", 30),
  "90d": make("90d", "Last 90 days", "day", 90),
} as const;

export type RangeKey = "24h" | "7d" | "30d" | "90d";

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
  const size = range.bucket === "hour" ? HOUR_MS : DAY_MS;
  const start = range.startAt(now).getTime();

  return Array.from(
    { length: range.buckets },
    (_, i) => new Date(start + i * size),
  );
}
