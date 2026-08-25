import { executeComposioTool } from "@/libs/composio-execute";
import {
  sqlForSchemaOption,
  type SupabaseAuthSchemaOptionId,
} from "@/libs/supabase-auth-schema";
import { schemaOptionForStep, type SupabaseAuthSetupStepId } from "@/libs/supabase-setup-auth-steps";

export async function runSupabaseSqlQuery(
  userId: string,
  connectionId: string,
  projectRef: string,
  query: string
): Promise<{ ok: true } | { error: string }> {
  const result = await executeComposioTool("SUPABASE_BETA_RUN_SQL_QUERY", {
    userId,
    connectionId,
    arguments: {
      ref: projectRef,
      query,
    },
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return { ok: true };
}

export async function applySupabaseAuthSchemaStep(
  userId: string,
  connectionId: string,
  projectRef: string,
  stepId: SupabaseAuthSetupStepId
): Promise<{ ok: true; schemaId: SupabaseAuthSchemaOptionId } | { error: string }> {
  const schemaId = schemaOptionForStep(stepId);
  if (!schemaId) {
    return { error: "Invalid schema step." };
  }

  const result = await runSupabaseSqlQuery(
    userId,
    connectionId,
    projectRef,
    sqlForSchemaOption(schemaId)
  );
  if ("error" in result) {
    return result;
  }
  return { ok: true, schemaId };
}
