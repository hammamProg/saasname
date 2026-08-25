import { getPaddleServer, getUserIdFromCustomData } from "@/libs/paddle/server";
import { syncSubscriptionToProfile, syncTransactionToProfile } from "@/libs/paddle/sync-profile";

const MAX_SCAN = 150;

export async function syncAccessFromPaddle(userId: string): Promise<boolean> {
  const paddle = getPaddleServer();

  let scanned = 0;
  const subscriptionCollection = paddle.subscriptions.list({
    status: ["active", "trialing"],
    perPage: 30,
  });

  for await (const subscription of subscriptionCollection) {
    scanned += 1;
    if (getUserIdFromCustomData(subscription.customData) === userId) {
      return syncSubscriptionToProfile(subscription, { userId });
    }
    if (scanned >= MAX_SCAN) {
      break;
    }
  }

  scanned = 0;
  const transactionCollection = paddle.transactions.list({
    status: ["completed", "paid"],
    perPage: 30,
  });

  for await (const transaction of transactionCollection) {
    scanned += 1;
    if (getUserIdFromCustomData(transaction.customData) === userId) {
      return syncTransactionToProfile(transaction, { userId });
    }
    if (scanned >= MAX_SCAN) {
      break;
    }
  }

  return false;
}
