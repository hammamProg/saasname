import { NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import type { Subscription, Transaction } from "@paddle/paddle-node-sdk";
import { getPaddleServer, getUserIdFromCustomData } from "@/libs/paddle/server";
import { syncSubscriptionToProfile, syncTransactionToProfile } from "@/libs/paddle/sync-profile";
import { grantCreditsForTransaction } from "@/libs/credits/grant";

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
      case EventName.TransactionCompleted: {
        const transaction = event.data as Transaction;
        const granted = await grantCreditsForTransaction(
          transaction as unknown as {
            id: string;
            customData: unknown;
            items: Array<{ price?: { id?: string } | null }>;
          }
        );

        // A transaction is either a credit-pack purchase or a subscription
        // payment, never both. Doing both for one transaction would be wrong.
        if (granted > 0) {
          console.info("[paddle/webhook] Granted credits:", granted);
          break;
        }

        await syncFromTransaction(transaction);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paddle/webhook] Verification or handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}
