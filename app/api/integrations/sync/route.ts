import { NextResponse } from "next/server";
import { isComposioConfigured, listIntegrations } from "@/libs/composio";
import { syncSupabaseIntegrationMetadata, SUPABASE_PROVIDER } from "@/libs/composio-supabase-sync";
import { getUserIntegration } from "@/libs/user-integrations";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: "COMPOSIO_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: { appName?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const appName = body.appName?.trim() ?? SUPABASE_PROVIDER;
  if (appName !== SUPABASE_PROVIDER) {
    return NextResponse.json({ success: false, error: "Unsupported integration" }, { status: 400 });
  }

  const integrations = await listIntegrations(user.id);
  const supabase = integrations.find((item) => item.appName === SUPABASE_PROVIDER);
  if (!supabase?.connected || !supabase.connectionId) {
    return NextResponse.json(
      { success: false, error: "Supabase is not connected." },
      { status: 400 }
    );
  }

  const synced = await syncSupabaseIntegrationMetadata(user.id, supabase.connectionId);
  if ("error" in synced) {
    return NextResponse.json({ success: false, error: synced.error }, { status: 400 });
  }

  const record = await getUserIntegration(user.id, SUPABASE_PROVIDER);
  return NextResponse.json({
    success: true,
    organizationId: synced.organizationId,
    organizationName: synced.organizationName,
    record,
  });
}
