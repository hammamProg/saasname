import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "./sanitize";

describe("sanitizeUrl", () => {
  it("removes default sensitive parameters", () => {
    const result = sanitizeUrl(
      "https://example.com/reset?token=abc123&password=hunter2&utm_source=x"
    );

    expect(result).not.toContain("token=");
    expect(result).not.toContain("password=");
    expect(result).toContain("utm_source=x");
  });

  it("matches sensitive parameter names case-insensitively", () => {
    const result = sanitizeUrl("https://example.com/?Token=abc&EMAIL=a@b.com");

    expect(result).not.toContain("Token");
    expect(result).not.toContain("abc");
    expect(result).not.toContain("a%40b.com");
  });

  it("honours extra caller-supplied sensitive params", () => {
    const result = sanitizeUrl("https://example.com/?internal_id=42", ["internal_id"]);

    expect(result).not.toContain("internal_id");
  });

  it("drops the fragment", () => {
    const result = sanitizeUrl("https://example.com/page#secret-section");

    expect(result).not.toContain("#");
  });

  it("returns null for a non-http(s) URL", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
  });

  it("returns null for an unparsable URL", () => {
    expect(sanitizeUrl("not a url")).toBeNull();
  });

  it("keeps a URL with no query string intact", () => {
    expect(sanitizeUrl("https://example.com/pricing")).toBe(
      "https://example.com/pricing"
    );
  });
});
