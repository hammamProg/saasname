import { describe, it, expect } from "vitest";
import {
  recencyMultiplier,
  rollUp,
  scoreAppStore,
  scoreCheck,
  scoreDomains,
  scoreWebSerp,
  type ScoredCheck,
} from "@/libs/scoring/verdict";

const NOW = Date.parse("2026-08-26T00:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
}

const ok = (platform: string, signals: Record<string, unknown>): ScoredCheck => ({
  platform,
  status: "ok",
  signals: signals as ScoredCheck["signals"],
});

describe("recencyMultiplier", () => {
  it("does not discount a recently updated listing", () => {
    expect(recencyMultiplier(daysAgo(30), NOW)).toBe(1);
  });

  it("discounts steeply once a listing is years old", () => {
    expect(recencyMultiplier(daysAgo(300), NOW)).toBe(0.8);
    expect(recencyMultiplier(daysAgo(500), NOW)).toBe(0.5);
    expect(recencyMultiplier(daysAgo(2000), NOW)).toBe(0.25);
  });

  it("sits in the middle when the age is unknown or unparseable", () => {
    expect(recencyMultiplier(null, NOW)).toBe(0.5);
    expect(recencyMultiplier("not a date", NOW)).toBe(0.5);
  });
});

describe("scoreAppStore", () => {
  it("is clear when no app carries the exact name", () => {
    expect(scoreAppStore({ exactMatch: false, resultCount: 12 }, NOW)).toMatchObject({
      verdict: "clear",
      strength: 0,
    });
  });

  it("blocks on a large, actively maintained incumbent", () => {
    const result = scoreAppStore(
      { exactMatch: true, topRatingCount: 89864, topLastUpdated: daysAgo(2) },
      NOW
    );
    expect(result.verdict).toBe("blocked");
    // 89,864 sits in the sub-100k band, so 80 rather than a perfect 100.
    expect(result.strength).toBe(80);
  });

  it("treats an abandoned squatter as contested, not blocked", () => {
    // The case the design spec calls out by name: 200 ratings, last touched a
    // decade ago. Blocking here would tell users every decent name is taken.
    const result = scoreAppStore(
      { exactMatch: true, topRatingCount: 200, topLastUpdated: daysAgo(3650) },
      NOW
    );
    expect(result.verdict).toBe("contested");
    expect(result.strength).toBeLessThan(50);
  });

  it("does not block a popular app that has been dead for years", () => {
    const result = scoreAppStore(
      { exactMatch: true, topRatingCount: 5000, topLastUpdated: daysAgo(2500) },
      NOW
    );
    expect(result.verdict).toBe("contested");
  });

  it("blocks a mid-sized app that is still being shipped", () => {
    const result = scoreAppStore(
      { exactMatch: true, topRatingCount: 5000, topLastUpdated: daysAgo(10) },
      NOW
    );
    expect(result.verdict).toBe("blocked");
  });

  it("keeps an exact match contested even with almost no ratings", () => {
    const result = scoreAppStore(
      { exactMatch: true, topRatingCount: 0, topLastUpdated: daysAgo(5) },
      NOW
    );
    expect(result.verdict).toBe("contested");
  });
});

describe("scoreDomains", () => {
  it("is clear when the .com is free", () => {
    expect(
      scoreDomains({ com: "available", io: "taken", ai: "taken", dev: "taken", app: "taken" })
    ).toMatchObject({ verdict: "clear" });
  });

  it("is contested when the .com is gone but alternatives remain", () => {
    expect(
      scoreDomains({ com: "taken", io: "available", ai: "taken", dev: "taken", app: "taken" })
    ).toMatchObject({ verdict: "contested" });
  });

  it("is blocked when every checked TLD is taken", () => {
    expect(
      scoreDomains({ com: "taken", io: "taken", ai: "taken", dev: "taken", app: "taken" })
    ).toMatchObject({ verdict: "blocked" });
  });

  it("is unknown when nothing could be resolved", () => {
    expect(
      scoreDomains({ com: "unknown", io: "unknown", ai: "unknown", dev: "unknown", app: "unknown" })
    ).toMatchObject({ verdict: "unknown" });
  });

  it("never reports clear when the .com itself could not be checked", () => {
    const result = scoreDomains({
      com: "unknown",
      io: "available",
      ai: "available",
      dev: "available",
      app: "available",
    });
    expect(result.verdict).not.toBe("clear");
    expect(result.verdict).toBe("unknown");
  });
});

