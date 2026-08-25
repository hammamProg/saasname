import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";
import { getPaddleServer, isPaddleServerConfigured } from "@/libs/paddle/server";

export async function POST() {
  if (!isPaddleServerConfigured()) {
    return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
  }

  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[paddle/portal] Profile lookup failed:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  if (!profile?.paddle_customer_id || !profile?.paddle_subscription_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  try {
    const paddle = getPaddleServer();
    const session = await paddle.customerPortalSessions.create(
      profile.paddle_customer_id,
      [profile.paddle_subscription_id]
    );

    return NextResponse.json({ url: session.urls.general.overview });
  } catch (portalError) {
    console.error("[paddle/portal] Failed to create portal session:", portalError);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
