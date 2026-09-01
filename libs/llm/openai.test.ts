import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOpenAiProvider, isOpenAiConfigured } from "@/libs/llm/openai";
import { LlmError } from "@/libs/llm/provider";

const KEY = "sk-test-openai-key";

function okResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isOpenAiConfigured", () => {
  it("is false when the key is absent", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isOpenAiConfigured()).toBe(false);
  });
});

describe("createOpenAiProvider", () => {
  it("throws when constructed without a key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => createOpenAiProvider()).toThrow(LlmError);
  });

  it("posts to the chat completions endpoint and returns the content", async () => {
    const fetchMock = vi.fn(async () => okResponse("hello"));
    vi.stubGlobal("fetch", fetchMock);

    const out = await createOpenAiProvider().complete({
      system: "s",
      user: "u",
      model: "gpt-4.1-mini",
      json: true,
    });

    expect(out).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body as string).response_format).toEqual({
      type: "json_object",
    });
  });

  it("raises LlmError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as Response)
    );

    await expect(
      createOpenAiProvider().complete({ system: "s", user: "u", model: "gpt-4.1-mini" })
    ).rejects.toThrow(LlmError);
  });
});
