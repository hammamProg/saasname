import { createSupabaseAdmin } from "@/libs/supabase";
import { getUserIdFromCustomData } from "@/libs/paddle/server";
import { creditsForPriceId } from "@/libs/credits/packs";

type TransactionLike = {
  id: string;
  customData: unknown;
  items: Array<{ price?: { id?: string } | null }>;
};

/** Grants credits for a completed Paddle transaction.
 *  Returns the number of credits granted; 0 when the transaction contains no
 *  recognised credit pack (a subscription payment, for example). */
export async function grantCreditsForTransaction(
  transaction: TransactionLike
): Promise<number> {
  const userId = getUserIdFromCustomData(transaction.customData);

  if (!userId) {
    console.error("[credits] Transaction has no userId:", transaction.id);
    return 0;
  }

  const total = transaction.items.reduce((sum, item) => {
    const credits = creditsForPriceId(item.price?.id ?? "");
    return credits ? sum + credits : sum;
  }, 0);

  if (total === 0) {
    return 0;
  }

  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error(
      "Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  // grant_credits is service-role only; the reason carries the transaction id
  // so a grant can always be traced back to the payment that caused it.
  const { error } = await admin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: total,
    p_reason: `purchase:${transaction.id}`,
  });

  if (error) {
    // Throwing makes Paddle retry the webhook rather than silently losing
    // credits the customer has already paid for.
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  return total;
}
