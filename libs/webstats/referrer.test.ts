import { describe, expect, it } from "vitest";
import { parseLocation, parseReferrer } from "./referrer";

describe("parseLocation", () => {
  it("splits path and query", () => {
    expect(parseLocation("https://example.com/pricing?plan=pro")).toEqual({
      path: "/pricing",
      query: "plan=pro",
      utm: {
        source: null,
        medium: null,
        campaign: null,
        content: null,
        term: null,
      },
    });
  });

  it("extracts UTM parameters", () => {
    const result = parseLocation(
      "https://example.com/?utm_source=hn&utm_medium=social&utm_campaign=launch&utm_content=a&utm_term=saas",
    );

    expect(result.utm).toEqual({
      source: "hn",
      medium: "social",
      campaign: "launch",
      content: "a",
      term: "saas",
    });
  });

  it("normalises a bare origin to /", () => {
    expect(parseLocation("https://example.com").path).toBe("/");
  });

  it("drops the fragment, which is never sent to a server anyway", () => {
    expect(parseLocation("https://example.com/docs#install").path).toBe("/docs");
  });

  it("returns a null query when there is none", () => {
    expect(parseLocation("https://example.com/about").query).toBeNull();
  });

  it("preserves a trailing slash, since /a/ and /a are different pages", () => {
    expect(parseLocation("https://example.com/blog/").path).toBe("/blog/");
  });

  it("falls back to / for an unparseable url", () => {
    expect(parseLocation("not a url").path).toBe("/");
  });
});

describe("parseReferrer", () => {
  it("extracts the domain and path", () => {
    expect(parseReferrer("https://news.ycombinator.com/item?id=1", "example.com")).toEqual(
      { domain: "news.ycombinator.com", path: "/item" },
    );
  });

  it("strips www. so one source does not split into two rows", () => {
    expect(parseReferrer("https://www.google.com/", "example.com")?.domain).toBe(
      "google.com",
    );
  });

  it("suppresses a self-referral", () => {
    // Internal navigation is not a traffic source. Counting it would make the
    // site itself the top referrer on every dashboard.
    expect(parseReferrer("https://example.com/pricing", "example.com")).toBeNull();
  });

  it("suppresses a self-referral across the www. boundary", () => {
    expect(
      parseReferrer("https://www.example.com/pricing", "example.com"),
    ).toBeNull();
  });

  it("does not suppress a subdomain, which is a real source", () => {
    expect(parseReferrer("https://blog.example.com/", "example.com")?.domain).toBe(
      "blog.example.com",
    );
  });

  it("returns null for an empty referrer (direct traffic)", () => {
    expect(parseReferrer("", "example.com")).toBeNull();
    expect(parseReferrer(null, "example.com")).toBeNull();
  });

  it("returns null for an unparseable referrer", () => {
    expect(parseReferrer("not a url", "example.com")).toBeNull();
  });
});
