"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StepId } from "../types";
import type { Project } from "@/libs/projects";
import { canResetSetupStep } from "@/libs/reset-setup-step";
import { buildSetupSteps } from "@/libs/setup-steps";
import apiClient from "@/libs/api";
import {
  fetchIntegrationsCached,
  getCachedIntegrations,
  integrationIsConnected,
} from "@/libs/dashboard-data-cache";
import { GitHubRepoSetupActions } from "./GitHubRepoSetupActions";
import { GoogleOAuthSetupActions } from "./GoogleOAuthSetupActions";
import { PaddleSetupActions } from "./PaddleSetupActions";
import { ResendEmailSetupActions } from "./ResendEmailSetupActions";
import { SupabaseProjectSetupActions } from "./SupabaseProjectSetupActions";
import { SupabaseAuthSetupActions } from "./SupabaseAuthSetupActions";
import { StepCard } from "./StepCard";

interface SetupGuideProps {
  project: Project;
  progress: number;
  setProgress: (val: number) => void;
  onProjectUpdated: (project: Project) => void;
  embedded?: boolean;
}

function stepSummary(stepId: StepId, project: Project): string | undefined {
  if (stepId === "repo" && project.github_repo_full_name) {
    return `Connected: ${project.github_repo_full_name}`;
  }
  if (stepId === "google_oauth" && project.google_oauth_client_id) {
    return "Google OAuth credentials saved";
  }
  if (stepId === "supabase_project" && project.supabase_project_ref) {
    return `Project: ${project.supabase_project_ref}`;
  }
  if (stepId === "supabase_auth" && project.supabase_project_ref) {
    return project.supabase_auth_configured
      ? `Auth configured: ${project.supabase_project_ref}`
      : `Project linked — finish auth setup`;
  }
  if (stepId === "email" && project.resend_domain_added) {
    return project.resend_domain_status
      ? `Resend: ${project.resend_domain} (${project.resend_domain_status})`
      : `Registered: ${project.resend_domain}`;
  }
  if (stepId === "payments" && project.paddle_provisioned) {
    return "Paddle catalog & webhook ready";
  }
  return undefined;
}

