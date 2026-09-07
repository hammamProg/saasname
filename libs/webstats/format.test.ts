import { describe, expect, it } from "vitest";
import { formatCount, formatDuration, formatPercent } from "./format";

describe("formatCount", () => {
  it("shows small numbers exactly", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(947)).toBe("947");
  });

  it("abbreviates thousands with one decimal", () => {
    expect(formatCount(1_200)).toBe("1.2k");
    expect(formatCount(12_400)).toBe("12.4k");
  });

  it("drops a trailing .0 rather than showing 1.0k", () => {
    expect(formatCount(1_000)).toBe("1k");
  });

  it("abbreviates millions", () => {
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
});

describe("formatDuration", () => {
  it("shows zero as a dash, since 0s reads as a measurement", () => {
    // A visit with no engagement data is unknown, not instantaneous.
    expect(formatDuration(0)).toBe("—");
  });

  it("shows seconds under a minute", () => {
    expect(formatDuration(14_200)).toBe("14s");
  });

  it("shows minutes and seconds", () => {
    expect(formatDuration(95_000)).toBe("1m 35s");
  });

  it("omits zero seconds at a whole minute", () => {
    expect(formatDuration(120_000)).toBe("2m");
  });

  it("shows hours for long visits", () => {
    expect(formatDuration(3_725_000)).toBe("1h 2m");
  });
});

describe("formatPercent", () => {
  it("renders a fraction as a whole percent", () => {
    expect(formatPercent(0.333)).toBe("33%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });
});
