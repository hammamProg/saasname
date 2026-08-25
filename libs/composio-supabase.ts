import { listIntegrations } from "@/libs/composio";
import { executeComposioTool, unwrapPayload } from "@/libs/composio-execute";
import { siteUrl } from "@/libs/seo";

const SUPABASE_TOOLKIT = "supabase";

export async function getSupabaseConnection(userId: string) {
  const integrations = await listIntegrations(userId);
  const supabase = integrations.find((item) => item.appName === SUPABASE_TOOLKIT);
  if (!supabase?.connected || !supabase.connectionId) return null;
  return { connectionId: supabase.connectionId };
}

export type SupabaseAuthSetup = {
  siteUrl: string;
  redirectUrls: string[];
  callbackUrl: string;
};

export function buildSupabaseAuthUrls(projectRef: string): SupabaseAuthSetup {
  const localSite =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : siteUrl);
  const redirectUrls = [`${localSite}/auth/callback`, `${localSite}/auth/callback?**`];
  return {
    siteUrl: localSite,
    redirectUrls,
    callbackUrl: `https://${projectRef}.supabase.co/auth/v1/callback`,
  };
}

export async function setupSupabaseAuth(
  userId: string,
  connectionId: string,
  params: {
    projectRef: string;
    googleClientId?: string | null;
    googleClientSecret?: string | null;
  }
): Promise<SupabaseAuthSetup | { error: string }> {
  const authUrls = buildSupabaseAuthUrls(params.projectRef);
  const authArguments: Record<string, unknown> = {
    ref: params.projectRef,
    site_url: authUrls.siteUrl,
    uri_allow_list: authUrls.redirectUrls.join(","),
    external_email_enabled: true,
    external_google_enabled: true,
    mailer_autoconfirm: false,
  };
  if (params.googleClientId?.trim()) {
    authArguments.external_google_client_id = params.googleClientId.trim();
  }
  if (params.googleClientSecret?.trim()) {
    authArguments.external_google_secret = params.googleClientSecret.trim();
  }
  const result = await executeComposioTool("SUPABASE_UPDATE_PROJECT_AUTH_CONFIG", {
    userId,
    connectionId,
    arguments: authArguments,
  });
  if ("error" in result) return { error: result.error };
  return authUrls;
}

export { createSupabaseProject, createSupabaseProjectRef, fetchSupabaseProjectKeys } from "@/libs/composio-supabase-create";
