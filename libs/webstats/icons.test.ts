import { describe, expect, it } from "vitest";
import { browserIcon, countryName, flagIcon } from "./icons";

describe("browserIcon", () => {
  it("resolves a browser we ship a mark for", () => {
    expect(browserIcon("Chrome")).toBe("/analytics/browsers/chrome.svg");
  });

  it("is case insensitive", () => {
    expect(browserIcon("firefox")).toBe("/analytics/browsers/firefox.svg");
  });

  it("resolves a hand-added icon that is not an SVG", () => {
    // simple-icons ships no Edge mark, so this file was added by hand as a
    // PNG. The resolver reads the extension from the manifest rather than
    // assuming one, which is the only reason it is reachable.
    expect(browserIcon("Edge")).toBe("/analytics/browsers/edge.png");
  });

  it("falls back for a browser with no mark on disk", () => {
    expect(browserIcon("Samsung Internet")).toBe(
      "/analytics/browsers/_fallback.svg",
    );
  });

  it("falls back for an unknown browser", () => {
    expect(browserIcon("Netscape")).toBe("/analytics/browsers/_fallback.svg");
  });

  it("falls back for a null browser", () => {
    expect(browserIcon(null)).toBe("/analytics/browsers/_fallback.svg");
  });

  it("never returns a path outside the icon directory", () => {
    // The label originates from a parsed user agent, so it is attacker-shaped.
    expect(browserIcon("../../etc/passwd")).toBe(
      "/analytics/browsers/_fallback.svg",
    );
  });
});

describe("flagIcon", () => {
  it("lowercases an ISO code to the file name", () => {
    expect(flagIcon("DE")).toBe("/analytics/flags/de.svg");
  });

  it("accepts an already-lowercase code", () => {
    expect(flagIcon("gb")).toBe("/analytics/flags/gb.svg");
  });

  it("falls back for a code we have no flag for", () => {
    expect(flagIcon("ZZ")).toBe("/analytics/flags/_fallback.svg");
  });

  it("falls back for null", () => {
    expect(flagIcon(null)).toBe("/analytics/flags/_fallback.svg");
  });

  it("rejects anything that is not two letters", () => {
    expect(flagIcon("../de")).toBe("/analytics/flags/_fallback.svg");
    expect(flagIcon("DEU")).toBe("/analytics/flags/_fallback.svg");
  });
});

describe("countryName", () => {
  it("expands an ISO code to a readable name", () => {
    expect(countryName("DE")).toBe("Germany");
    expect(countryName("SA")).toBe("Saudi Arabia");
  });

  it("uses CLDR's own name for the unknown-region code", () => {
    // ZZ is a real assigned code meaning exactly this, and "Unknown Region"
    // reads better in a country list than the raw code would.
    expect(countryName("ZZ")).toBe("Unknown Region");
  });

  it("returns the code unchanged when it is unassigned", () => {
    expect(countryName("QQ")).toBe("QQ");
  });

  it("survives a code that makes Intl throw", () => {
    // T1 marks a Tor exit node in some geo databases and is not a valid
    // region, so Intl raises RangeError rather than returning anything.
    expect(countryName("T1")).toBe("T1");
  });

  it("returns a dash for a missing code", () => {
    expect(countryName(null)).toBe("—");
  });
});
