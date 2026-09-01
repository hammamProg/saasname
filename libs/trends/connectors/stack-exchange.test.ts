import { describe, it, expect, vi, beforeEach } from "vitest";
import { stackExchangeConnector } from "@/libs/trends/connectors/stack-exchange";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("stackExchangeConnector", () => {
  it("queries one tag per category and maps questions into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            question_id: 999,
            title: "How do I use widget agents?",
            link: "https://stackoverflow.com/questions/999",
            creation_date: 1893456000,
            score: 8,
            answer_count: 2,
            view_count: 500,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await stackExchangeConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "stack_exchange",
      sourceType: "search",
      externalId: "999",
      canonicalUrl: "https://stackoverflow.com/questions/999",
      title: "How do I use widget agents?",
      engagementMetrics: { score: 8, answers: 2, views: 500 },
    });
  });

  it("skips category on malformed response body (non-array items)", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        // First category: malformed body (items is not an array)
        return {
          ok: true,
          json: async () => ({
            items: { invalid: "not an array" },
          }),
        };
      }
      // Second category: valid response
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              question_id: 888,
              title: "How to build ML models?",
              link: "https://stackoverflow.com/questions/888",
              creation_date: 1893456000,
              score: 5,
              answer_count: 1,
              view_count: 300,
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await stackExchangeConnector.fetchSignals();

    // Should skip first category and include second
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.externalId === "888")).toBe(true);
  });
});