export function SetupGuide({
  project,
  setProgress,
  onProjectUpdated,
  embedded = false,
}: SetupGuideProps) {
  const steps = useMemo(
    () =>
      buildSetupSteps({
        name: project.name,
        slug: project.slug,
        description: project.description,
        github_repo_url: project.github_repo_url,
        github_repo_full_name: project.github_repo_full_name,
        supabase_project_ref: project.supabase_project_ref,
        supabase_auth_configured: project.supabase_auth_configured,
        google_oauth_client_id: project.google_oauth_client_id,
        google_oauth_client_secret: project.google_oauth_client_secret,
        resend_domain: project.resend_domain,
        resend_domain_added: project.resend_domain_added,
        paddle_provisioned: project.paddle_provisioned,
        paddle_webhook_url: project.paddle_webhook_url,
      }),
    [
      project.name,
      project.slug,
      project.description,
      project.github_repo_url,
      project.github_repo_full_name,
      project.supabase_project_ref,
      project.supabase_auth_configured,
      project.google_oauth_client_id,
      project.google_oauth_client_secret,
      project.resend_domain,
      project.resend_domain_added,
      project.paddle_provisioned,
      project.paddle_webhook_url,
    ]
  );

  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(
    () => new Set(project.completed_steps ?? [])
  );
  const [githubConnected, setGithubConnected] = useState(() => integrationIsConnected("github"));
  const [supabaseConnected, setSupabaseConnected] = useState(() =>
    integrationIsConnected("supabase")
  );
  const [resendConnected, setResendConnected] = useState(() => integrationIsConnected("resend"));
  const [paddleConnected, setPaddleConnected] = useState(() => integrationIsConnected("paddle"));
  const [ngrokConnected, setNgrokConnected] = useState(() => integrationIsConnected("ngrok"));
  const [integrationsLoading, setIntegrationsLoading] = useState(
    () => getCachedIntegrations() == null
  );

  const repoLinked = Boolean(project.github_repo_url);
  const hasGoogleOAuth = Boolean(
    project.google_oauth_client_id && project.google_oauth_client_secret
  );
  const supabaseProjectLinked = Boolean(project.supabase_project_ref);
  const supabaseAuthLinked = Boolean(
    project.supabase_auth_configured && project.supabase_project_ref
  );
  const emailServiceLinked = Boolean(project.resend_domain_added);
  const paymentsLinked = Boolean(project.paddle_provisioned);

  useEffect(() => {
    const next = new Set(project.completed_steps ?? []);
    if (repoLinked) next.add("repo");
    if (hasGoogleOAuth) next.add("google_oauth");
    if (supabaseProjectLinked) next.add("supabase_project");
    if (supabaseAuthLinked) next.add("supabase_auth");
    if (emailServiceLinked) next.add("email");
    if (paymentsLinked) next.add("payments");
    setCompletedSteps(next);
  }, [
    project.id,
    project.completed_steps,
    repoLinked,
    hasGoogleOAuth,
    supabaseProjectLinked,
    supabaseAuthLinked,
    emailServiceLinked,
    paymentsLinked,
  ]);

  useEffect(() => {
    setProgress(Math.round((completedSteps.size / steps.length) * 100));
  }, [completedSteps, setProgress, steps.length]);

  useEffect(() => {
    let cancelled = false;
    async function loadIntegrations() {
      if (getCachedIntegrations() == null) {
        setIntegrationsLoading(true);
      }
      try {
        const data = await fetchIntegrationsCached();
        if (!cancelled) {
          setGithubConnected(Boolean(data.find((i) => i.appName === "github")?.connected));
          setSupabaseConnected(Boolean(data.find((i) => i.appName === "supabase")?.connected));
          setResendConnected(Boolean(data.find((i) => i.appName === "resend")?.connected));
          setPaddleConnected(Boolean(data.find((i) => i.appName === "paddle")?.connected));
          setNgrokConnected(Boolean(data.find((i) => i.appName === "ngrok")?.connected));
        }
      } finally {
        if (!cancelled) setIntegrationsLoading(false);
      }
    }
    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSteps = useCallback(
    async (nextSteps: Set<StepId>) => {
      try {
        const result = await apiClient.patch<{ data: Project }>(`/projects/${project.id}`, {
          completed_steps: Array.from(nextSteps),
        });
        onProjectUpdated(result.data);
      } catch (error) {
        console.error("[SetupGuide] failed to save progress:", error);
      }
    },
    [onProjectUpdated, project.id]
  );

  const resetStep = async (stepId: StepId) => {
    try {
      const result = await apiClient.post<{ data: Project }>(
        `/projects/${project.id}/reset-step`,
        { step: stepId }
      );
      onProjectUpdated(result.data);
      setCompletedSteps(new Set(result.data.completed_steps ?? []));
    } catch (error) {
      console.error("[SetupGuide] failed to reset step:", error);
      throw error instanceof Error ? error : new Error("Could not reset step");
    }
  };

  const toggleStepComplete = (id: StepId) => {
    if (
      (id === "repo" && repoLinked) ||
      (id === "google_oauth" && hasGoogleOAuth) ||
      (id === "supabase_project" && supabaseProjectLinked) ||
      (id === "supabase_auth" && supabaseAuthLinked) ||
      (id === "email" && emailServiceLinked) ||
      (id === "payments" && paymentsLinked)
    )
      return;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void persistSteps(next);
      return next;
    });
  };

  return (
    <div className={embedded ? "pb-8" : "mx-auto mt-12 max-w-4xl px-6 pb-24"}>
      {embedded ? (
        <div className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Setup guide for {project.name}
          </h2>
          <p className="text-sm text-slate-500">
            Completed steps collapse automatically — click any step to expand details.
          </p>
        </div>
      ) : (
        <div className="mb-10 space-y-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">{project.name}</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
            Personalized launch checklist for your new SaaS project.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isRepoStep = step.id === "repo";
          const isSupabaseProjectStep = step.id === "supabase_project";
          const isGoogleOAuthStep = step.id === "google_oauth";
          const isSupabaseAuthStep = step.id === "supabase_auth";
          const isEmailStep = step.id === "email";
          const isPaymentsStep = step.id === "payments";
          const isCompleted =
            completedSteps.has(step.id) ||
            (isRepoStep && repoLinked) ||
            (isSupabaseProjectStep && supabaseProjectLinked) ||
            (isGoogleOAuthStep && hasGoogleOAuth) ||
            (isSupabaseAuthStep && supabaseAuthLinked) ||
            (isEmailStep && emailServiceLinked) ||
            (isPaymentsStep && paymentsLinked);
          const isLocked =
            (isRepoStep && repoLinked) ||
            (isSupabaseProjectStep && supabaseProjectLinked) ||
            (isGoogleOAuthStep && hasGoogleOAuth) ||
            (isSupabaseAuthStep && supabaseAuthLinked) ||
            (isEmailStep && emailServiceLinked) ||
            (isPaymentsStep && paymentsLinked);

          return (
            <StepCard
              key={step.id}
              step={step}
              idx={idx}
              isCompleted={isCompleted}
              isLocked={isLocked}
              summary={stepSummary(step.id, project)}
              onToggleComplete={toggleStepComplete}
              canReset={canResetSetupStep(step.id, project)}
              onReset={resetStep}
              extraContent={
                isRepoStep ? (
                  <GitHubRepoSetupActions
                    project={project}
                    githubConnected={githubConnected}
                    integrationsLoading={integrationsLoading}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : isSupabaseProjectStep ? (
                  <SupabaseProjectSetupActions
                    project={project}
                    supabaseConnected={supabaseConnected}
                    integrationsLoading={integrationsLoading}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : isGoogleOAuthStep ? (
                  <GoogleOAuthSetupActions
                    project={project}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : isSupabaseAuthStep ? (
                  <SupabaseAuthSetupActions
                    project={project}
                    supabaseConnected={supabaseConnected}
                    integrationsLoading={integrationsLoading}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : isEmailStep ? (
                  <ResendEmailSetupActions
                    project={project}
                    resendConnected={resendConnected}
                    integrationsLoading={integrationsLoading}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : isPaymentsStep ? (
                  <PaddleSetupActions
                    project={project}
                    paddleConnected={paddleConnected}
                    ngrokConnected={ngrokConnected}
                    integrationsLoading={integrationsLoading}
                    onProjectUpdated={onProjectUpdated}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
