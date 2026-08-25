import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import type { Subscription } from "@paddle/paddle-node-sdk";

let paddleInstance: Paddle | null = null;

export function isPaddleServerConfigured(): boolean {
  return !!process.env.PADDLE_API_KEY?.trim();
}

export function getPaddleEnvironment(): Environment {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;
}

export function getPaddleServer(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not configured");
  }

  if (!paddleInstance) {
    paddleInstance = new Paddle(apiKey, { environment: getPaddleEnvironment() });
  }

  return paddleInstance;
}

export function subscriptionGrantsAccess(status: string): boolean {
  return status === "active" || status === "trialing";
}

export function getUserIdFromCustomData(customData: unknown): string | null {
  if (!customData || typeof customData !== "object") {
    return null;
  }

  const data = customData as Record<string, unknown>;
  const userId = data.user_id ?? data.userId ?? data.supabase_user_id;

  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export function transactionGrantsAccess(status: string): boolean {
  return status === "completed" || status === "paid";
}

export function getPrimaryPriceId(subscription: Subscription): string | null {
  return subscription.items[0]?.price.id ?? null;
}

export function getCurrentPeriodEnd(subscription: Subscription): string | null {
  return subscription.currentBillingPeriod?.endsAt ?? null;
}
