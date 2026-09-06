import { describe, expect, it } from "vitest";
import { DomainError, normalizeDomain } from "./domain";

describe("normalizeDomain", () => {
  it("lowercases and strips a leading www.", () => {
    expect(normalizeDomain("WWW.Example.COM")).toBe("example.com");
  });

  it("accepts a bare hostname unchanged", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("strips a scheme, because people paste the address bar", () => {
    expect(normalizeDomain("https://example.com")).toBe("example.com");
    expect(normalizeDomain("http://www.example.com")).toBe("example.com");
  });

  it("strips a path, query and fragment", () => {
    expect(normalizeDomain("https://example.com/pricing?a=1#top")).toBe(
      "example.com",
    );
  });

  it("strips a port", () => {
    expect(normalizeDomain("example.com:3000")).toBe("example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDomain("  example.com  ")).toBe("example.com");
  });

  it("keeps subdomains other than www", () => {
    expect(normalizeDomain("app.example.com")).toBe("app.example.com");
  });

  it("strips only the first www., not a nested one", () => {
    expect(normalizeDomain("www.www.example.com")).toBe("www.example.com");
  });

  it("rejects an empty value", () => {
    expect(() => normalizeDomain("   ")).toThrow(DomainError);
  });

  it("rejects a value with no dot, since a bare label is never a site", () => {
    expect(() => normalizeDomain("localhost")).toThrow(DomainError);
  });

  it("rejects a value with spaces inside", () => {
    expect(() => normalizeDomain("exa mple.com")).toThrow(DomainError);
  });

  it("rejects characters that cannot appear in a hostname", () => {
    expect(() => normalizeDomain("exa_mple!.com")).toThrow(DomainError);
  });

  it("rejects an IP address, which cannot be verified by hostname match", () => {
    expect(() => normalizeDomain("192.168.1.69")).toThrow(DomainError);
  });
});
