import { describe, it, expect } from "vitest";
import {
  NAME_STYLES,
  DEFAULT_STYLE_ID,
  resolveStyle,
  type NameStyleId,
} from "@/libs/names/styles";

describe("NAME_STYLES", () => {
  it("has unique ids", () => {
    const ids = NAME_STYLES.map((style) => style.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every style a label and a prompt constraint", () => {
    for (const style of NAME_STYLES) {
      expect(style.label.trim()).not.toBe("");
      expect(style.constraint.trim()).not.toBe("");
    }
  });

  it("gives every style except the unconstrained one at least two examples", () => {
    for (const style of NAME_STYLES) {
      if (style.id === DEFAULT_STYLE_ID) continue;
      expect(style.examples.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers the unconstrained style, so today's behaviour stays reachable", () => {
    const fallback = NAME_STYLES.find((style) => style.id === DEFAULT_STYLE_ID);
    expect(fallback).toBeDefined();
    expect(fallback?.examples).toEqual([]);
  });
});

describe("resolveStyle", () => {
  it("returns the matching style", () => {
    expect(resolveStyle("invented").id).toBe("invented");
  });

  it("falls back to the default for an unknown id", () => {
    // A style dropped from the catalogue must not break a client still
    // holding the old id.
    expect(resolveStyle("no-such-style" as NameStyleId).id).toBe(DEFAULT_STYLE_ID);
  });

  it("falls back to the default when nothing is supplied", () => {
    expect(resolveStyle(undefined).id).toBe(DEFAULT_STYLE_ID);
  });
});
