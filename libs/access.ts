import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { requireUser } from "@/libs/supabase/require-user";

export type ProfileAccess = {
  has_access: boolean;
  subscription_status: string | null;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  paddle_price_id: string | null;
  current_period_end: string | null;
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
    return null;
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
