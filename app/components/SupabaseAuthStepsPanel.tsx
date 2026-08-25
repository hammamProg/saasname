"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2 } from "lucide-react";
import apiClient, { ApiError } from "@/libs/api";
import type { Project } from "@/libs/projects";
import {
  normalizeSupabaseAuthSchemaApplied,
  normalizeSupabaseAuthSchemaOptions,
  type SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";
import {
  buildSupabaseAuthStepOrder,
  deriveSupabaseAuthStepsFromProject,
  runningSupabaseAuthSetupSteps,
  SUPABASE_AUTH_SETUP_STEP_LABELS,
  type SupabaseAuthSetupStep,
  type SupabaseAuthSetupStepId,
} from "@/libs/supabase-setup-auth-steps";
import { SupabaseProvisionProgress } from "./SupabaseProvisionProgress";
import { SupabaseAuthComplete } from "./SupabaseAuthComplete";
import { SupabaseProjectKeysDisplay } from "./SupabaseProjectKeysDisplay";
import { SupabaseAuthSchemaOptions as SupabaseAuthSchemaOptionsPanel } from "./SupabaseAuthSchemaOptions";

type Props = {
  project: Project;
  hasGoogleCredentials: boolean;
  onProjectUpdated: (project: Project) => void;
};

function schemaStepsComplete(project: Project, options: SupabaseAuthSchemaOptions): boolean {
  const applied = normalizeSupabaseAuthSchemaApplied(project.supabase_auth_schema_applied);
  if (options.leads && !applied.leads) return false;
  if (options.profiles && !applied.profiles) return false;
  return true;
}

type StepResponse = {
  step: SupabaseAuthSetupStep;
  data?: Project;
  error?: string;
};

export function SupabaseAuthStepsPanel({
  project,
  hasGoogleCredentials,
  onProjectUpdated,
}: Props) {
  const [busyAll, setBusyAll] = useState(false);
  const [steps, setSteps] = useState<SupabaseAuthSetupStep[] | null>(null);
  const [schemaOptions, setSchemaOptions] = useState<SupabaseAuthSchemaOptions>(() =>
    normalizeSupabaseAuthSchemaOptions(project.supabase_auth_schema_options)
  );

  useEffect(() => {
    setSchemaOptions(normalizeSupabaseAuthSchemaOptions(project.supabase_auth_schema_options));
  }, [project.supabase_auth_schema_options]);

  const isComplete = Boolean(
    project.supabase_auth_configured &&
      project.supabase_project_ref &&
      schemaStepsComplete(project, schemaOptions)
  );
  const hasAnonKey = Boolean(project.supabase_anon_key);
  const callback =
    project.supabase_auth_callback_url ??
    (project.supabase_project_ref
      ? `https://${project.supabase_project_ref}.supabase.co/auth/v1/callback`
      : "");

  function updateStep(next: SupabaseAuthSetupStep) {
    setSteps((current) => {
      const base = current ?? deriveSupabaseAuthStepsFromProject(project);
      return base.map((step) => (step.id === next.id ? next : step));
    });
  }

  async function runStep(stepId: SupabaseAuthSetupStepId): Promise<StepResponse> {
    const isSchemaStep = stepId === "schema_leads" || stepId === "schema_profiles";
    const endpoint = isSchemaStep
      ? `/projects/${project.id}/supabase/setup-schema`
      : `/projects/${project.id}/supabase/setup-auth`;

    try {
      const res = await apiClient.post<StepResponse>(endpoint, {
        step: stepId,
        schema_options: schemaOptions,
      });
      updateStep(res.step);
      if (res.data) {
        onProjectUpdated(res.data);
      }
      return res;
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Step failed";
      updateStep({
        id: stepId,
        label: SUPABASE_AUTH_SETUP_STEP_LABELS[stepId],
        status: "error",
        detail: message,
      });
      return {
        step: { id: stepId, label: "", status: "error", detail: message },
        error: message,
      };
    }
  }

  async function configureAuth() {
    setBusyAll(true);
    setSteps(runningSupabaseAuthSetupSteps(schemaOptions));

    try {
      await apiClient.patch(`/projects/${project.id}/supabase/setup-schema`, {
        schema_options: schemaOptions,
      });
    } catch {
      // Options are also sent with each schema step.
    }

    const stepOrder = buildSupabaseAuthStepOrder(schemaOptions);
    let latestProject = project;
    for (const stepId of stepOrder) {
      const result = await runStep(stepId);
      if (result.data) {
        latestProject = result.data;
      }
    }

    if (
      latestProject.supabase_auth_configured &&
      latestProject.supabase_anon_key &&
      schemaStepsComplete(latestProject, schemaOptions) &&
      !(latestProject.completed_steps ?? []).includes("supabase_auth")
    ) {
      try {
        const updated = await apiClient.patch<Project>(`/projects/${project.id}`, {
          completed_steps: [...(latestProject.completed_steps ?? []), "supabase_auth"],
        });
        onProjectUpdated(updated);
      } catch {
        // Step data is already saved.
      }
    }

    setBusyAll(false);
  }

  const displaySteps =
    steps ??
    (project.supabase_project_ref
      ? deriveSupabaseAuthStepsFromProject({
          ...project,
          supabase_auth_schema_options: schemaOptions,
        })
      : null);
  const anyStepRunning =
    busyAll || (displaySteps?.some((s) => s.status === "running") ?? false);
  const hasStepErrors = displaySteps?.some((s) => s.status === "error") ?? false;

  if (!project.supabase_project_ref) return null;

  return (
    <>
      <SupabaseAuthSchemaOptionsPanel
        project={project}
        options={schemaOptions}
        disabled={anyStepRunning || isComplete}
        onChange={setSchemaOptions}
      />

      <button
        type="button"
        disabled={anyStepRunning || isComplete || !hasGoogleCredentials}
        onClick={() => void configureAuth()}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {anyStepRunning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Running setup tasks…
          </>
        ) : isComplete ? (
          <>
            <Check size={16} />
            Supabase configured
          </>
        ) : hasStepErrors ? (
          <>
            <KeyRound size={16} />
            Retry configure auth
          </>
        ) : (
          <>
            <KeyRound size={16} />
            Configure Supabase auth
          </>
        )}
      </button>

      <SupabaseProvisionProgress
        open={Boolean(displaySteps)}
        steps={displaySteps ?? []}
        title="Supabase auth setup"
      />

      {!anyStepRunning && hasAnonKey && !isComplete && (
        <SupabaseProjectKeysDisplay project={project} title="API keys retrieved" />
      )}

      {!anyStepRunning && isComplete && (
        <SupabaseAuthComplete
          project={project}
          callback={callback}
          schemaOptions={schemaOptions}
        />
      )}

      {!anyStepRunning && !isComplete && hasStepErrors && (
        <p className="text-sm text-amber-800">
          Some tasks failed — click Configure Supabase auth to retry. Successful results are
          already saved.
        </p>
      )}
    </>
  );
}
