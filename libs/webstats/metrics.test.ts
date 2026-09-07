import { describe, expect, it } from "vitest";
import { summarize, type VisitRow } from "./metrics";

function row(over: Partial<VisitRow> = {}): VisitRow {
  return {
    hour: "2026-09-07T10:00:00.000Z",
    visit_id: "v1",
    session_id: "s1",
    views: 1,
    events: 0,
    engaged_ms: 0,
    min_time: "2026-09-07T10:00:00.000Z",
    max_time: "2026-09-07T10:00:00.000Z",
    browser: "Chrome",
    os: "macOS",
    device: "desktop",
    country: "DE",
    entry_path: "/",
    exit_path: "/",
    ...over,
  };
}

describe("summarize", () => {
  it("returns zeroes for no rows", () => {
    expect(summarize([])).toEqual({
      visitors: 0,
      visits: 0,
      pageviews: 0,
      bounceRate: 0,
      avgDurationMs: 0,
    });
  });

  it("counts a single pageview visit", () => {
    const s = summarize([row()]);

    expect(s.visitors).toBe(1);
    expect(s.visits).toBe(1);
    expect(s.pageviews).toBe(1);
  });

  it("counts one visit when a visit spans two hours", () => {
    // The rollup is keyed (site, hour, visit), so an hour boundary splits one
    // visit across two rows. Counting rows would report two visits.
    const s = summarize([
      row({ hour: "2026-09-07T10:00:00.000Z", views: 2 }),
      row({ hour: "2026-09-07T11:00:00.000Z", views: 1 }),
    ]);

    expect(s.visits).toBe(1);
    expect(s.pageviews).toBe(3);
  });

  it("counts distinct visitors, not visits", () => {
    const s = summarize([
      row({ visit_id: "v1", session_id: "s1" }),
      row({ visit_id: "v2", session_id: "s1" }),
      row({ visit_id: "v3", session_id: "s2" }),
    ]);

    expect(s.visitors).toBe(2);
    expect(s.visits).toBe(3);
  });

  it("excludes rows with no pageviews from visit counts", () => {
    // An engagement event landing in a later hour than its pageview creates a
    // visit-hour row with views = 0. It carries real engaged time but is not
    // a visit of its own, and counting it inflates both visits and bounces.
    const s = summarize([
      row({ visit_id: "v1", views: 1 }),
      row({ visit_id: "v2", views: 0, engaged_ms: 4000 }),
    ]);

    expect(s.visits).toBe(1);
    expect(s.visitors).toBe(1);
  });

  it("treats a one-pageview visit with no custom events as a bounce", () => {
    expect(summarize([row({ views: 1, events: 0 })]).bounceRate).toBe(1);
  });

  it("does not treat a one-pageview visit with a custom event as a bounce", () => {
    // Someone who clicked a tracked button engaged with the page.
    expect(summarize([row({ views: 1, events: 1 })]).bounceRate).toBe(0);
  });

  it("does not treat a two-pageview visit as a bounce", () => {
    expect(summarize([row({ views: 2 })]).bounceRate).toBe(0);
  });

  it("judges a bounce on the whole visit, not one hour of it", () => {
    // One pageview in each of two hours is a two-page visit, not two bounces.
    const s = summarize([
      row({ hour: "2026-09-07T10:00:00.000Z", views: 1 }),
      row({ hour: "2026-09-07T11:00:00.000Z", views: 1 }),
    ]);

    expect(s.bounceRate).toBe(0);
  });

  it("prefers measured engagement over first-to-last-event time", () => {
    // Without engagement events a single-pageview visit computes as exactly
    // zero seconds, which is why the tracker reports engaged time at all.
    const s = summarize([
      row({
        views: 1,
        engaged_ms: 14200,
        min_time: "2026-09-07T10:00:00.000Z",
        max_time: "2026-09-07T10:00:00.000Z",
      }),
    ]);

    expect(s.avgDurationMs).toBe(14200);
  });

  it("falls back to elapsed time when no engagement was reported", () => {
    const s = summarize([
      row({
        engaged_ms: 0,
        min_time: "2026-09-07T10:00:00.000Z",
        max_time: "2026-09-07T10:00:30.000Z",
      }),
    ]);

    expect(s.avgDurationMs).toBe(30_000);
  });

  it("sums engaged time across a visit's hours", () => {
    const s = summarize([
      row({ hour: "2026-09-07T10:00:00.000Z", engaged_ms: 5000 }),
      row({ hour: "2026-09-07T11:00:00.000Z", views: 1, engaged_ms: 7000 }),
    ]);

    expect(s.avgDurationMs).toBe(12_000);
  });

  it("averages duration over visits, not rows", () => {
    const s = summarize([
      row({ visit_id: "v1", engaged_ms: 10_000 }),
      row({ visit_id: "v2", engaged_ms: 20_000 }),
    ]);

    expect(s.avgDurationMs).toBe(15_000);
  });
});
