const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

export type ComposioToolResponse = {
  data?: Record<string, unknown>;
  error?: string | null;
  successful?: boolean;
};

type ComposioError = {
  error?: { message?: string };
  message?: string;
};

/** Composio v3 often returns tool `data` as a JSON string — parse it once up front. */
export function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

export function normalizeComposioToolData(raw: unknown): Record<string, unknown> {
  const parsed = parseJsonIfString(raw);

  if (Array.isArray(parsed)) {
    return { items: parsed };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const obj = parsed as Record<string, unknown>;
  const nested = parseJsonIfString(obj.response_data ?? obj.data);

  if (Array.isArray(nested)) {
    return { ...obj, items: nested };
  }

  if (typeof nested === "object" && nested !== null) {
    return { ...obj, ...(nested as Record<string, unknown>) };
  }

  return obj;
}

function getApiKey(): string | null {
  const key = process.env.COMPOSIO_API_KEY?.trim();
  return key || null;
}

export async function executeComposioTool(
  toolSlug: string,
  params: {
    userId: string;
    connectionId: string;
    arguments: Record<string, unknown>;
  }
): Promise<{ data: Record<string, unknown> } | { error: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { error: "COMPOSIO_API_KEY is not configured" };
  }

  const response = await fetch(`${COMPOSIO_BASE}/tools/execute/${toolSlug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: params.userId,
      connected_account_id: params.connectionId,
      arguments: params.arguments,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as ComposioToolResponse & ComposioError;
  const message =
    body.error?.message ??
    (typeof body.error === "string" ? body.error : undefined) ??
    body.message ??
    `Composio request failed (${response.status})`;

  if (!response.ok) {
    return { error: message };
  }

  if (!body.successful) {
    return { error: message || `Tool ${toolSlug} failed` };
  }

  return { data: normalizeComposioToolData(body.data) };
}

export function unwrapPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) {
    return {};
  }

  const normalized = normalizeComposioToolData(payload);
  const nested = parseJsonIfString(normalized.response_data ?? normalized.data);

  if (Array.isArray(nested)) {
    return { ...normalized, items: nested };
  }

  if (typeof nested === "object" && nested !== null) {
    return { ...normalized, ...(nested as Record<string, unknown>) };
  }

  return normalized;
}

/** Pull the first array found from common Composio / Supabase response shapes. */
export function extractComposioArray(
  payload: Record<string, unknown> | undefined,
  keys = ["items", "organizations", "projects", "keys", "api_keys", "details", "data"]
): Record<string, unknown>[] {
  if (!payload) {
    return [];
  }

  const nested = parseJsonIfString(payload.response_data ?? payload.data);

  if (Array.isArray(nested)) {
    return nested.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null
    );
  }

  if (typeof nested === "string") {
    const reparsed = parseJsonIfString(nested);
    if (Array.isArray(reparsed)) {
      return reparsed.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
    }
  }

  if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
    const fromNested = extractComposioArray(nested as Record<string, unknown>, keys);
    if (fromNested.length > 0) {
      return fromNested;
    }
  }

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
    }
  }

  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null
    );
  }

  return [];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateDbPassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 24; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
