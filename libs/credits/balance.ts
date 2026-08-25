import { cache } from "react";
import { createClient } from "@/libs/supabase/server";

/** Reads a user's credit balance.
 *
 *  Uses the user-scoped client on purpose: `public.credit_balance` raises
 *  FORBIDDEN when `auth.uid()` is non-null and differs from `p_user_id`, so this
 *  helper can only ever read the signed-in user's own balance — passing someone
 *  else's id yields 0, not their number.
 *
 *  Returns 0 on error rather than throwing — a failed read must never be
 *  mistaken for a successful purchase. */
export const getCreditBalance = cache(async function getCreditBalance(
  userId: string
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("credit_balance", { p_user_id: userId });

  if (error) {
    console.error("[credits] Failed to read balance:", error.message);
    return 0;
  }

  return (data as number) ?? 0;
});
