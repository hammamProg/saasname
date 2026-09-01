import { LlmError } from "@/libs/llm/provider";

/** 1536-dim, matches the `vector(1536)` column on `topics`. */
const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_DETAIL_CHARS = 200;

function redact(text: string, apiKey: string): string {
  return text.split(apiKey).join("[redacted]");
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new LlmError(
        `OpenAI embeddings returned ${response.status}: ${redact(detail, apiKey).slice(0, MAX_DETAIL_CHARS)}`
      );
    }

    const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return body.data[0].embedding;
  } catch (error) {
    if (error instanceof LlmError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmError(`OpenAI embeddings timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }

    throw new LlmError(
      redact(error instanceof Error ? error.message : String(error), apiKey)
    );
  } finally {
    clearTimeout(timer);
  }
}
