import { INTEGRATION_SERVICES } from "@/app/lib/serviceBrands";

const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

type ComposioError = {
  error?: { message?: string };
  message?: string;
};

type AuthConfigItem = {
  id: string;
  status: string;
  is_composio_managed?: boolean;
  toolkit: { slug: string; logo?: string; name?: string };
};

type ConnectedAccountItem = {
  id: string;
  status: string;
  user_id: string;
  toolkit: { slug: string };
};

function getApiKey(): string | null {
  const key = process.env.COMPOSIO_API_KEY?.trim();
  return key || null;
}

export function isComposioConfigured(): boolean {
  return Boolean(getApiKey());
}

async function composioFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { ok: false, status: 503, message: "COMPOSIO_API_KEY is not configured" };
  }

  const response = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as T & ComposioError;
  const message =
    body.error?.message ?? body.message ?? `Composio request failed (${response.status})`;

  if (!response.ok) {
    return { ok: false, status: response.status, message };
  }

  return { ok: true, data: body };
}

function pickAuthConfigId(items: AuthConfigItem[]): string | null {
  const enabled = items.find((item) => item.status === "ENABLED");
  return enabled?.id ?? items[0]?.id ?? null;
}

async function listAuthConfigs(toolkitSlug: string, composioManaged?: boolean) {
  const params = new URLSearchParams({
    toolkit_slug: toolkitSlug,
    limit: "10",
  });
  if (composioManaged !== undefined) {
    params.set("is_composio_managed", composioManaged ? "true" : "false");
  }

  return composioFetch<{ items: AuthConfigItem[] }>(`/auth_configs?${params.toString()}`);
}

async function getAuthConfigId(toolkitSlug: string): Promise<string | null> {
  const managed = await listAuthConfigs(toolkitSlug, true);
  if (managed.ok) {
    const id = pickAuthConfigId(managed.data.items);
    if (id) return id;
  }

  // Custom auth configs (e.g. Resend API key) are not composio-managed.
  const custom = await listAuthConfigs(toolkitSlug);
  if (!custom.ok) return null;
  return pickAuthConfigId(custom.data.items);
}

export type IntegrationStatus = {
  appName: string;
  displayName: string;
  logoUrl?: string;
  connected: boolean;
  connectionId: string | null;
  status: string;
  authType?: "oauth" | "api_key";
  connectProvider?: "composio" | "nango";
};

export async function listIntegrations(userId: string): Promise<IntegrationStatus[]> {
  const composioServices = INTEGRATION_SERVICES.filter(
    (service) => service.connectProvider !== "nango"
  );
  const slugs = composioServices.map((service) => service.slug).join(",");
  const params = new URLSearchParams({
    user_ids: userId,
    toolkit_slugs: slugs,
    limit: "50",
  });

  const [accountsResult, authConfigsResult] = await Promise.all([
    composioFetch<{ items: ConnectedAccountItem[] }>(
      `/connected_accounts?${params.toString()}`
    ),
    composioFetch<{ items: AuthConfigItem[] }>(
      `/auth_configs?toolkit_slug=${slugs}&limit=50`
    ),
  ]);

  const accounts = accountsResult.ok ? accountsResult.data.items : [];
  const authConfigs = authConfigsResult.ok ? authConfigsResult.data.items : [];

  const logoBySlug = new Map<string, string>();
  for (const config of authConfigs) {
    if (config.toolkit.logo) {
      logoBySlug.set(config.toolkit.slug, config.toolkit.logo);
    }
  }

  return composioServices.map((service) => {
    const account = accounts
      .filter((item) => item.toolkit.slug === service.slug)
      .sort((a, b) => {
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
        return 0;
      })[0];

    const connected = account?.status === "ACTIVE";

    return {
      appName: service.slug,
      displayName: service.name,
      logoUrl: logoBySlug.get(service.slug) ?? service.logoUrl,
      connected,
      connectionId: account?.id ?? null,
      status: connected ? "active" : account?.status?.toLowerCase() ?? "disconnected",
      authType: service.authType ?? "oauth",
      connectProvider: "composio" as const,
    };
  });
}

export async function createConnectLink(
  userId: string,
  appName: string,
  callbackUrl: string
): Promise<{ redirectUrl: string } | { error: string }> {
  const authConfigId = await getAuthConfigId(appName);

  if (!authConfigId) {
    return {
      error: `No Composio auth config found for "${appName}". Create and enable an auth config for this toolkit in your Composio dashboard.`,
    };
  }

  const result = await composioFetch<{ redirect_url: string }>("/connected_accounts/link", {
    method: "POST",
    body: JSON.stringify({
      auth_config_id: authConfigId,
      user_id: userId,
      callback_url: callbackUrl,
    }),
  });

  if (!result.ok) {
    return { error: result.message };
  }

  return { redirectUrl: result.data.redirect_url };
}

export async function disconnectIntegration(
  connectionId: string
): Promise<{ success: true } | { error: string }> {
  const result = await composioFetch<{ success: boolean }>(
    `/connected_accounts/${connectionId}`,
    { method: "DELETE" }
  );

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true };
}
