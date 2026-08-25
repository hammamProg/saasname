/** A probe reports what it observed. It never decides what that means.
 *  Verdicts are computed by the Phase 4 rollup from these signals, in one
 *  place, so scoring logic is not smeared across six adapters. */
export type ProbeSignals = Record<string, number | string | boolean | null>;

export type ProbeResult = {
  signals: ProbeSignals;
  /** A URL a user can open to see the evidence for themselves. */
  evidenceUrl?: string;
};

export type ProbeContext = {
  /** Abort signal carrying the per-probe timeout. */
  signal?: AbortSignal;
};

export interface PlatformProbe {
  id: string;
  /** `core` failure fails the candidate and refunds its credit.
   *  `best_effort` failure yields unknown and never sinks the report. */
  tier: "core" | "best_effort";
  /** Overrides the runner's default budget. Set it when a source is measurably
   *  slow -- Firecrawl search runs ~5.5s, too close to the 8s default. */
  timeoutMs?: number;
  run(name: string, ctx: ProbeContext): Promise<ProbeResult>;
}

/** Raised by a probe when the upstream source failed. The runner turns this
 *  into a `failed` check rather than letting it reject the whole run. */
export class ProbeError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ProbeError";
    this.status = status;
  }
}