describe("scoreWebSerp", () => {
  it("is clear on an empty SERP", () => {
    expect(scoreWebSerp({ resultCount: 0 })).toMatchObject({ verdict: "clear" });
  });

  it("is clear when results exist but nothing is branded with the name", () => {
    expect(
      scoreWebSerp({ resultCount: 8, exactTitleMatches: 0, hasExactDomain: false })
    ).toMatchObject({ verdict: "clear" });
  });

  it("is contested when the exact-name domain is live", () => {
    expect(
      scoreWebSerp({ resultCount: 8, exactTitleMatches: 0, hasExactDomain: true })
    ).toMatchObject({ verdict: "contested" });
  });

  it("is blocked when an established brand owns the phrase", () => {
    expect(
      scoreWebSerp({ resultCount: 10, exactTitleMatches: 3, hasExactDomain: true })
    ).toMatchObject({ verdict: "blocked" });
  });
});

describe("scoreCheck", () => {
  it("maps any non-ok check to unknown", () => {
    for (const status of ["failed", "skipped", "pending"] as const) {
      expect(
        scoreCheck({ platform: "app-store", status, signals: {} }, NOW).verdict
      ).toBe("unknown");
    }
  });

  it("maps an unrecognised platform to unknown rather than guessing", () => {
    expect(scoreCheck(ok("mystery", { a: 1 }), NOW).verdict).toBe("unknown");
  });
});

describe("rollUp", () => {
  const allClear: ScoredCheck[] = [
    ok("app-store", { exactMatch: false }),
    ok("domains", { com: "available", io: "available", ai: "available", dev: "available", app: "available" }),
    ok("web-serp", { resultCount: 0 }),
  ];

  it("is clear only when every platform is clear", () => {
    expect(rollUp(allClear, "web", NOW).verdict).toBe("clear");
  });

  it("blocks the candidate when any single platform is blocked", () => {
    const checks = [
      ...allClear.slice(1),
      ok("app-store", { exactMatch: true, topRatingCount: 200000, topLastUpdated: daysAgo(1) }),
    ];
    expect(rollUp(checks, "web", NOW).verdict).toBe("blocked");
  });

  it("blocks even when the blocked platform is lightly weighted for the target", () => {
    // Weighting changes the score, never the floor. A hard collision is a hard
    // collision regardless of what the user is building.
    const checks = [
      ...allClear.slice(1),
      ok("app-store", { exactMatch: true, topRatingCount: 200000, topLastUpdated: daysAgo(1) }),
    ];
    expect(rollUp(checks, "web", NOW).verdict).toBe("blocked");
  });

  it("never returns clear when a check could not be completed", () => {
    // The invariant the whole product rests on.
    const checks: ScoredCheck[] = [
      ...allClear.slice(0, 2),
      { platform: "web-serp", status: "failed", signals: {} },
    ];
    expect(rollUp(checks, "web", NOW).verdict).toBe("unknown");
  });

  it("still reports blocked when something else failed", () => {
    const checks: ScoredCheck[] = [
      ok("domains", { com: "taken", io: "taken", ai: "taken", dev: "taken", app: "taken" }),
      { platform: "web-serp", status: "failed", signals: {} },
      ok("app-store", { exactMatch: false }),
    ];
    expect(rollUp(checks, "web", NOW).verdict).toBe("blocked");
  });

  it("is unknown when there are no checks at all", () => {
    expect(rollUp([], "web", NOW).verdict).toBe("unknown");
  });

  it("weights the score toward the platforms that matter for the target", () => {
    const checks = [
      ok("app-store", { exactMatch: true, topRatingCount: 50000, topLastUpdated: daysAgo(5) }),
      ok("domains", { com: "available", io: "available", ai: "available", dev: "available", app: "available" }),
      ok("web-serp", { resultCount: 0 }),
    ];

    const ios = rollUp(checks, "ios", NOW).score;
    const web = rollUp(checks, "web", NOW).score;

    // Same signals; an App Store collision weighs more for an iOS product.
    expect(ios).toBeGreaterThan(web);
  });

  it("excludes unknown platforms from the score rather than scoring them zero", () => {
    const withUnknown: ScoredCheck[] = [
      ok("domains", { com: "taken", io: "available", ai: "taken", dev: "taken", app: "taken" }),
      { platform: "app-store", status: "failed", signals: {} },
      { platform: "web-serp", status: "failed", signals: {} },
    ];

    // Scoring a failed check as 0 would drag the average down and understate
    // the collision we did find.
    expect(rollUp(withUnknown, "web", NOW).score).toBe(50);
  });
});
