import { isComposioConfigured } from "@/libs/composio";
import { applySupabaseAuthSchemaStep } from "@/libs/composio-supabase-sql";
import { getSupabaseConnection } from "@/libs/composio-supabase";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import {
  normalizeSupabaseAuthSchemaApplied,
  normalizeSupabaseAuthSchemaOptions,
  type SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_AUTH_SETUP_STEP_LABELS,
  schemaOptionForStep,
  type SupabaseAuthSetupStep,
  type SupabaseAuthSetupStepId,
} from "@/libs/supabase-setup-auth-steps";

export type SchemaSetupContext = {
  project: Project;
  connectionId: string;
  projectRef: string;
  schemaOptions: SupabaseAuthSchemaOptions;
};

export type SchemaSetupContextError = {
  error: string;
  code?: string;
  status: number;
};

export async function loadAuthSchemaSetupContext(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  body: { schema_options?: Partial<SupabaseAuthSchemaOptions> }
): Promise<SchemaSetupContext | SchemaSetupContextError> {
  if (!isComposioConfigured()) {
    return {
      error: "COMPOSIO_API_KEY is not configured. Add it to your .env.local file.",
      status: 503,
    };
  }

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { error: "Something went wrong", status: 500 };
  }
  if (!project) {
    return { error: "Project not found", status: 404 };
  }
  if (!project.supabase_project_ref) {
    return {
      error: "Create a Supabase project first.",
      code: "SUPABASE_PROJECT_MISSING",
      status: 400,
    };
  }

  const connection = await getSupabaseConnection(userId);
  if (!connection) {
    return {
      error: "Connect Supabase first in Integrations.",
      code: "SUPABASE_NOT_CONNECTED",
      status: 400,
    };
  }

  const schemaOptions = normalizeSupabaseAuthSchemaOptions({
    ...normalizeSupabaseAuthSchemaOptions(project.supabase_auth_schema_options),
    ...body.schema_options,
  });

  return {
    project: project as Project,
    connectionId: connection.connectionId,
    projectRef: project.supabase_project_ref,
    schemaOptions,
  };
}

export async function runAuthSchemaSetupStep(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  context: SchemaSetupContext,
  step: Extract<SupabaseAuthSetupStepId, "schema_leads" | "schema_profiles">
): Promise<
  | { step: SupabaseAuthSetupStep; data: Project }
  | { step: SupabaseAuthSetupStep; error: string; status: number }
> {
  const { project, connectionId, projectRef, schemaOptions } = context;
  const applied = normalizeSupabaseAuthSchemaApplied(project.supabase_auth_schema_applied);
  const schemaId = schemaOptionForStep(step);

  let stepResult: SupabaseAuthSetupStep;

  if (!schemaId || !schemaOptions[schemaId]) {
    stepResult = {
      id: step,
      label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
      status: "done",
      detail: "Skipped — not selected.",
    };
  } else if (applied[schemaId]) {
    stepResult = {
      id: step,
      label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
      status: "done",
      detail: "Already applied.",
    };
  } else {
    const sqlResult = await applySupabaseAuthSchemaStep(userId, connectionId, projectRef, step);
    if ("error" in sqlResult) {
      return {
        step: {
          id: step,
          label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
          status: "error",
          detail: sqlResult.error,
        },
        error: sqlResult.error,
        status: 400,
      };
    }
    stepResult = {
      id: step,
      label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
      status: "done",
    };
  }

  const nextApplied = { ...applied };
  if (schemaId && schemaOptions[schemaId] && stepResult.status === "done" && !applied[schemaId]) {
    nextApplied[schemaId] = true;
  }

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      supabase_auth_schema_options: schemaOptions,
      supabase_auth_schema_applied: nextApplied,
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    return {
      step: {
        ...stepResult,
        status: "error",
        detail: "Step succeeded but failed to save to your project.",
      },
      error: "Step succeeded but failed to save to your project.",
      status: 400,
    };
  }

  return { step: stepResult, data: updated as Project };
}

export async function persistAuthSchemaOptions(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  schemaOptions: SupabaseAuthSchemaOptions
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .update({ supabase_auth_schema_options: schemaOptions })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return data as Project;
}
