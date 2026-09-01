import { describe, it, expect } from "vitest";
import { computeTrendScore } from "@/libs/trends/score";

describe("computeTrendScore", () => {
  it("scores a brand-new topic as an early signal with low confidence", () => {
    const result = computeTrendScore(
      { signalCount: 2, engagementSum: 50, sourceCount: 1 },
      null
    );

    expect(result.stage).toBe("early_signal");
    expect(result.confidenceScore).toBeLessThan(50);
  });

  it("scores rising signal count and multi-source confirmation as accelerating", () => {
    const result = computeTrendScore(
      { signalCount: 20, engagementSum: 5000, sourceCount: 4 },
      { signalCount: 8, engagementSum: 1500, sourceCount: 3 }
    );

    expect(result.stage).toBe("accelerating");
    expect(result.trendScore).toBeGreaterThan(50);
  });

  it("scores falling signal count as cooling", () => {
    const result = computeTrendScore(
      { signalCount: 3, engagementSum: 200, sourceCount: 2 },
      { signalCount: 15, engagementSum: 3000, sourceCount: 3 }
    );

    expect(result.stage).toBe("cooling");
  });
});
