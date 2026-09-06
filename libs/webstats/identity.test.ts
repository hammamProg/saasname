import { describe, expect, it } from "vitest";
import { deriveSessionId, deriveVisitId, VISIT_WINDOW_MS } from "./identity";

const SALT_A = Buffer.from("0123456789abcdef", "utf8");
const SALT_B = Buffer.from("fedcba9876543210", "utf8");

const INPUT = {
  ip: "203.0.113.9",
  userAgent: "Mozilla/5.0 (Macintosh) Chrome/140",
  domain: "example.com",
};

describe("deriveSessionId", () => {
  it("is deterministic for the same salt and inputs", () => {
    expect(deriveSessionId(SALT_A, INPUT)).toBe(deriveSessionId(SALT_A, INPUT));
  });

  it("produces a uuid-shaped value, since it is stored as one", () => {
    expect(deriveSessionId(SALT_A, INPUT)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("differs across salts, which is what makes rotation unlinkable", () => {
    expect(deriveSessionId(SALT_A, INPUT)).not.toBe(deriveSessionId(SALT_B, INPUT));
  });

  it("differs per visitor ip", () => {
    expect(deriveSessionId(SALT_A, INPUT)).not.toBe(
      deriveSessionId(SALT_A, { ...INPUT, ip: "203.0.113.10" }),
    );
  });

  it("differs per user agent", () => {
    expect(deriveSessionId(SALT_A, INPUT)).not.toBe(
      deriveSessionId(SALT_A, { ...INPUT, userAgent: "Firefox/130" }),
    );
  });

  it("differs per site, so one visitor is not linkable across customers", () => {
    expect(deriveSessionId(SALT_A, INPUT)).not.toBe(
      deriveSessionId(SALT_A, { ...INPUT, domain: "other.com" }),
    );
  });
});

describe("deriveVisitId", () => {
  const session = deriveSessionId(SALT_A, INPUT);
  const start = new Date("2026-09-06T12:00:00.000Z");

  it("is stable within one window", () => {
    const later = new Date(start.getTime() + VISIT_WINDOW_MS - 1000);

    expect(deriveVisitId(session, start)).toBe(deriveVisitId(session, later));
  });

  it("rolls over into the next window", () => {
    const next = new Date(start.getTime() + VISIT_WINDOW_MS);

    expect(deriveVisitId(session, start)).not.toBe(deriveVisitId(session, next));
  });

  it("differs per session within the same window", () => {
    const other = deriveSessionId(SALT_A, { ...INPUT, ip: "198.51.100.4" });

    expect(deriveVisitId(session, start)).not.toBe(deriveVisitId(other, start));
  });

  it("produces a uuid-shaped value", () => {
    expect(deriveVisitId(session, start)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
