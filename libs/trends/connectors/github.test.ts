import { describe, it, expect, vi, beforeEach } from "vitest";
import { githubConnector } from "@/libs/trends/connectors/github";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("githubConnector", () => {
  it("queries once per category and maps repository items into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 42,
            full_name: "acme/widget",
            html_url: "https://github.com/acme/widget",
            description: "A widget",
            created_at: "2026-08-30T00:00:00Z",
            stargazers_count: 300,
            forks_count: 10,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await githubConnector.fetchSignals();

    expect(fetchMock).toHaveBeenCalledTimes(12); // one call per category
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]).toMatchObject({
      sourceProvider: "github",
      sourceType: "code",
      externalId: "42",
      canonicalUrl: "https://github.com/acme/widget",
      title: "acme/widget",
      textExcerpt: "A widget",
      engagementMetrics: { stars: 300, forks: 10 },
    });
  });

  it("skips a category whose request fails rather than throwing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(githubConnector.fetchSignals()).resolves.toBeDefined();
  });

  it("skips a category whose response has missing or malformed items field", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing items field
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: "not-an-array" }), // items is not an array
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 99,
              full_name: "example/repo",
              html_url: "https://github.com/example/repo",
              description: "A valid repo",
              created_at: "2026-08-30T00:00:00Z",
              stargazers_count: 50,
              forks_count: 5,
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await githubConnector.fetchSignals();

    // Should only include the signal from the successful category
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].externalId).toBe("99");
  });
});
