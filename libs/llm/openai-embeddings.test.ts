import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { embedText } from "@/libs/llm/openai-embeddings";
import { LlmError } from "@/libs/llm/provider";

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("embedText", () => {
  it("returns the embedding vector from the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      }) as unknown as Response)
    );

    const vector = await embedText("hello world");

    expect(vector).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws LlmError without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(embedText("hello")).rejects.toThrow(LlmError);
  });

  it("throws LlmError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }) as unknown as Response)
    );

    await expect(embedText("hello")).rejects.toThrow(LlmError);
  });

  it("redacts the API key from non-2xx error messages", async () => {
    const apiKey = "sk-test";
    vi.stubEnv("OPENAI_API_KEY", apiKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => `Invalid API key: ${apiKey}`,
      }) as unknown as Response)
    );

    const error = await embedText("hello").catch((e) => e);
    expect(error).toBeInstanceOf(LlmError);
    expect(error.message).toContain("[redacted]");
    expect(error.message).not.toContain(apiKey);
  });

  it("converts network errors to LlmError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Network error");
      })
    );

    const error = await embedText("hello").catch((e) => e);
    expect(error).toBeInstanceOf(LlmError);
  });
});
