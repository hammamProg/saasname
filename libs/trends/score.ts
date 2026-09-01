export type Stage = "early_signal" | "emerging" | "accelerating" | "established" | "cooling";

export type SnapshotInput = {
  signalCount: number;
  engagementSum: number;
  sourceCount: number;
};

/** Simplified version of the design doc's weighted formula (blueprint §17.1):
 *  momentum + cross-source confirmation + sustained growth, each 0-100 then
 *  weighted. Confidence is tracked separately from attractiveness on
 *  purpose — a topic can be exciting and still low-confidence with one
 *  source, and the two must never collapse into a single opaque number. */
export function computeTrendScore(
  current: SnapshotInput,
  previous: SnapshotInput | null
): { trendScore: number; confidenceScore: number; stage: Stage } {
  const momentumRatio = previous
    ? (current.signalCount - previous.signalCount) / Math.max(previous.signalCount, 1)
    : current.signalCount > 0
      ? 1
      : 0;
  const momentumScore = clamp((momentumRatio + 1) * 50, 0, 100);

  const confirmationScore = clamp(current.sourceCount * 25, 0, 100);
  const sustainedScore = previous ? clamp(previous.signalCount * 10, 0, 100) : 0;

  const trendScore = clamp(
    momentumScore * 0.5 + confirmationScore * 0.3 + sustainedScore * 0.2,
    0,
    100
  );

  const confidenceScore = clamp(
    current.sourceCount * 20 + (previous ? 20 : 0) + Math.min(current.signalCount, 5) * 4,
    0,
    100
  );

  let stage: Stage;
  if (!previous) {
    stage = "early_signal";
  } else if (momentumRatio <= -0.3) {
    stage = "cooling";
  } else if (momentumRatio >= 0.5) {
    stage = "accelerating";
  } else if (current.sourceCount >= 3 && current.signalCount >= 10) {
    stage = "established";
  } else {
    stage = "emerging";
  }

  return { trendScore, confidenceScore, stage };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
