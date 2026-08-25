import { listIntegrations } from "@/libs/composio";
import {
  executeComposioTool,
  extractComposioArray,
  normalizeComposioToolData,
  parseJsonIfString,
  unwrapPayload,
} from "@/libs/composio-execute";

const RESEND_TOOLKIT = "resend";

export type ResendDnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  priority?: number | null;
  ttl?: string;
  status?: string;
};

export type ResendDomainResult = {
  id: string;
  name: string;
  status: string;
  region: string;
  records: ResendDnsRecord[];
};

export async function getResendConnection(userId: string) {
  const integrations = await listIntegrations(userId);
  const resend = integrations.find((item) => item.appName === RESEND_TOOLKIT);
  if (!resend?.connected || !resend.connectionId) return null;
  return { connectionId: resend.connectionId };
}

function parseDnsRecords(value: unknown): ResendDnsRecord[] {
  const parsed = parseJsonIfString(value);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      record: String(item.record ?? item.kind ?? ""),
      name: String(item.name ?? ""),
      type: String(item.type ?? ""),
      value: String(item.value ?? item.content ?? ""),
      priority: typeof item.priority === "number" ? item.priority : null,
      ttl: typeof item.ttl === "string" ? item.ttl : undefined,
      status: typeof item.status === "string" ? item.status : undefined,
    }))
    .filter((item) => item.name && item.value);
}

export function parseResendDomainPayload(payload: Record<string, unknown> | undefined): ResendDomainResult | null {
  if (!payload) return null;

  const normalized = normalizeComposioToolData(payload);
  const unwrapped = unwrapPayload(normalized);

  const id = unwrapped.id ?? normalized.id;
  const name = unwrapped.name ?? normalized.name;
  const status = unwrapped.status ?? normalized.status;

  if (typeof id !== "string" || typeof name !== "string") {
    const items = extractComposioArray(unwrapped, ["items", "domains", "data"]);
    if (items.length > 0) {
      return parseResendDomainPayload(items[0]);
    }
    return null;
  }

  const records = parseDnsRecords(unwrapped.records ?? normalized.records);
  const region =
    typeof unwrapped.region === "string"
      ? unwrapped.region
      : typeof normalized.region === "string"
        ? normalized.region
        : "us-east-1";

  return {
    id,
    name,
    status: typeof status === "string" ? status : "pending",
    region,
    records,
  };
}

export async function createResendDomain(
  userId: string,
  connectionId: string,
  params: { name: string; region: string }
): Promise<ResendDomainResult | { error: string }> {
  const result = await executeComposioTool("RESEND_CREATE_DOMAIN", {
    userId,
    connectionId,
    arguments: {
      name: params.name,
      region: params.region,
    },
  });

  if ("error" in result) return { error: result.error };

  const parsed = parseResendDomainPayload(result.data);
  if (!parsed) {
    return { error: "Domain was created but the response could not be parsed." };
  }

  if (parsed.records.length === 0) {
    const retrieved = await retrieveResendDomain(userId, connectionId, parsed.id);
    if (!("error" in retrieved) && retrieved.records.length > 0) {
      return retrieved;
    }
  }

  return parsed;
}

export async function verifyResendDomain(
  userId: string,
  connectionId: string,
  domainId: string
): Promise<{ status: string } | { error: string }> {
  const result = await executeComposioTool("RESEND_VERIFY_DOMAIN", {
    userId,
    connectionId,
    arguments: { domain_id: domainId },
  });

  if ("error" in result) return { error: result.error };

  const parsed = parseResendDomainPayload(result.data);
  if (parsed) return { status: parsed.status };

  const status = result.data.status;
  return { status: typeof status === "string" ? status : "pending" };
}

export async function retrieveResendDomain(
  userId: string,
  connectionId: string,
  domainId: string
): Promise<ResendDomainResult | { error: string }> {
  const result = await executeComposioTool("RESEND_RETRIEVE_DOMAIN", {
    userId,
    connectionId,
    arguments: { domain_id: domainId },
  });

  if ("error" in result) return { error: result.error };

  const parsed = parseResendDomainPayload(result.data);
  if (!parsed) return { error: "Could not read domain details from Resend." };
  return parsed;
}
