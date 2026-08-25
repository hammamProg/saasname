import {
  LlmError,
  type LlmCompletionRequest,
  type LlmProvider,
} from "@/libs/llm/provider";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_TIMEOUT_MS = 15_000;
/** Upstream error bodies are truncated before they reach a log line. */
const MAX_DETAIL_CHARS = 200;

export function isDeepSeekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY?.trim();
}

/** Strips the API key out of any upstream text before it is put in an Error.
 *  DeepSeek echoes the offending key in some 401 bodies, and that message can
 *  end up in a log or a response. */
function redact(text: string, apiKey: string): string {
  return text.split(apiKey).join("[redacted]");
}

/** DeepSeek over its OpenAI-compatible REST endpoint.
 *  Plain fetch on purpose: this is one POST, and a dependency whose only job is
 *  to wrap fetch is not worth the supply-chain surface. */
export function createDeepSeekProvider(): LlmProvider {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("DEEPSEEK_API_KEY is not configured");
  }

  return {
    async complete({
      system,
      user,
      model,
      json,
      timeoutMs,
    }: LlmCompletionRequest): Promise<string> {
      const budget = timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), budget);

      try {
        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            ...(json ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new LlmError(
            `DeepSeek returned ${response.status}: ${redact(detail, apiKey).slice(0, MAX_DETAIL_CHARS)}`,
            response.status
          );
        }

        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;

        if (typeof content !== "string" || !content.trim()) {
          throw new LlmError("DeepSeek returned an empty completion");
        }

        return content;
      } catch (error) {
        if (error instanceof LlmError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new LlmError(`DeepSeek timed out after ${budget}ms`);
        }

        throw new LlmError(
          redact(error instanceof Error ? error.message : String(error), apiKey)
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
