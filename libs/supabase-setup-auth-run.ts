import type { StepId } from "@/app/types";
import { isComposioConfigured } from "@/libs/composio";
import {
  fetchSupabaseProjectKeys,
  getSupabaseConnection,
  setupSupabaseAuth,
} from "@/libs/composio-supabase";
import { waitForProjectReady } from "@/libs/composio-supabase-create";
import { PROJECT_COLUMNS } from "@/libs/project-fields";
import type { Project } from "@/libs/projects";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_AUTH_SETUP_STEP_LABELS,
  type SupabaseAuthSetupStep,
  type SupabaseAuthSetupStepId,
} from "@/libs/supabase-setup-auth-steps";

type SetupContext = {
  project: Project;
  connectionId: string;
  projectRef: string;
  googleClientId: string | null;
  googleOauthSecret: string | null;
};

export type SetupContextError = {
  error: string;
  code?: string;
  status: number;
};

export async function loadSupabaseAuthSetupContext(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  body: { google_client_id?: string; google_client_secret?: string }
): Promise<SetupContext | SetupContextError> {
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

  return {
    project: project as Project,
    connectionId: connection.connectionId,
    projectRef: project.supabase_project_ref,
    googleClientId: body.google_client_id?.trim() || project.google_oauth_client_id || null,
    googleOauthSecret:
      body.google_client_secret?.trim() || project.google_oauth_client_secret || null,
  };
}

export async function runSupabaseAuthSetupStep(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  context: SetupContext,
  step: SupabaseAuthSetupStepId
): Promise<
  | { step: SupabaseAuthSetupStep; data: Project }
  | { step: SupabaseAuthSetupStep; error: string; status: number }
> {
  const { project, connectionId, projectRef, googleClientId, googleOauthSecret } = context;

  if (step === "auth" && (!googleClientId || !googleOauthSecret)) {
    return {
      step: {
        id: "auth",
        label: SUPABASE_AUTH_SETUP_STEP_LABELS.auth,
        status: "error",
        detail: "Save Google OAuth credentials in step 3 first.",
      },
      error: "Save Google OAuth credentials in step 3 first.",
      status: 400,
    };
  }

  let stepResult: SupabaseAuthSetupStep;
  const updatePayload: Record<string, unknown> = {};

  if (step === "ready") {
    const ready = await waitForProjectReady(userId, connectionId, projectRef);
    if (ready.error) {
      return {
        step: {
          id: "ready",
          label: SUPABASE_AUTH_SETUP_STEP_LABELS.ready,
          status: "error",
          detail: ready.error,
        },
        error: ready.error,
        status: 400,
      };
    }
    stepResult = {
      id: "ready",
      label: SUPABASE_AUTH_SETUP_STEP_LABELS.ready,
      status: "done",
    };
  } else if (step === "keys") {
    const ready = await waitForProjectReady(userId, connectionId, projectRef);
    if (ready.error) {
      return {
        step: {
          id: "keys",
          label: SUPABASE_AUTH_SETUP_STEP_LABELS.keys,
          status: "error",
          detail: ready.error,
        },
        error: ready.error,
        status: 400,
      };
    }

    const keys = await fetchSupabaseProjectKeys(userId, connectionId, projectRef);
    if ("error" in keys) {
      return {
        step: {
          id: "keys",
          label: SUPABASE_AUTH_SETUP_STEP_LABELS.keys,
          status: "error",
          detail: keys.error,
        },
        error: keys.error,
        status: 400,
      };
    }
    updatePayload.supabase_project_url = keys.projectUrl;
    updatePayload.supabase_anon_key = keys.anonKey;
    updatePayload.supabase_service_role_key = keys.serviceRoleKey || null;
    stepResult = {
      id: "keys",
      label: SUPABASE_AUTH_SETUP_STEP_LABELS.keys,
      status: "done",
      detail: "Anon key saved — copy it below.",
    };
  } else {
    const authSetup = await setupSupabaseAuth(userId, connectionId, {
      projectRef,
      googleClientId,
      googleClientSecret: googleOauthSecret,
    });
    if ("error" in authSetup) {
      return {
        step: {
          id: "auth",
          label: SUPABASE_AUTH_SETUP_STEP_LABELS.auth,
          status: "error",
          detail: authSetup.error,
        },
        error: authSetup.error,
        status: 400,
      };
    }
    updatePayload.supabase_auth_configured = true;
    updatePayload.supabase_auth_callback_url = authSetup.callbackUrl;
    updatePayload.supabase_site_url = authSetup.siteUrl;
    updatePayload.supabase_redirect_urls = authSetup.redirectUrls;
    updatePayload.google_oauth_client_id = googleClientId;
    updatePayload["google_oauth_client_secret"] = googleOauthSecret;
    stepResult = {
      id: "auth",
      label: SUPABASE_AUTH_SETUP_STEP_LABELS.auth,
      status: "done",
    };
  }

  if (Object.keys(updatePayload).length === 0) {
    return { step: stepResult, data: project };
  }

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update(updatePayload)
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

  const saved = updated as Project;
  const hasKeys = Boolean(saved.supabase_anon_key);
  const authConfigured = Boolean(saved.supabase_auth_configured);

  if (hasKeys && authConfigured && !(project.completed_steps ?? []).includes("supabase_auth")) {
    const completedSteps = new Set<StepId>((saved.completed_steps ?? []) as StepId[]);
    completedSteps.add("supabase_auth");
    const { data: finalized, error: finalizeError } = await supabase
      .from("projects")
      .update({ completed_steps: Array.from(completedSteps) })
      .eq("id", projectId)
      .eq("user_id", userId)
      .select(PROJECT_COLUMNS)
      .maybeSingle();

    if (!finalizeError && finalized) {
      return { step: stepResult, data: finalized as Project };
    }
  }

  return { step: stepResult, data: saved };
}
