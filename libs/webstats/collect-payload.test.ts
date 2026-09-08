import { describe, it, expect } from "vitest";
import { parseCollectPayload } from "./collect-payload";

const SITE = "11111111-1111-4111-8111-111111111111";
const VISITOR = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const EVENT = "44444444-4444-4444-8444-444444444444";

function base(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    s: SITE,
    t: "page",
    v: VISITOR,
    ss: SESSION,
    e: EVENT,
    url: "https://example.com/pricing",
    ...overrides,
  });
}

describe("parseCollectPayload", () => {
  it("parses a valid page payload", () => {
    const result = parseCollectPayload(base());
    expect(result).not.toBeNull();
    expect(result?.siteId).toBe(SITE);
    expect(result?.type).toBe("page");
  });

  it("rejects malformed JSON", () => {
    expect(parseCollectPayload("{not json")).toBeNull();
  });

  it("rejects a non-object body", () => {
    expect(parseCollectPayload("[1,2,3]")).toBeNull();
    expect(parseCollectPayload('"just a string"')).toBeNull();
  });

  it("rejects a non-UUID site id", () => {
    expect(parseCollectPayload(base({ s: "not-a-uuid" }))).toBeNull();
  });

  it("rejects an unrecognised type", () => {
    expect(parseCollectPayload(base({ t: "purchase" }))).toBeNull();
  });

  it("rejects a non-UUID visitor, session or event id", () => {
    expect(parseCollectPayload(base({ v: "abc" }))).toBeNull();
    expect(parseCollectPayload(base({ ss: "abc" }))).toBeNull();
    expect(parseCollectPayload(base({ e: "abc" }))).toBeNull();
  });

  it("rejects a non-http(s) URL", () => {
    expect(parseCollectPayload(base({ url: "javascript:alert(1)" }))).toBeNull();
  });

  it("rejects an unparsable URL", () => {
    expect(parseCollectPayload(base({ url: "not a url" }))).toBeNull();
  });

  it("drops object/array values from properties but keeps the rest", () => {
    const result = parseCollectPayload(
      base({ p: { plan: "pro", nested: { a: 1 }, list: [1, 2], ok: true } }),
    );

    expect(result?.properties).toEqual({ plan: "pro", ok: true });
  });

  it("rejects an oversized properties object", () => {
    const huge: Record<string, string> = {};
    for (let i = 0; i < 40; i++) huge[`key${i}`] = "x".repeat(500);

    const result = parseCollectPayload(base({ p: huge }));
    expect(result?.properties).toBeNull();
  });

  it("caps the number of property keys", () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 100; i++) many[`k${i}`] = i;

    const result = parseCollectPayload(base({ p: many }));
    expect(Object.keys(result?.properties ?? {}).length).toBeLessThanOrEqual(40);
  });

  it("treats a missing type-specific name as null rather than rejecting", () => {
    const result = parseCollectPayload(base({ t: "track" }));
    expect(result).not.toBeNull();
    expect(result?.name).toBeNull();
  });
});
