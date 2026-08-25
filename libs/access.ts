import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";
import { isPaywallBypassEnabled } from "@/libs/dev-unlock";

export type ProfileAccess = {
  has_access: boolean;
  subscription_status: string | null;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  paddle_price_id: string | null;
  current_period_end: string | null;
};

/** Synthetic paid profile used only when DEV_UNLOCK_PAYMENTS is on. */
const DEV_UNLOCKED_ACCESS: ProfileAccess = {
  has_access: true,
  subscription_status: "active",
  paddle_customer_id: null,
  paddle_subscription_id: null,
  paddle_price_id: null,
  current_period_end: null,
};

export const getProfileAccess = cache(async function getProfileAccess(
  userId: string
): Promise<ProfileAccess | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "has_access, subscription_status, paddle_customer_id, paddle_subscription_id, paddle_price_id, current_period_end"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[access] Failed to load profile access:", error.message);
    return isPaywallBypassEnabled() ? DEV_UNLOCKED_ACCESS : null;
  }

  if (isPaywallBypassEnabled()) {
    console.warn("[access] DEV_UNLOCK_PAYMENTS is on — granting access without a subscription.");
    // Keep any real Paddle ids so the billing portal still works; only the
    // gate itself is forced open.
    return {
      ...(data ?? DEV_UNLOCKED_ACCESS),
      has_access: true,
      subscription_status: data?.subscription_status ?? "active",
    };
  }

  return data;
});

export const requireAccess = cache(async function requireAccess(): Promise<ProfileAccess> {
  const user = await requireUser();
  const access = await getProfileAccess(user.id);

  if (!access?.has_access) {
    redirect("/dashboard");
  }

  return access;
});
