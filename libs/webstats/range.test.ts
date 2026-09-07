import { describe, expect, it } from "vitest";
import { bucketsFor, parseRange, RANGES, type RangeKey } from "./range";

const NOW = new Date("2026-09-07T14:32:11.000Z");

describe("parseRange", () => {
  it("defaults to 7 days when the key is absent", () => {
    expect(parseRange(undefined).key).toBe("7d");
  });

  it("defaults to 7 days when the key is unrecognised", () => {
    // Comes straight from a query string, so it is attacker-controlled.
    expect(parseRange("../../etc/passwd").key).toBe("7d");
  });

  it.each(Object.keys(RANGES) as RangeKey[])("accepts %s", (key) => {
    expect(parseRange(key).key).toBe(key);
  });

  it("accepts today", () => {
    expect(parseRange("today").key).toBe("today");
  });

  it("buckets 24 hours hourly and longer ranges daily", () => {
    expect(parseRange("today").bucket).toBe("hour");
    expect(parseRange("24h").bucket).toBe("hour");
    expect(parseRange("7d").bucket).toBe("day");
    expect(parseRange("30d").bucket).toBe("day");
    expect(parseRange("90d").bucket).toBe("day");
  });
});

describe("bucketsFor — today", () => {
  it("starts at midnight UTC and ends at the current hour", () => {
    const buckets = bucketsFor(parseRange("today"), NOW);

    expect(buckets[0].toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(buckets[buckets.length - 1].toISOString()).toBe(
      "2026-09-07T14:00:00.000Z",
    );
  });

  it("grows through the day rather than padding to a full 24", () => {
    // Empty bars for hours that have not happened yet read as traffic
    // collapsing, not as time not having passed.
    expect(bucketsFor(parseRange("today"), NOW)).toHaveLength(15);
  });

  it("is a single bucket in the first hour of the day", () => {
    const justAfterMidnight = new Date("2026-09-07T00:04:00.000Z");

    expect(bucketsFor(parseRange("today"), justAfterMidnight)).toHaveLength(1);
  });

  it("is 24 buckets in the last hour of the day", () => {
    const beforeMidnight = new Date("2026-09-07T23:59:59.000Z");
    const buckets = bucketsFor(parseRange("today"), beforeMidnight);

    expect(buckets).toHaveLength(24);
    expect(buckets[0].toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("uses UTC, not the machine's local day", () => {
    // The rollups are UTC, so a local-day boundary here would disagree with
    // every other figure on the page.
    const buckets = bucketsFor(parseRange("today"), NOW);

    expect(buckets[0].getUTCHours()).toBe(0);
  });
});

describe("bucketsFor", () => {
  it("returns one bucket per hour over 24 hours, inclusive of now", () => {
    const buckets = bucketsFor(parseRange("24h"), NOW);

    expect(buckets).toHaveLength(24);
    // Truncated to the hour: a partial hour is still a bucket, not a gap.
    expect(buckets[buckets.length - 1].toISOString()).toBe(
      "2026-09-07T14:00:00.000Z",
    );
  });

  it("returns one bucket per day over 7 days", () => {
    const buckets = bucketsFor(parseRange("7d"), NOW);

    expect(buckets).toHaveLength(7);
    expect(buckets[buckets.length - 1].toISOString()).toBe(
      "2026-09-07T00:00:00.000Z",
    );
    expect(buckets[0].toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("returns 90 buckets over 90 days", () => {
    expect(bucketsFor(parseRange("90d"), NOW)).toHaveLength(90);
  });

  it("produces strictly increasing buckets", () => {
    const buckets = bucketsFor(parseRange("30d"), NOW);

    for (let i = 1; i < buckets.length; i += 1) {
      expect(buckets[i].getTime()).toBeGreaterThan(buckets[i - 1].getTime());
    }
  });

  it("starts the window at the first bucket, so nothing is half-counted", () => {
    const range = parseRange("7d");
    const buckets = bucketsFor(range, NOW);

    expect(range.startAt(NOW).toISOString()).toBe(buckets[0].toISOString());
  });
});
