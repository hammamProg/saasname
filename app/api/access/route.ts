import { NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { getProfileAccess } from "@/libs/access";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const access = await getProfileAccess(user.id);

  return NextResponse.json({
    has_access: access?.has_access ?? false,
    subscription_status: access?.subscription_status ?? null,
    current_period_end: access?.current_period_end ?? null,
  });
}
