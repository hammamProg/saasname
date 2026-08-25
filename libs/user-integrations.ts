import { createSupabaseAdmin } from "@/libs/supabase";

export type UserIntegrationRecord = {
  id: string;
  user_id: string;
  provider: string;
  connection_id: string | null;
  organization_id: string | null;
  organization_name: string | null;
  created_at: string;
  updated_at: string;
};

function admin() {
  const client = createSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase admin client is not configured");
  }
  return client;
}

export async function getUserIntegration(
  userId: string,
  provider: string
): Promise<UserIntegrationRecord | null> {
  const { data, error } = await admin()
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as UserIntegrationRecord | null;
}

export async function upsertUserIntegration(params: {
  userId: string;
  provider: string;
  connectionId?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
}): Promise<UserIntegrationRecord> {
  const row = {
    user_id: params.userId,
    provider: params.provider,
    connection_id: params.connectionId ?? null,
    organization_id: params.organizationId ?? null,
    organization_name: params.organizationName ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin()
    .from("user_integrations")
    .upsert(row, { onConflict: "user_id,provider" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save integration metadata");
  }
  return data as UserIntegrationRecord;
}

export async function clearUserIntegration(userId: string, provider: string): Promise<void> {
  const { error } = await admin()
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearUserIntegrationByConnectionId(connectionId: string): Promise<void> {
  const { error } = await admin()
    .from("user_integrations")
    .delete()
    .eq("connection_id", connectionId);

  if (error) {
    throw new Error(error.message);
  }
}
