import { Nango } from "@nangohq/node";
import { getIntegrationBrand, INTEGRATION_SERVICES } from "@/app/lib/serviceBrands";
import type { IntegrationStatus } from "@/libs/composio";

export const PADDLE_PROVIDER = "paddle";

const NANGO_INTEGRATION_SLUGS = INTEGRATION_SERVICES.filter(
  (service) => service.connectProvider === "nango"
).map((service) => service.slug);

function getSecretKey(): string | null {
  const key =
    process.env.NANGO_SECRET_KEY?.trim() ?? process.env.NANGO_API_KEY?.trim();
  return key || null;
}

export function getPaddleIntegrationId(): string {
  return process.env.NANGO_PADDLE_INTEGRATION_ID?.trim() || PADDLE_PROVIDER;
}

export function isNangoConfigured(): boolean {
  return Boolean(getSecretKey());
}

export function isNangoIntegration(appName: string): boolean {
  return NANGO_INTEGRATION_SLUGS.includes(appName);
}

function getClient(): Nango {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY is not configured");
  }
  return new Nango({ secretKey });
}

export function getNangoClient(): Nango {
  return getClient();
}

function integrationIdForApp(appName: string): string | null {
  if (appName === PADDLE_PROVIDER) {
    return getPaddleIntegrationId();
  }
  return null;
}

export async function createNangoConnectSession(
  userId: string,
  appName: string,
  userEmail?: string | null
): Promise<{ sessionToken: string } | { error: string }> {
  const integrationId = integrationIdForApp(appName);
  if (!integrationId) {
    return { error: `Unsupported Nango integration "${appName}".` };
  }

  try {
    const nango = getClient();
    const response = await nango.createConnectSession({
      end_user: {
        id: userId,
        email: userEmail ?? undefined,
      },
      tags: {
        end_user_id: userId,
      },
      allowed_integrations: [integrationId],
    });

    const sessionToken = response.data?.token;
    if (!sessionToken) {
      return { error: "Nango did not return a connect session token." };
    }

    return { sessionToken };
  } catch (error) {
    console.error("[nango] Failed to create connect session:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create Nango connect session",
    };
  }
}

export async function listNangoIntegrations(
  userId: string
): Promise<IntegrationStatus[]> {
  const services = INTEGRATION_SERVICES.filter(
    (service) => service.connectProvider === "nango"
  );

  if (!isNangoConfigured() || services.length === 0) {
    return services.map((service) => ({
      appName: service.slug,
      displayName: service.name,
      logoUrl: service.logoUrl,
      connected: false,
      connectionId: null,
      status: isNangoConfigured() ? "disconnected" : "not configured",
      authType: service.authType,
      connectProvider: "nango" as const,
    }));
  }

  try {
    const nango = getClient();
    const response = await nango.listConnections({ userId });
    const connections = response.connections ?? [];

    return services.map((service) => {
      const integrationId = integrationIdForApp(service.slug);
      const connection = connections.find(
        (item) =>
          item.provider_config_key === integrationId &&
          item.end_user?.id === userId
      );

      const connected = Boolean(connection?.connection_id);
      const hasErrors = (connection?.errors?.length ?? 0) > 0;

      return {
        appName: service.slug,
        displayName: service.name,
        logoUrl: service.logoUrl,
        connected,
        connectionId: connection?.connection_id ?? null,
        status: connected
          ? hasErrors
            ? "error"
            : "active"
          : "disconnected",
        authType: service.authType,
        connectProvider: "nango" as const,
      };
    });
  } catch (error) {
    console.error("[nango] Failed to list connections:", error);
    return services.map((service) => ({
      appName: service.slug,
      displayName: service.name,
      logoUrl: service.logoUrl,
      connected: false,
      connectionId: null,
      status: "error",
      authType: service.authType,
      connectProvider: "nango" as const,
    }));
  }
}

export async function syncNangoIntegration(
  userId: string,
  appName: string
): Promise<
  | { connectionId: string; integrationId: string }
  | { error: string }
> {
  const integrationId = integrationIdForApp(appName);
  if (!integrationId) {
    return { error: `Unsupported Nango integration "${appName}".` };
  }

  try {
    const nango = getClient();
    const response = await nango.listConnections({ userId });
    const connection = (response.connections ?? []).find(
      (item) =>
        item.provider_config_key === integrationId &&
        item.end_user?.id === userId
    );

    if (!connection?.connection_id) {
      return { error: `${getIntegrationBrand(appName)?.name ?? appName} is not connected.` };
    }

    return {
      connectionId: connection.connection_id,
      integrationId,
    };
  } catch (error) {
    console.error("[nango] Failed to sync integration:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to sync Nango connection",
    };
  }
}

export async function disconnectNangoIntegration(
  appName: string,
  connectionId: string
): Promise<{ success: true } | { error: string }> {
  const integrationId = integrationIdForApp(appName);
  if (!integrationId) {
    return { error: `Unsupported Nango integration "${appName}".` };
  }

  try {
    const nango = getClient();
    await nango.deleteConnection(integrationId, connectionId);
    return { success: true };
  } catch (error) {
    console.error("[nango] Failed to delete connection:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to disconnect integration",
    };
  }
}
