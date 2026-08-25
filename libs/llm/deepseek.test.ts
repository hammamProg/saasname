import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDeepSeekProvider, isDeepSeekConfigured } from "@/libs/llm/deepseek";
import { LlmError } from "@/libs/llm/provider";

const KEY = "sk-test-deepseek-key";

function okResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isDeepSeekConfigured", () => {
  it("is false when the key is absent", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(isDeepSeekConfigured()).toBe(false);
  });

  it("is true when the key is present", () => {
    expect(isDeepSeekConfigured()).toBe(true);
  });
});

describe("createDeepSeekProvider", () => {
  it("throws when constructed without a key", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(() => createDeepSeekProvider()).toThrow(LlmError);
  });

  it("returns the assistant content on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse('{"candidates":[]}')));

    const out = await createDeepSeekProvider().complete({
      system: "s",
      user: "u",
      model: "deepseek-v4-flash",
    });

    expect(out).toBe('{"candidates":[]}');
  });

  it("sends the key as a bearer token and requests JSON when asked", async () => {
    const fetchMock = vi.fn(async () => okResponse("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await createDeepSeekProvider().complete({
      system: "s",
      user: "u",
      model: "deepseek-v4-flash",
      json: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "u" },
    ]);
  });

  it("omits response_format when json is not requested", async () => {
    const fetchMock = vi.fn(async () => okResponse("plain"));
    vi.stubGlobal("fetch", fetchMock);

    await createDeepSeekProvider().complete({ system: "s", user: "u", model: "m" });

    const init = fetchMock.mock.calls[0][1] as unknown as RequestInit;
    expect(JSON.parse(init.body as string).response_format).toBeUndefined();
  });

  it("raises LlmError carrying the status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 503,
            text: async () => "upstream unavailable",
          }) as unknown as Response
      )
    );

    await expect(
      createDeepSeekProvider().complete({ system: "s", user: "u", model: "m" })
    ).rejects.toMatchObject({ name: "LlmError", status: 503 });
  });

  it("never puts the API key in the error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 401,
            text: async () => `bad key ${KEY}`,
          }) as unknown as Response
      )
    );

    await expect(
      createDeepSeekProvider().complete({ system: "s", user: "u", model: "m" })
    ).rejects.toSatisfy((e: Error) => !e.message.includes(KEY));
  });

  it("raises LlmError when the completion is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse("   ")));

    await expect(
      createDeepSeekProvider().complete({ system: "s", user: "u", model: "m" })
    ).rejects.toThrow(/empty/i);
  });

  it("raises LlmError on timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          })
      )
    );

    await expect(
      createDeepSeekProvider().complete({
        system: "s",
        user: "u",
        model: "m",
        timeoutMs: 10,
      })
    ).rejects.toThrow(/timed out/i);
  });
});
