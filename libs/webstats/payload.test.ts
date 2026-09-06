import { describe, expect, it } from "vitest";
import { parsePayload } from "./payload";

const SITE = "3f1e4b1c-0000-4000-8000-000000000001";

function valid(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ s: SITE, u: "https://example.com/pricing", ...overrides });
}

describe("parsePayload", () => {
  it("accepts a minimal pageview", () => {
    const result = parsePayload(valid());

    expect(result).toMatchObject({
      siteId: SITE,
      url: "https://example.com/pricing",
      eventType: 1,
    });
  });

  it("defaults an absent type to pageview", () => {
    expect(parsePayload(valid())?.eventType).toBe(1);
  });

  it("reads an engagement event with its duration", () => {
    const result = parsePayload(valid({ t: "engagement", e: 14200 }));

    expect(result).toMatchObject({ eventType: 3, engagedMs: 14200 });
  });

  it("reads a custom event name", () => {
    const result = parsePayload(valid({ t: "event", n: "signup" }));

    expect(result).toMatchObject({ eventType: 2, eventName: "signup" });
  });

  it("rejects a non-uuid site id", () => {
    expect(parsePayload(JSON.stringify({ s: "nope", u: "https://a.com/" }))).toBeNull();
  });

  it("rejects a missing site id", () => {
    expect(parsePayload(JSON.stringify({ u: "https://a.com/" }))).toBeNull();
  });

  it("rejects a missing url", () => {
    expect(parsePayload(JSON.stringify({ s: SITE }))).toBeNull();
  });

  it("rejects a non-http url, which cannot be a tracked page", () => {
    expect(parsePayload(valid({ u: "javascript:alert(1)" }))).toBeNull();
    expect(parsePayload(valid({ u: "file:///etc/passwd" }))).toBeNull();
  });

  it("rejects a url beyond the length cap", () => {
    const long = `https://example.com/${"a".repeat(2100)}`;
    expect(parsePayload(valid({ u: long }))).toBeNull();
  });

  it("rejects malformed json", () => {
    expect(parsePayload("{not json")).toBeNull();
  });

  it("rejects a json array, which is not a payload", () => {
    expect(parsePayload("[1,2,3]")).toBeNull();
  });

  it("truncates an over-long event name rather than rejecting the event", () => {
    const result = parsePayload(valid({ t: "event", n: "x".repeat(300) }));

    expect(result?.eventName).toHaveLength(120);
  });

  it("truncates an over-long page title", () => {
    const result = parsePayload(valid({ ti: "y".repeat(900) }));

    expect(result?.title?.length).toBe(500);
  });

  it("ignores a negative engagement duration", () => {
    expect(parsePayload(valid({ t: "engagement", e: -5 }))?.engagedMs).toBeNull();
  });

  it("caps an implausible engagement duration at one hour", () => {
    // A tab left open for a week must not become a week of "visit duration".
    expect(parsePayload(valid({ t: "engagement", e: 999_999_999 }))?.engagedMs).toBe(
      3_600_000,
    );
  });

  it("keeps the referrer and screen when present", () => {
    const result = parsePayload(
      valid({ r: "https://news.ycombinator.com/", sc: "2560x1440" }),
    );

    expect(result).toMatchObject({
      referrer: "https://news.ycombinator.com/",
      screen: "2560x1440",
    });
  });

  it("rejects a screen value that is not WxH", () => {
    expect(parsePayload(valid({ sc: "huge" }))?.screen).toBeNull();
  });
});
