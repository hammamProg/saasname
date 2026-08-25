export type LlmCompletionRequest = {
  system: string;
  user: string;
  model: string;
  /** Ask the provider to constrain output to a JSON object. */
  json?: boolean;
  timeoutMs?: number;
  /** Hard cap on output tokens. Output is the expensive half of a completion,
   *  so callers that know their answer is short should say so. */
  maxOutputTokens?: number;
};

/** Vendor-neutral completion surface. Returns the raw assistant string;
 *  parsing is the caller's job so swapping providers changes no parsing code. */
export interface LlmProvider {
  complete(request: LlmCompletionRequest): Promise<string>;
}

/** Any upstream model failure. `status` is the HTTP status when there was one. */
export class LlmError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}
