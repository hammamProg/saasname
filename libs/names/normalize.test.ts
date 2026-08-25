import { describe, it, expect } from "vitest";
import { normalizeName } from "@/libs/names/normalize";

describe("normalizeName", () => {
  it("lowercases", () => {
    expect(normalizeName("DataFlow")).toBe("dataflow");
  });

  it("collapses names that differ only by spacing or hyphens", () => {
    expect(normalizeName("data flow")).toBe("dataflow");
    expect(normalizeName("data-flow")).toBe("dataflow");
    expect(normalizeName("data_flow")).toBe("dataflow");
    expect(normalizeName("  DataFlow  ")).toBe("dataflow");
  });

  it("strips diacritics down to their base letters", () => {
    expect(normalizeName("Café")).toBe("cafe");
    expect(normalizeName("Ünïcödé")).toBe("unicode");
  });

  it("keeps digits", () => {
    expect(normalizeName("n8n")).toBe("n8n");
    expect(normalizeName("Base44!")).toBe("base44");
  });

  it("drops punctuation and symbols entirely", () => {
    expect(normalizeName("Ship/Now")).toBe("shipnow");
    expect(normalizeName("@acme.io")).toBe("acmeio");
  });

  it("returns an empty string for input with nothing normalizable", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
    expect(normalizeName("!!!")).toBe("");
  });
});
