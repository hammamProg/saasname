import { describe, it, expect, vi, beforeEach } from "vitest";
import { npmConnector } from "@/libs/trends/connectors/npm";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("npmConnector", () => {
  it("queries the registry search API per category and maps packages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        objects: [
          {
            package: {
              name: "widget-ai",
              description: "AI widgets",
              date: "2026-08-20T00:00:00Z",
              links: { npm: "https://www.npmjs.com/package/widget-ai" },
            },
            score: { detail: { popularity: 0.8 } },
            searchScore: 12.3,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await npmConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "npm",
      sourceType: "code",
      externalId: "widget-ai",
      canonicalUrl: "https://www.npmjs.com/package/widget-ai",
      title: "widget-ai",
      textExcerpt: "AI widgets",
    });
  });

  it("skips category on malformed response body (non-array objects)", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        // First category: malformed body (objects is not an array)
        return {
          ok: true,
          json: async () => ({
            objects: { invalid: "not an array" },
          }),
        };
      }
      // Second category: valid response
      return {
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: "valid-pkg",
                description: "Valid package",
                date: "2026-08-20T00:00:00Z",
                links: { npm: "https://www.npmjs.com/package/valid-pkg" },
              },
              score: { detail: { popularity: 0.5 } },
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await npmConnector.fetchSignals();

    // Should skip first category and include second
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.externalId === "valid-pkg")).toBe(true);
  });
});
