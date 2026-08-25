import { listSupabaseOrganizations } from "@/libs/composio-supabase-remote";
import { upsertUserIntegration, clearUserIntegration } from "@/libs/user-integrations";

const SUPABASE_PROVIDER = "supabase";

export async function syncSupabaseIntegrationMetadata(
  userId: string,
  connectionId: string
): Promise<{ organizationId: string; organizationName: string } | { error: string }> {
  const orgs = await listSupabaseOrganizations(userId, connectionId);
  if ("error" in orgs) {
    return { error: orgs.error };
  }
  if (orgs.length === 0) {
    return { error: "No Supabase organization found for this connection." };
  }

  const primary = orgs[0];
  await upsertUserIntegration({
    userId,
    provider: SUPABASE_PROVIDER,
    connectionId,
    organizationId: primary.id,
    organizationName: primary.name,
  });

  return { organizationId: primary.id, organizationName: primary.name };
}

export async function clearSupabaseIntegrationMetadata(userId: string): Promise<void> {
  await clearUserIntegration(userId, SUPABASE_PROVIDER);
}

export { SUPABASE_PROVIDER };
