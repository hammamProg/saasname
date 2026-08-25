import { NextResponse } from "next/server";
import { disconnectIntegration, isComposioConfigured, listIntegrations } from "@/libs/composio";
import {
  clearSupabaseIntegrationMetadata,
  SUPABASE_PROVIDER,
} from "@/libs/composio-supabase-sync";
import {
  disconnectNangoIntegration,
  isNangoIntegration,
} from "@/libs/nango";
import { clearUserIntegrationByConnectionId } from "@/libs/user-integrations";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  let body: { connectionId?: string; appName?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const connectionId = body.connectionId?.trim();
  const appName = body.appName?.trim();

  if (!connectionId) {
    return NextResponse.json(
      { success: false, error: "connectionId is required" },
      { status: 400 }
    );
  }

  if (!appName) {
    return NextResponse.json({ success: false, error: "appName is required" }, { status: 400 });
  }

  if (isNangoIntegration(appName)) {
    const result = await disconnectNangoIntegration(appName, connectionId);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    await clearUserIntegrationByConnectionId(connectionId).catch((error) => {
      console.warn("[integrations] Failed to clear integration metadata:", error);
    });

    return NextResponse.json({ success: true });
  }

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: "COMPOSIO_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const result = await disconnectIntegration(connectionId);

  if ("error" in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await clearUserIntegrationByConnectionId(connectionId).catch((error) => {
    console.warn("[integrations] Failed to clear integration metadata:", error);
  });

  const integrations = await listIntegrations(user.id);
  const stillConnected = integrations.some(
    (item) => item.appName === SUPABASE_PROVIDER && item.connected
  );
  if (!stillConnected) {
    await clearSupabaseIntegrationMetadata(user.id).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
