import { describe, it, expect } from "vitest";
import { resolveRdapBase, SUPPORTED_TLDS, tldOf } from "@/libs/probes/rdap-tlds";

describe("tldOf", () => {
  it("returns the last label", () => {
    expect(tldOf("nameloop.com")).toBe("com");
    expect(tldOf("sub.nameloop.co.uk")).toBe("uk");
  });

  it("lowercases", () => {
    expect(tldOf("NameLoop.COM")).toBe("com");
  });

  it("returns empty for input with no dot", () => {
    expect(tldOf("nameloop")).toBe("");
  });
});

describe("SUPPORTED_TLDS", () => {
  it("is exactly the set verified to give a real answer", () => {
    expect([...SUPPORTED_TLDS]).toEqual(["com", "io", "ai", "dev", "app"]);
  });

  it("excludes .co, which has no reachable RDAP server", () => {
    // Including it would put a permanent "could not check" row on every report.
    expect(SUPPORTED_TLDS).not.toContain("co");
  });
});

describe("resolveRdapBase", () => {
  it("resolves bootstrap TLDs", () => {
    expect(resolveRdapBase("com")).toContain("verisign");
    expect(resolveRdapBase("ai")).toBeTruthy();
    expect(resolveRdapBase("dev")).toBeTruthy();
    expect(resolveRdapBase("app")).toBeTruthy();
  });

  it("resolves .io through the registry override", () => {
    // .io is absent from the IANA bootstrap. Without this override rdap.org
    // returns 404 for a registered .io domain, which would read as available.
    expect(resolveRdapBase("io")).toContain("identitydigital");
  });

  it("returns null for a TLD with no known server", () => {
    expect(resolveRdapBase("co")).toBeNull();
    expect(resolveRdapBase("me")).toBeNull();
    expect(resolveRdapBase("so")).toBeNull();
    expect(resolveRdapBase("zzz")).toBeNull();
  });

  it("is case-insensitive and tolerates a leading dot", () => {
    expect(resolveRdapBase(".COM")).toBe(resolveRdapBase("com"));
  });

  it("returns null for empty input rather than throwing", () => {
    expect(resolveRdapBase("")).toBeNull();
  });

  it("returns a base URL ending in a slash, so joining cannot double up", () => {
    for (const tld of SUPPORTED_TLDS) {
      expect(resolveRdapBase(tld)!.endsWith("/")).toBe(true);
    }
  });
});
