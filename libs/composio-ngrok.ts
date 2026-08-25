import { listIntegrations } from "@/libs/composio";
import {
  executeComposioTool,
  extractComposioArray,
  normalizeComposioToolData,
  unwrapPayload,
} from "@/libs/composio-execute";

const NGROK_TOOLKIT = "ngrok";

export type NgrokTunnelOption = {
  id: string;
  publicUrl: string;
  label: string;
  proto?: string;
};

export async function getNgrokConnection(userId: string) {
  const integrations = await listIntegrations(userId);
  const ngrok = integrations.find((item) => item.appName === NGROK_TOOLKIT);
  if (!ngrok?.connected || !ngrok.connectionId) return null;
  return { connectionId: ngrok.connectionId };
}

function normalizePublicUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function tunnelLabel(publicUrl: string, addr?: string | null): string {
  if (addr?.trim()) return `${publicUrl} → ${addr.trim()}`;
  return publicUrl;
}

function parseTunnelItems(payload: unknown): NgrokTunnelOption[] {
  const normalized = normalizeComposioToolData(payload);
  const unwrapped = unwrapPayload(normalized);
  const items = extractComposioArray(unwrapped, [
    "tunnels",
    "endpoints",
    "items",
    "data",
    "results",
  ]);

  const options: NgrokTunnelOption[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const publicUrl =
      normalizePublicUrl(record.public_url) ??
      normalizePublicUrl(record.publicUrl) ??
      normalizePublicUrl(record.url) ??
      normalizePublicUrl(record.host);

    if (!publicUrl || seen.has(publicUrl)) continue;
    seen.add(publicUrl);

    const addr =
      typeof record.config === "object" && record.config !== null
        ? String((record.config as Record<string, unknown>).addr ?? "")
        : typeof record.forwards_to === "string"
          ? record.forwards_to
          : null;

    const id = String(record.id ?? record.name ?? record.uri ?? publicUrl);
    options.push({
      id,
      publicUrl,
      label: tunnelLabel(publicUrl, addr),
      proto: typeof record.proto === "string" ? record.proto : "https",
    });
  }

  return options.sort((a, b) => a.publicUrl.localeCompare(b.publicUrl));
}

export async function listNgrokTunnels(
  userId: string
): Promise<{ tunnels: NgrokTunnelOption[] } | { error: string }> {
  const connection = await getNgrokConnection(userId);
  if (!connection) {
    return { error: "ngrok is not connected. Connect it in Integrations first." };
  }

  const tunnelResult = await executeComposioTool("NGROK_LIST_TUNNELS", {
    userId,
    connectionId: connection.connectionId,
    arguments: {},
  });

  let tunnels =
    "data" in tunnelResult && tunnelResult.data
      ? parseTunnelItems(tunnelResult.data)
      : [];

  if (tunnels.length === 0) {
    const endpointResult = await executeComposioTool("NGROK_LIST_ALL_ENDPOINTS", {
      userId,
      connectionId: connection.connectionId,
      arguments: {},
    });
    if ("data" in endpointResult && endpointResult.data) {
      tunnels = parseTunnelItems(endpointResult.data);
    }
  }

  if ("error" in tunnelResult && tunnels.length === 0) {
    return { error: tunnelResult.error ?? "Could not list ngrok tunnels." };
  }

  return { tunnels };
}
