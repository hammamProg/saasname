import { NextResponse } from "next/server";
import { isComposioConfigured, listIntegrations } from "@/libs/composio";
import { syncSupabaseIntegrationMetadata, SUPABASE_PROVIDER } from "@/libs/composio-supabase-sync";
import { isNangoConfigured, listNangoIntegrations } from "@/libs/nango";
import { getAuthUser, unauthorizedResponse } from "@/libs/supabase/auth-api";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return unauthorizedResponse();
  }

  if (!isComposioConfigured() && !isNangoConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Integration providers are not configured. Add COMPOSIO_API_KEY and/or NANGO_SECRET_KEY to your .env.local file.",
      },
      { status: 503 }
    );
  }

  try {
    const [composioIntegrations, nangoIntegrations] = await Promise.all([
      isComposioConfigured()
        ? listIntegrations(user.id)
        : Promise.resolve([]),
      listNangoIntegrations(user.id),
    ]);

    const integrations = [...composioIntegrations, ...nangoIntegrations];

    const supabase = integrations.find((item) => item.appName === SUPABASE_PROVIDER);
    if (supabase?.connected && supabase.connectionId && isComposioConfigured()) {
      await syncSupabaseIntegrationMetadata(user.id, supabase.connectionId).catch((error) => {
        console.warn("[integrations] Supabase org sync failed:", error);
      });
    }

    return NextResponse.json({ success: true, integrations });
  } catch (error) {
    console.error("[integrations] Failed to list integrations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch integrations",
      },
      { status: 500 }
    );
  }
}
