import { describe, it, expect, vi, beforeEach } from "vitest";
import { huggingFaceConnector } from "@/libs/trends/connectors/hugging-face";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("huggingFaceConnector", () => {
  it("fetches trending-sorted models and maps them into RawSignals", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "acme/widget-model",
          likes: 400,
          downloads: 15000,
          createdAt: "2026-08-15T00:00:00.000Z",
          pipeline_tag: "text-generation",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const signals = await huggingFaceConnector.fetchSignals();

    expect(signals[0]).toMatchObject({
      sourceProvider: "hugging_face",
      sourceType: "app",
      externalId: "acme/widget-model",
      canonicalUrl: "https://huggingface.co/acme/widget-model",
      title: "acme/widget-model",
      engagementMetrics: { likes: 400, downloads: 15000 },
      categoryHint: "ai",
    });
  });

  it("throws an error when the API response body is not an array", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "unexpected format" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(huggingFaceConnector.fetchSignals()).rejects.toThrow(
      "Hugging Face models API returned non-array response"
    );
  });
});
