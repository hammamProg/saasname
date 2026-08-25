import { NextResponse } from "next/server";
import { isNangoConfigured, isNangoIntegration, syncNangoIntegration } from "@/libs/nango";
import { upsertUserIntegration } from "@/libs/user-integrations";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isNangoConfigured()) {
    return NextResponse.json(
      { success: false, error: "NANGO_SECRET_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: { appName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const appName = body.appName?.trim();
  if (!appName || !isNangoIntegration(appName)) {
    return NextResponse.json({ success: false, error: "Unsupported integration" }, { status: 400 });
  }

  const synced = await syncNangoIntegration(user.id, appName);
  if ("error" in synced) {
    return NextResponse.json({ success: false, error: synced.error }, { status: 400 });
  }

  const record = await upsertUserIntegration({
    userId: user.id,
    provider: appName,
    connectionId: synced.connectionId,
  });

  return NextResponse.json({
    success: true,
    connectionId: synced.connectionId,
    integrationId: synced.integrationId,
    record,
  });
}
