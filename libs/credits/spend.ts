import { createSupabaseAdmin } from "@/libs/supabase";
import { InsufficientCreditsError } from "@/libs/credits/errors";

type SpendArgs = {
  userId: string;
  amount: number;
  reason: string;
  searchId?: string;
};

/** Debits credits atomically and returns the new balance.
 *
 *  Uses the service-role client deliberately. `public.spend_credits` is granted
 *  to `authenticated` too, but it raises FORBIDDEN whenever `auth.uid()` is
 *  non-null and differs from `p_user_id` — so a user-scoped client can only ever
 *  debit itself. Server-side spends (background jobs, webhooks, actions running
 *  on behalf of a user) go through the service role, where `auth.uid()` is null
 *  and the guard is bypassed. Callers are responsible for having already
 *  authorised the userId they pass in.
 *
 *  Throws {@link InsufficientCreditsError} when the balance is too low, so
 *  callers can distinguish "needs to buy credits" from a real failure. */
export async function spendCredits({
  userId,
  amount,
  reason,
  searchId,
}: SpendArgs): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be positive");
  }

  const admin = createSupabaseAdmin();

  if (!admin) {
    throw new Error("Supabase admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY");
  }

  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_search_id: searchId ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) {
      throw new InsufficientCreditsError();
    }
    throw new Error(`Failed to spend credits: ${error.message}`);
  }

  return data as number;
}
