import type { ProbeSignals } from "@/libs/probes/types";
import type { TargetPlatform } from "@/libs/names/generate";

export type Verdict = "clear" | "contested" | "blocked" | "unknown";

export type PlatformVerdict = {
  platform: string;
  verdict: Verdict;
  /** Incumbent strength 0-100. 0 when there is no incumbent. */
  strength: number;
};

/** A check as the rollup sees it: what the probe found, or that it failed. */
export type ScoredCheck = {
  platform: string;
  status: "ok" | "failed" | "skipped" | "pending";
  signals: ProbeSignals;
};

const DAY_MS = 1000 * 60 * 60 * 24;

/** Ratings volume mapped to a 0-100 band.
 *  Bands rather than a curve because the difference between 40 and 60 ratings
 *  is noise, while the difference between 40 and 40,000 is the whole story. */
function ratingBand(count: number): number {
  if (count <= 0) return 0;
  if (count < 100) return 20;
  if (count < 1_000) return 40;
  if (count < 10_000) return 60;
  if (count < 100_000) return 80;
  return 100;
}

/** How much a listing's age discounts its apparent strength.
 *
 *  This is the decisive factor the design spec calls out: an app with 200
 *  ratings last updated in 2016 is an abandoned squatter, not a competitor.
 *  Getting this wrong makes the product tell users every reasonable name is
 *  taken, which is both useless and false. */
export function recencyMultiplier(lastUpdated: unknown, now = Date.now()): number {
  if (typeof lastUpdated !== "string") return 0.5; // unknown age: assume neither

  const then = new Date(lastUpdated).getTime();
  if (Number.isNaN(then)) return 0.5;

  const days = (now - then) / DAY_MS;

  if (days <= 180) return 1;
  if (days <= 365) return 0.8;
  if (days <= 730) return 0.5;
  return 0.25;
}

export function scoreAppStore(signals: ProbeSignals, now = Date.now()): PlatformVerdict {
  if (!signals.exactMatch) {
    return { platform: "app-store", verdict: "clear", strength: 0 };
  }

  const strength = Math.round(
    ratingBand(Number(signals.topRatingCount) || 0) *
      recencyMultiplier(signals.topLastUpdated, now)
  );

  // An exact-name app always makes the name contested at minimum -- it is
  // literally taken on that store. Only a strong, maintained incumbent blocks.
  return {
    platform: "app-store",
    verdict: strength >= 50 ? "blocked" : "contested",
    strength,
  };
}

export function scoreDomains(signals: ProbeSignals): PlatformVerdict {
  const tlds = ["com", "io", "ai", "dev", "app"];
  const states = tlds.map((t) => signals[t]).filter((v) => typeof v === "string");

  if (states.length === 0 || states.every((s) => s === "unknown")) {
    return { platform: "domains", verdict: "unknown", strength: 0 };
  }

  const com = signals.com;
  const anyAvailable = states.some((s) => s === "available");

  if (com === "available") {
    return { platform: "domains", verdict: "clear", strength: 0 };
  }

  // The .com is the one that matters most; losing it is not fatal while
  // alternatives remain, but it is never "clear".
  if (com === "taken") {
    return {
      platform: "domains",
      verdict: anyAvailable ? "contested" : "blocked",
      strength: anyAvailable ? 50 : 90,
    };
  }

  // .com itself could not be checked. Never report clear on a guess.
  return {
    platform: "domains",
    verdict: anyAvailable ? "unknown" : "blocked",
    strength: anyAvailable ? 0 : 80,
  };
}

export function scoreWebSerp(signals: ProbeSignals): PlatformVerdict {
  const results = Number(signals.resultCount) || 0;
  const exactTitles = Number(signals.exactTitleMatches) || 0;
  const exactDomain = signals.hasExactDomain === true;

  if (results === 0) {
    return { platform: "web-serp", verdict: "clear", strength: 0 };
  }

  if (exactDomain && exactTitles >= 2) {
    return { platform: "web-serp", verdict: "blocked", strength: 85 };
  }

  if (exactDomain || exactTitles >= 1) {
    return { platform: "web-serp", verdict: "contested", strength: 55 };
  }

  // Results exist but nothing is branded with this exact name.
  return { platform: "web-serp", verdict: "clear", strength: 10 };
}

const SCORERS: Record<string, (s: ProbeSignals, now?: number) => PlatformVerdict> = {
  "app-store": scoreAppStore,
  domains: (s) => scoreDomains(s),
  "web-serp": (s) => scoreWebSerp(s),
};

export function scoreCheck(check: ScoredCheck, now = Date.now()): PlatformVerdict {
  // A check we could not complete tells us nothing. It must not read as clear.
  if (check.status !== "ok") {
    return { platform: check.platform, verdict: "unknown", strength: 0 };
  }

  const scorer = SCORERS[check.platform];
  if (!scorer) {
    return { platform: check.platform, verdict: "unknown", strength: 0 };
  }

  return scorer(check.signals, now);
}

/** How much each platform counts, per the product's target.
 *  A collision on an abandoned Android app matters far less to an iOS-targeted
 *  product than the reverse. */
export const PLATFORM_WEIGHTS: Record<TargetPlatform, Record<string, number>> = {
  ios: { "app-store": 1.5, domains: 1, "web-serp": 1, "google-play": 0.4 },
  android: { "app-store": 0.4, domains: 1, "web-serp": 1, "google-play": 1.5 },
  web: { "app-store": 0.4, domains: 1.5, "web-serp": 1.5, "google-play": 0.4 },
  cross: { "app-store": 1, domains: 1, "web-serp": 1, "google-play": 1 },
};

export type CandidateVerdict = {
  verdict: Verdict;
  score: number;
  platforms: PlatformVerdict[];
};

/**
 * Rolls per-platform verdicts into one answer for the candidate.
 *
 * Two rules override the arithmetic, both for the same reason — a wrong
 * "clear" is the failure that would destroy trust in this product:
 *
 *  - any `blocked` platform blocks the candidate, weighting notwithstanding
 *  - an `unknown` can never produce `clear`; the worst it can do is leave the
 *    candidate `unknown`, and it never silently passes
 */
export function rollUp(
  checks: ScoredCheck[],
  targetPlatform: TargetPlatform,
  now = Date.now()
): CandidateVerdict {
  const platforms = checks.map((c) => scoreCheck(c, now));

  if (platforms.length === 0) {
    return { verdict: "unknown", score: 0, platforms };
  }

  const weights = PLATFORM_WEIGHTS[targetPlatform];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const p of platforms) {
    if (p.verdict === "unknown") continue;
    const weight = weights[p.platform] ?? 1;
    weightedSum += p.strength * weight;
    weightTotal += weight;
  }

  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  const hasBlocked = platforms.some((p) => p.verdict === "blocked");
  const hasContested = platforms.some((p) => p.verdict === "contested");
  const hasUnknown = platforms.some((p) => p.verdict === "unknown");

  if (hasBlocked) {
    return { verdict: "blocked", score, platforms };
  }

  if (hasContested) {
    return { verdict: "contested", score, platforms };
  }

  // Everything we could check came back clear -- but something was unchecked.
  // Reporting clear here would be asserting more than we know.
  if (hasUnknown) {
    return { verdict: "unknown", score, platforms };
  }

  return { verdict: "clear", score, platforms };
}
