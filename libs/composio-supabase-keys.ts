import {
  executeComposioTool,
  extractComposioArray,
  normalizeComposioToolData,
  sleep,
  unwrapPayload,
} from "@/libs/composio-execute";

export type SupabaseProjectKeys = {
  anonKey: string;
  serviceRoleKey: string;
};

const KEY_FETCH_RETRIES = 5;
const KEY_FETCH_DELAY_MS = 3000;

function looksRedacted(value: string): boolean {
  return value.includes("…") || value.includes("...") || value.includes("•");
}

function pickKeyValue(record: Record<string, unknown>): string | null {
  const candidates = [
    record.api_key,
    record.key,
    record.token,
    record.value,
    record.secret,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length < 20) continue;
    if (looksRedacted(trimmed)) continue;
    return trimmed;
  }

  return null;
}

function isDisabled(record: Record<string, unknown>): boolean {
  return record.disabled === true || record.status === "disabled";
}

function classifyKeyRecord(record: Record<string, unknown>): "anon" | "service_role" | null {
  if (isDisabled(record)) return null;

  const type = String(record.type ?? record.key_type ?? "").toLowerCase();
  const name = String(record.name ?? record.id ?? "").toLowerCase();
  const role = String(record.role ?? "").toLowerCase();
  const jwtRole = String(
    (record.secret_jwt_template as Record<string, unknown> | undefined)?.role ?? ""
  ).toLowerCase();

  if (
    type === "anon" ||
    type === "publishable" ||
    name === "anon" ||
    name.includes("anon") ||
    role === "anon"
  ) {
    return "anon";
  }

  if (
    type === "service_role" ||
    type === "secret" ||
    name === "service_role" ||
    name.includes("service") ||
    role === "service_role" ||
    jwtRole === "service_role"
  ) {
    return "service_role";
  }

  return null;
}

export function parseProjectApiKeysFromPayload(
  payload: Record<string, unknown> | undefined
): SupabaseProjectKeys | null {
  if (!payload) return null;

  const normalized = normalizeComposioToolData(payload);
  let anonKey =
    typeof normalized.anon_key === "string"
      ? normalized.anon_key
      : typeof normalized.anonKey === "string"
        ? normalized.anonKey
        : typeof normalized.publishable_key === "string"
          ? normalized.publishable_key
          : null;

  let serviceRoleKey =
    typeof normalized.service_role_key === "string"
      ? normalized.service_role_key
      : typeof normalized.serviceRoleKey === "string"
        ? normalized.serviceRoleKey
        : typeof normalized.secret_key === "string"
          ? normalized.secret_key
          : null;

  const items = extractComposioArray(normalized, [
    "items",
    "keys",
    "api_keys",
    "details",
    "data",
  ]);

  for (const item of items) {
    const kind = classifyKeyRecord(item);
    const value = pickKeyValue(item);
    if (!kind || !value) continue;

    if (kind === "anon" && !anonKey) anonKey = value;
    if (kind === "service_role" && !serviceRoleKey) serviceRoleKey = value;
  }

  if (anonKey && serviceRoleKey) {
    return { anonKey, serviceRoleKey };
  }

  return null;
}

async function listProjectApiKeys(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<{ items: Record<string, unknown>[] } | { error: string }> {
  const result = await executeComposioTool("SUPABASE_GET_PROJECT_API_KEYS", {
    userId,
    connectionId,
    arguments: { ref: projectRef, reveal: true },
  });

  if ("error" in result) return result;

  const items = extractComposioArray(result.data, ["items", "keys", "api_keys", "details", "data"]);
  return { items };
}

async function revealProjectApiKey(
  userId: string,
  connectionId: string,
  projectRef: string,
  keyId: string
): Promise<string | null> {
  const result = await executeComposioTool("SUPABASE_GET_PROJECT_API_KEY", {
    userId,
    connectionId,
    arguments: { ref: projectRef, id: keyId, reveal: true },
  });

  if ("error" in result) return null;

  const unwrapped = unwrapPayload(result.data);
  const value = pickKeyValue(unwrapped);
  if (value) return value;

  const items = extractComposioArray(unwrapped, ["items", "keys", "api_keys", "details", "data"]);
  for (const item of items) {
    const picked = pickKeyValue(item);
    if (picked) return picked;
  }

  return null;
}

async function fetchKeysWithPerKeyReveal(
  userId: string,
  connectionId: string,
  projectRef: string,
  items: Record<string, unknown>[]
): Promise<SupabaseProjectKeys | null> {
  let anonKey: string | null = null;
  let serviceRoleKey: string | null = null;

  for (const item of items) {
    const kind = classifyKeyRecord(item);
    if (!kind) continue;

    const existing = pickKeyValue(item);
    if (existing) {
      if (kind === "anon" && !anonKey) anonKey = existing;
      if (kind === "service_role" && !serviceRoleKey) serviceRoleKey = existing;
      continue;
    }

    const keyId = item.id ?? item.name;
    if (typeof keyId !== "string" || !keyId.trim()) continue;

    const revealed = await revealProjectApiKey(userId, connectionId, projectRef, keyId);
    if (!revealed) continue;

    if (kind === "anon" && !anonKey) anonKey = revealed;
    if (kind === "service_role" && !serviceRoleKey) serviceRoleKey = revealed;
  }

  if (!anonKey || !serviceRoleKey) return null;
  return { anonKey, serviceRoleKey };
}

export async function fetchSupabaseProjectKeys(
  userId: string,
  connectionId: string,
  projectRef: string
): Promise<SupabaseProjectKeys | { error: string }> {
  let lastError = "Could not read Supabase API keys";

  for (let attempt = 0; attempt < KEY_FETCH_RETRIES; attempt += 1) {
    const list = await listProjectApiKeys(userId, connectionId, projectRef);
    if ("error" in list) {
      lastError = list.error;
    } else {
      const parsed = parseProjectApiKeysFromPayload({ items: list.items });
      if (parsed) return parsed;

      const revealed = await fetchKeysWithPerKeyReveal(
        userId,
        connectionId,
        projectRef,
        list.items
      );
      if (revealed) return revealed;

      if (list.items.length === 0) {
        lastError = "Supabase returned no API keys yet — project may still be provisioning";
      } else {
        lastError = "Supabase API keys were listed but could not be revealed";
      }
    }

    if (attempt < KEY_FETCH_RETRIES - 1) {
      await sleep(KEY_FETCH_DELAY_MS);
    }
  }

  const fallback = await executeComposioTool("SUPABASE_GET_PROJECT", {
    userId,
    connectionId,
    arguments: { ref: projectRef },
  });

  if (!("error" in fallback)) {
    const parsed = parseProjectApiKeysFromPayload(fallback.data);
    if (parsed) return parsed;
  }

  return { error: lastError };
}
