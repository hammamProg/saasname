import { LlmError } from "@/libs/llm/provider";

/** 1536-dim, matches the `vector(1536)` column on `topics`. */
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new LlmError("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(`OpenAI embeddings returned ${response.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return body.data[0].embedding;
}
