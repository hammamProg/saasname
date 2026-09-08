import { describe, expect, it } from "vitest";
import { isEmbedHostAllowed, refererHostname } from "./embed-domains";

describe("refererHostname", () => {
  it("extracts the hostname from a full URL", () => {
    expect(refererHostname("https://example.com/blog/post")).toBe("example.com");
  });

  it("returns null for a missing referer", () => {
    expect(refererHostname(null)).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(refererHostname("not a url")).toBeNull();
  });
});

describe("isEmbedHostAllowed", () => {
  it("allows the site's own domain", () => {
    expect(isEmbedHostAllowed("example.com", "example.com", [])).toBe(true);
  });

  it("ignores a www. prefix on either side", () => {
    expect(isEmbedHostAllowed("www.example.com", "example.com", [])).toBe(true);
    expect(isEmbedHostAllowed("example.com", "www.example.com", [])).toBe(true);
  });

  it("allows a domain on the allowlist", () => {
    expect(
      isEmbedHostAllowed("staging.example.com", "example.com", ["staging.example.com"]),
    ).toBe(true);
  });

  it("rejects a domain not on the allowlist", () => {
    expect(isEmbedHostAllowed("evil.com", "example.com", ["staging.example.com"])).toBe(
      false,
    );
  });

  it("rejects a missing hostname", () => {
    expect(isEmbedHostAllowed(null, "example.com", [])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isEmbedHostAllowed("EXAMPLE.com", "example.COM", [])).toBe(true);
  });
});
