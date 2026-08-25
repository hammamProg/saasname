import { NextResponse } from "next/server";
import { getProfileAccess } from "@/libs/access";
import { isPaddleServerConfigured } from "@/libs/paddle/server";
import { syncAccessFromPaddle } from "@/libs/paddle/sync-user-access";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function POST() {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const existing = await getProfileAccess(user.id);

  if (existing?.has_access) {
    return NextResponse.json({
      synced: true,
      has_access: true,
      subscription_status: existing.subscription_status,
      current_period_end: existing.current_period_end,
    });
  }

  if (!isPaddleServerConfigured()) {
    return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
  }

  try {
    const synced = await syncAccessFromPaddle(user.id);
    const access = await getProfileAccess(user.id);

    return NextResponse.json({
      synced,
      has_access: access?.has_access ?? false,
      subscription_status: access?.subscription_status ?? null,
      current_period_end: access?.current_period_end ?? null,
    });
  } catch (error) {
    console.error("[paddle/sync] Failed to sync access:", error);
    return NextResponse.json({ error: "Failed to sync Paddle access" }, { status: 500 });
  }
}
