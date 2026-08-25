import { NextResponse } from "next/server";
import { isComposioConfigured } from "@/libs/composio";
import { listNgrokTunnels } from "@/libs/composio-ngrok";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY is not configured. Add it to your .env.local file." },
      { status: 503 }
    );
  }

  const result = await listNgrokTunnels(user.id);
  if ("error" in result) {
    const status = result.error.toLowerCase().includes("not connected") ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ tunnels: result.tunnels });
}
