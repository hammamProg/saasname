import type { ApiKeyCredentials } from "@nangohq/types";
import { isAxiosError } from "axios";
import config from "@/config";
import { buildPaddlePricePayload, type ProjectPaddlePlan } from "@/libs/paddle-plans";
import {
  getNangoClient,
  getPaddleIntegrationId,
  isNangoConfigured,
  PADDLE_PROVIDER,
  syncNangoIntegration,
} from "@/libs/nango";
import {
  inferPaddleEnvFromClientToken,
} from "@/libs/paddle-setup-plans";

export const PADDLE_WEBHOOK_EVENTS = [
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
  "transaction.completed",
] as const;

export type PaddleProvisionResult = {
  apiKey: string;
  clientToken: string;
  webhookSecret: string;
  webhookUrl: string;
  planPriceIds: Record<string, string>;
  notificationSettingId: string;
  env: "sandbox" | "production";
};

type PaddleEntityResponse<T extends { id?: string }> = {
  data?: T;
};

function extractPaddleError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object") {
      const paddleError = (payload as { error?: { detail?: unknown; message?: unknown } }).error;
      if (paddleError && typeof paddleError === "object") {
        const detail = paddleError.detail ?? paddleError.message;
        if (typeof detail === "string" && detail.trim()) return detail;
      }
    }
    if (error.message) return error.message;
  }
  return error instanceof Error ? error.message : "Paddle request failed.";
}

function resolveSiteUrl(siteUrl?: string): string {
  const raw =
    siteUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    config.productionUrl;
  return raw.replace(/\/+$/, "");
}

async function paddlePost<T extends { id?: string }>(
  integrationId: string,
  connectionId: string,
  endpoint: string,
  data: unknown
): Promise<{ entity: T } | { error: string }> {
  try {
    const nango = getNangoClient();
    const response = await nango.post<PaddleEntityResponse<T>>({
      providerConfigKey: integrationId,
      connectionId,
      endpoint,
      data,
      headers: { "Content-Type": "application/json" },
    });
    const entity = response.data?.data;
    if (!entity?.id) {
      return { error: `Paddle did not return a valid response for ${endpoint}.` };
    }
    return { entity };
  } catch (error) {
    console.error(`[paddle-provision] POST ${endpoint} failed:`, error);
    return { error: extractPaddleError(error) };
  }
}

export async function getPaddleConnectionForUser(
  userId: string
): Promise<{ connectionId: string; integrationId: string } | { error: string }> {
  if (!isNangoConfigured()) {
    return { error: "NANGO_SECRET_KEY is not configured." };
  }
  const result = await syncNangoIntegration(userId, PADDLE_PROVIDER);
  if ("error" in result) return result;
  return { connectionId: result.connectionId, integrationId: getPaddleIntegrationId() };
}

export async function getPaddleApiKeyFromConnection(
  integrationId: string,
  connectionId: string
): Promise<{ apiKey: string } | { error: string }> {
  try {
    const nango = getNangoClient();
    const connection = await nango.getConnection(integrationId, connectionId);
    const credentials = connection.credentials as ApiKeyCredentials;
    const apiKey = credentials?.apiKey?.trim();
    if (!apiKey) return { error: "Paddle API key not found in Nango connection." };
    return { apiKey };
  } catch (error) {
    return { error: extractPaddleError(error) };
  }
}

export async function provisionPaddleForProject(params: {
  userId: string;
  projectName: string;
  siteUrl?: string;
  plans: ProjectPaddlePlan[];
}): Promise<PaddleProvisionResult | { error: string }> {
  const projectName = params.projectName.trim();
  if (!projectName) return { error: "Project name is required." };

  if (!params.plans.length) {
    return { error: "At least one billing plan is required." };
  }

  const connection = await getPaddleConnectionForUser(params.userId);
  if ("error" in connection) return connection;

  const apiKeyResult = await getPaddleApiKeyFromConnection(
    connection.integrationId,
    connection.connectionId
  );
  if ("error" in apiKeyResult) return apiKeyResult;

  const planPriceIds: Record<string, string> = {};

  for (const plan of params.plans) {
    const productResult = await paddlePost<{ id: string }>(
      connection.integrationId,
      connection.connectionId,
      "/products",
      {
        name: `${projectName} — ${plan.name}`,
        description: plan.description,
        tax_category: "saas",
      }
    );
    if ("error" in productResult) {
      return { error: `Failed to create ${plan.name} product: ${productResult.error}` };
    }

    const priceResult = await paddlePost<{ id: string }>(
      connection.integrationId,
      connection.connectionId,
      "/prices",
      buildPaddlePricePayload(plan, productResult.entity.id)
    );
    if ("error" in priceResult) {
      return { error: `Failed to create ${plan.name} price: ${priceResult.error}` };
    }
    planPriceIds[plan.id] = priceResult.entity.id;
  }

  const clientTokenResult = await paddlePost<{ id: string; token?: string }>(
    connection.integrationId,
    connection.connectionId,
    "/client-tokens",
    {
      name: `${projectName} checkout`,
      description: `Client-side token for ${projectName} pricing and checkout.`,
    }
  );
  if ("error" in clientTokenResult) {
    return { error: `Failed to create client token: ${clientTokenResult.error}` };
  }

  const clientToken = clientTokenResult.entity.token?.trim();
  if (!clientToken) return { error: "Paddle did not return a client token." };

  const webhookUrl = `${resolveSiteUrl(params.siteUrl)}/api/webhooks/paddle`;
  const notificationResult = await paddlePost<{ id: string; endpoint_secret_key?: string }>(
    connection.integrationId,
    connection.connectionId,
    "/notification-settings",
    {
      description: `${projectName} webhook destination`,
      type: "url",
      destination: webhookUrl,
      api_version: 1,
      traffic_source: "platform",
      subscribed_events: [...PADDLE_WEBHOOK_EVENTS],
    }
  );
  if ("error" in notificationResult) {
    return { error: `Failed to create webhook destination: ${notificationResult.error}` };
  }

  const webhookSecret = notificationResult.entity.endpoint_secret_key?.trim();
  if (!webhookSecret) return { error: "Paddle did not return a webhook secret." };

  return {
    apiKey: apiKeyResult.apiKey,
    clientToken,
    webhookSecret,
    webhookUrl,
    planPriceIds,
    notificationSettingId: notificationResult.entity.id,
    env: inferPaddleEnvFromClientToken(clientToken),
  };
}
