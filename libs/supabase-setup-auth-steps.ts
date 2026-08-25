import {
  normalizeSupabaseAuthSchemaApplied,
  normalizeSupabaseAuthSchemaOptions,
  selectedSchemaOptionIds,
  SUPABASE_AUTH_SCHEMA_OPTION_META,
  type SupabaseAuthSchemaOptionId,
  type SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";

export type SupabaseAuthSetupStepId =
  | "ready"
  | "keys"
  | "schema_leads"
  | "schema_profiles"
  | "auth";

export type SupabaseAuthSetupStepStatus = "pending" | "running" | "done" | "error";

export type SupabaseAuthSetupStep = {
  id: SupabaseAuthSetupStepId;
  label: string;
  status: SupabaseAuthSetupStepStatus;
  detail?: string;
};

export const SUPABASE_AUTH_SETUP_STEP_LABELS: Record<SupabaseAuthSetupStepId, string> = {
  ready: "Wait for project to be ready",
  keys: "Fetch API keys",
  schema_leads: SUPABASE_AUTH_SCHEMA_OPTION_META.leads.label,
  schema_profiles: SUPABASE_AUTH_SCHEMA_OPTION_META.profiles.label,
  auth: "Configure Email + Google auth",
};

const BASE_STEP_ORDER: SupabaseAuthSetupStepId[] = ["ready", "keys", "auth"];

export function buildSupabaseAuthStepOrder(
  options: SupabaseAuthSchemaOptions
): SupabaseAuthSetupStepId[] {
  const selected = selectedSchemaOptionIds(options);
  const schemaSteps = selected.map(
    (id): SupabaseAuthSetupStepId => (id === "leads" ? "schema_leads" : "schema_profiles")
  );
  return ["ready", "keys", ...schemaSteps, "auth"];
}

export function initialSupabaseAuthSetupSteps(
  options: SupabaseAuthSchemaOptions = normalizeSupabaseAuthSchemaOptions(null)
): SupabaseAuthSetupStep[] {
  return buildSupabaseAuthStepOrder(options).map((id) => ({
    id,
    label: SUPABASE_AUTH_SETUP_STEP_LABELS[id],
    status: "pending" as SupabaseAuthSetupStepStatus,
  }));
}

export function runningSupabaseAuthSetupSteps(
  options: SupabaseAuthSchemaOptions = normalizeSupabaseAuthSchemaOptions(null)
): SupabaseAuthSetupStep[] {
  return initialSupabaseAuthSetupSteps(options).map((step) => ({
    ...step,
    status: "running" as SupabaseAuthSetupStepStatus,
  }));
}

export function deriveSupabaseAuthStepsFromProject(project: {
  supabase_project_ref?: string | null;
  supabase_anon_key?: string | null;
  supabase_auth_configured?: boolean;
  supabase_auth_schema_options?: unknown;
  supabase_auth_schema_applied?: unknown;
}): SupabaseAuthSetupStep[] {
  const options = normalizeSupabaseAuthSchemaOptions(project.supabase_auth_schema_options);
  const applied = normalizeSupabaseAuthSchemaApplied(project.supabase_auth_schema_applied);

  return buildSupabaseAuthStepOrder(options).map((step) => {
    if (step === "ready" && project.supabase_project_ref) {
      return { id: step, label: SUPABASE_AUTH_SETUP_STEP_LABELS[step], status: "done" as const };
    }
    if (step === "keys" && project.supabase_anon_key) {
      return {
        id: step,
        label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
        status: "done" as const,
        detail: "Anon key saved — copy it below.",
      };
    }
    if (step === "schema_leads" && applied.leads) {
      return { id: step, label: SUPABASE_AUTH_SETUP_STEP_LABELS[step], status: "done" as const };
    }
    if (step === "schema_profiles" && applied.profiles) {
      return { id: step, label: SUPABASE_AUTH_SETUP_STEP_LABELS[step], status: "done" as const };
    }
    if (step === "auth" && project.supabase_auth_configured) {
      return { id: step, label: SUPABASE_AUTH_SETUP_STEP_LABELS[step], status: "done" as const };
    }
    return {
      id: step,
      label: SUPABASE_AUTH_SETUP_STEP_LABELS[step],
      status: "pending" as const,
    };
  });
}

export function markAuthStepRunning(
  steps: SupabaseAuthSetupStep[],
  stepId: SupabaseAuthSetupStepId
): SupabaseAuthSetupStep[] {
  return steps.map((step) =>
    step.id === stepId
      ? { ...step, status: "running" as SupabaseAuthSetupStepStatus, detail: undefined }
      : step
  );
}

export function isSupabaseAuthSetupStepId(value: string): value is SupabaseAuthSetupStepId {
  return (
    value === "ready" ||
    value === "keys" ||
    value === "schema_leads" ||
    value === "schema_profiles" ||
    value === "auth"
  );
}

export function schemaOptionForStep(
  stepId: SupabaseAuthSetupStepId
): SupabaseAuthSchemaOptionId | null {
  if (stepId === "schema_leads") return "leads";
  if (stepId === "schema_profiles") return "profiles";
  return null;
}

export { BASE_STEP_ORDER };
