import { describe, it, expect } from "vitest";
import { dedupeKeyFor } from "./dedupe";

const ids = { visitorId: "v1", sessionId: "s1", eventId: "e1" };

describe("dedupeKeyFor", () => {
  it("uses visitor_id for once_per_visitor", () => {
    expect(dedupeKeyFor("once_per_visitor", ids)).toBe("v1");
  });

  it("uses session_id for once_per_session", () => {
    expect(dedupeKeyFor("once_per_session", ids)).toBe("s1");
  });

  it("uses event_id for every", () => {
    expect(dedupeKeyFor("every", ids)).toBe("e1");
  });

  it("a retried call with the same event_id dedupes under 'every'", () => {
    const first = dedupeKeyFor("every", ids);
    const retry = dedupeKeyFor("every", { ...ids });
    expect(first).toBe(retry);
  });

  it("two different visitors never share a once_per_visitor key", () => {
    const a = dedupeKeyFor("once_per_visitor", { ...ids, visitorId: "a" });
    const b = dedupeKeyFor("once_per_visitor", { ...ids, visitorId: "b" });
    expect(a).not.toBe(b);
  });
});
