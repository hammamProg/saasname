import type { Subscription, Transaction } from "@paddle/paddle-node-sdk";
import { createSupabaseAdmin } from "@/libs/supabase";
import {
  getCurrentPeriodEnd,
  getPrimaryPriceId,
  getUserIdFromCustomData,
  getPaddleServer,
  subscriptionGrantsAccess,
  transactionGrantsAccess,
} from "@/libs/paddle/server";

type ProfileBillingUpdate = {
  has_access: boolean;
  paddle_customer_id: string;
  paddle_subscription_id: string;
  paddle_price_id: string | null;
  subscription_status: string;
  current_period_end: string | null;
  updated_at: string;
};

type SyncSubscriptionOptions = {
  userId?: string;
};

export async function syncSubscriptionToProfile(
  subscription: Subscription,
  options: SyncSubscriptionOptions = {}
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    console.error("[paddle] Supabase admin client not configured");
    return false;
  }

  const userId =
    options.userId ?? getUserIdFromCustomData(subscription.customData) ?? null;

  const update: ProfileBillingUpdate = {
    has_access: subscriptionGrantsAccess(subscription.status),
    paddle_customer_id: subscription.customerId,
    paddle_subscription_id: subscription.id,
    paddle_price_id: getPrimaryPriceId(subscription),
    subscription_status: subscription.status,
    current_period_end: getCurrentPeriodEnd(subscription),
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        ...update,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[paddle] Failed to sync profile by user_id:", error.message);
      return false;
    }

    return true;
  }

  const { error: customerError } = await supabase
    .from("profiles")
    .update(update)
    .eq("paddle_customer_id", subscription.customerId);

  if (!customerError) {
    return true;
  }

  const { error: subscriptionError } = await supabase
    .from("profiles")
    .update(update)
    .eq("paddle_subscription_id", subscription.id);

  if (subscriptionError) {
    console.error("[paddle] Failed to sync profile:", subscriptionError.message);
    return false;
  }

  return true;
}

function getPrimaryPriceIdFromTransaction(transaction: Transaction): string | null {
  return transaction.items[0]?.price?.id ?? null;
}

export async function syncTransactionToProfile(
  transaction: Transaction,
  options: SyncSubscriptionOptions = {}
): Promise<boolean> {
  if (!transactionGrantsAccess(transaction.status)) {
    return false;
  }

  const userId =
    options.userId ?? getUserIdFromCustomData(transaction.customData) ?? null;

  if (!userId) {
    console.error("[paddle] transaction.completed missing user_id in customData");
    return false;
  }

  if (transaction.subscriptionId) {
    const paddle = getPaddleServer();
    const subscription = await paddle.subscriptions.get(transaction.subscriptionId);
    return syncSubscriptionToProfile(subscription, { userId });
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    console.error("[paddle] Supabase admin client not configured");
    return false;
  }

  const update: ProfileBillingUpdate = {
    has_access: true,
    paddle_customer_id: transaction.customerId ?? "",
    paddle_subscription_id: transaction.id,
    paddle_price_id: getPrimaryPriceIdFromTransaction(transaction),
    subscription_status: "lifetime",
    current_period_end: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      ...update,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[paddle] Failed to sync lifetime purchase:", error.message);
    return false;
  }

  return true;
}
