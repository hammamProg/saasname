import {
  LlmError,
  type LlmCompletionRequest,
  type LlmProvider,
} from "@/libs/llm/provider";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_DETAIL_CHARS = 200;

export function isOpenAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

function redact(text: string, apiKey: string): string {
  return text.split(apiKey).join("[redacted]");
}

/** OpenAI chat completions, mirroring the DeepSeek provider's shape so
 *  callers (topic summarization) are provider-agnostic. */
export function createOpenAiProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not configured");
  }

  return {
    async complete({
      system,
      user,
      model,
      json,
      timeoutMs,
      maxOutputTokens,
    }: LlmCompletionRequest): Promise<string> {
      const budget = timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), budget);

      try {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
            ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new LlmError(
            `OpenAI returned ${response.status}: ${redact(detail, apiKey).slice(0, MAX_DETAIL_CHARS)}`,
            response.status
          );
        }

        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;

        if (typeof content !== "string" || !content.trim()) {
          throw new LlmError("OpenAI returned an empty completion");
        }

        return content;
      } catch (error) {
        if (error instanceof LlmError) throw error;

        if (error instanceof Error && error.name === "AbortError") {
          throw new LlmError(`OpenAI timed out after ${budget}ms`);
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
