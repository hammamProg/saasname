import { describe, it, expect } from "vitest";
import { deriveAttribution, deriveSource, classifyChannel } from "./attribution";

const SITE = "example.com";

describe("deriveSource — priority order", () => {
  it("prefers UTM parameters over everything else", () => {
    const result = deriveSource({
      pageUrl:
        "https://example.com/?utm_source=facebook&utm_medium=paid-social&utm_campaign=launch&gclid=abc&ref=other",
      referrerUrl: "https://google.com/search",
      siteDomain: SITE,
    });

    expect(result.source).toBe("facebook");
    expect(result.medium).toBe("paid-social");
    expect(result.campaign).toBe("launch");
  });

  it("falls back to ref/source/via when there is no UTM", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/?ref=producthunt",
      referrerUrl: null,
      siteDomain: SITE,
    });

    expect(result.source).toBe("producthunt");
    expect(result.medium).toBe("referral");
  });

  it("falls back to an ad click id when there is no UTM or alt param", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/?gclid=xyz",
      referrerUrl: null,
      siteDomain: SITE,
    });

    expect(result.source).toBe("google");
    expect(result.medium).toBe("paid");
    expect(result.clickIds.gclid).toBe("xyz");
  });

  it("falls back to the external referrer when there is no UTM, alt param or click id", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/",
      referrerUrl: "https://news.ycombinator.com/item?id=1",
      siteDomain: SITE,
    });

    expect(result.source).toBe("news.ycombinator.com");
    expect(result.medium).toBe("referral");
    expect(result.referrerHostname).toBe("news.ycombinator.com");
  });

  it("classifies as direct when there is no referrer and no params", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/",
      referrerUrl: null,
      siteDomain: SITE,
    });

    expect(result.source).toBe("direct");
    expect(result.medium).toBe("none");
    expect(result.channel).toBe("Direct");
  });

  it("classifies a missing referrer with no UTMs as direct, not unknown", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/pricing",
      referrerUrl: "",
      siteDomain: SITE,
    });

    expect(result.channel).toBe("Direct");
  });
});

describe("deriveSource — internal and ignored referrers", () => {
  it("treats the site's own domain as internal, not a new source", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/pricing",
      referrerUrl: "https://example.com/",
      siteDomain: SITE,
    });

    expect(result.referrerHostname).toBeNull();
    expect(result.source).toBe("direct");
  });

  it("treats www.example.com and example.com as the same internal domain", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/pricing",
      referrerUrl: "https://www.example.com/",
      siteDomain: SITE,
    });

    expect(result.source).toBe("direct");
  });

  it("treats a configured ignored referrer domain as internal", () => {
    const result = deriveSource({
      pageUrl: "https://example.com/dashboard",
      referrerUrl: "https://accounts.google.com/o/oauth2/redirect",
      siteDomain: SITE,
      ignoredReferrerDomains: ["accounts.google.com"],
    });

    expect(result.source).toBe("direct");
    expect(result.referrerHostname).toBeNull();
  });
});

describe("classifyChannel", () => {
  it("classifies a search engine referrer as Organic Search", () => {
    expect(
      classifyChannel({
        source: "google.com",
        medium: "referral",
        hasClickId: false,
        referrerHostname: "google.com",
      })
    ).toBe("Organic Search");
  });

  it("classifies a click id through a social referrer as Paid Social", () => {
    expect(
      classifyChannel({
        source: "facebook",
        medium: "paid",
        hasClickId: true,
        referrerHostname: "facebook.com",
      })
    ).toBe("Paid Social");
  });

  it("classifies a click id with no social referrer as Paid Search", () => {
    expect(
      classifyChannel({
        source: "google",
        medium: "paid",
        hasClickId: true,
        referrerHostname: null,
      })
    ).toBe("Paid Search");
  });

  it("classifies utm_medium=email as Email regardless of referrer", () => {
    expect(
      classifyChannel({
        source: "newsletter",
        medium: "email",
        hasClickId: false,
        referrerHostname: null,
      })
    ).toBe("Email");
  });

  it("classifies utm_medium=paid-social as Paid Social, not Display", () => {
    // Regression: this fell through to the generic paid-medium catch-all
    // and returned Display instead of routing through the paid-social
    // branch, since "paid-social" matches neither "cpc"/"ppc" nor a click
    // id — the two things the paid-signal check used to look for.
    expect(
      classifyChannel({
        source: "facebook",
        medium: "paid-social",
        hasClickId: false,
        referrerHostname: null,
      })
    ).toBe("Paid Social");
  });

  it("classifies utm_medium=paid search as Paid Search, not Display", () => {
    expect(
      classifyChannel({
        source: "bing",
        medium: "paid search",
        hasClickId: false,
        referrerHostname: null,
      })
    ).toBe("Paid Search");
  });

  it("classifies utm_medium=display as Display", () => {
    expect(
      classifyChannel({
        source: "adnetwork",
        medium: "display",
        hasClickId: false,
        referrerHostname: null,
      })
    ).toBe("Display");
  });

  it("classifies a social referrer with no paid signal as Organic Social", () => {
    expect(
      classifyChannel({
        source: "linkedin.com",
        medium: "referral",
        hasClickId: false,
        referrerHostname: "linkedin.com",
      })
    ).toBe("Organic Social");
  });

  it("classifies an unrecognised external referrer as Referral", () => {
    expect(
      classifyChannel({
        source: "news.ycombinator.com",
        medium: "referral",
        hasClickId: false,
        referrerHostname: "news.ycombinator.com",
      })
    ).toBe("Referral");
  });

  it("classifies source=direct medium=none as Direct", () => {
    expect(
      classifyChannel({
        source: "direct",
        medium: "none",
        hasClickId: false,
        referrerHostname: null,
      })
    ).toBe("Direct");
  });
});

describe("deriveAttribution", () => {
  it("includes the landing path and full landing URL", () => {
    const result = deriveAttribution({
      pageUrl: "https://example.com/pricing?utm_source=x",
      referrerUrl: null,
      siteDomain: SITE,
    });

    expect(result.landingPath).toBe("/pricing");
    expect(result.landingUrl).toBe("https://example.com/pricing?utm_source=x");
  });

  it("defaults to / when the page URL has no path", () => {
    const result = deriveAttribution({
      pageUrl: "https://example.com",
      referrerUrl: null,
      siteDomain: SITE,
    });

    expect(result.landingPath).toBe("/");
  });
});
