import { NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import type { Subscription, Transaction } from "@paddle/paddle-node-sdk";
import { getPaddleServer, getUserIdFromCustomData } from "@/libs/paddle/server";
import { syncSubscriptionToProfile, syncTransactionToProfile } from "@/libs/paddle/sync-profile";

export const runtime = "nodejs";

async function syncFromTransaction(transaction: Transaction) {
  const userId = getUserIdFromCustomData(transaction.customData) ?? undefined;

  if (transaction.subscriptionId) {
    const paddle = getPaddleServer();
    const subscription = await paddle.subscriptions.get(transaction.subscriptionId);
    await syncSubscriptionToProfile(subscription, { userId });
    return;
  }

  await syncTransactionToProfile(transaction, { userId });
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("[paddle/webhook] PADDLE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const paddle = getPaddleServer();
    const event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);

    console.info("[paddle/webhook] Received:", event.eventType);

    switch (event.eventType) {
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
        await syncSubscriptionToProfile(event.data as Subscription, {
          userId: getUserIdFromCustomData((event.data as Subscription).customData) ?? undefined,
        });
        break;
      case EventName.TransactionCompleted:
        await syncFromTransaction(event.data as Transaction);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paddle/webhook] Verification or handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}
