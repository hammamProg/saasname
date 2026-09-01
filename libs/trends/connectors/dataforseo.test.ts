import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dataForSeoConnector } from "@/libs/trends/connectors/dataforseo";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("DATAFORSEO_LOGIN", "user");
  vi.stubEnv("DATAFORSEO_PASSWORD", "pass");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dataForSeoConnector", () => {
  it("posts basic-auth keyword volume requests and maps results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [
          {
            result: [
              {
                keyword: "ai receptionist",
                search_volume: 2400,
                competition: 0.3,
                cpc: 1.2,
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await dataForSeoConnector.fetchSignals();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`
    );
    expect(signals[0]).toMatchObject({
      sourceProvider: "dataforseo",
      sourceType: "search",
      externalId: "ai receptionist",
      title: "ai receptionist",
      engagementMetrics: { searchVolume: 2400, competition: 0.3, cpc: 1.2 },
    });
  });

  it("returns no signals when credentials are missing", async () => {
    vi.stubEnv("DATAFORSEO_LOGIN", "");

    const signals = await dataForSeoConnector.fetchSignals();

    expect(signals).toEqual([]);
  });

  it("throws error when response has malformed tasks field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        // Missing tasks field
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(dataForSeoConnector.fetchSignals()).rejects.toThrow(
      /tasks.*array/i
    );
  });

  it("throws error when tasks is not an array", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: "not-an-array",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(dataForSeoConnector.fetchSignals()).rejects.toThrow(
      /tasks.*array/i
    );
  });
});
