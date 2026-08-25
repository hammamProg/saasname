"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StepId } from "../types";
import type { Project } from "@/libs/projects";
import { canResetSetupStep } from "@/libs/reset-setup-step";
import { buildSetupSteps } from "@/libs/setup-steps";
import { SETUP_STEP_GROUPS } from "@/libs/setup-step-groups";
import { countReadyEnvEntries } from "@/libs/project-env-file";
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
import { SetupStepDetail } from "./SetupStepDetail";
import { CopyEnvSetupActions } from "./CopyEnvSetupActions";
import { SetupStepNav, type SetupStepNavItem } from "./SetupStepNav";

export interface SetupGuideViewProps {
  project: Project;
  setProgress: (val: number) => void;
  onProjectUpdated: (project: Project) => void;
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
  if (stepId === "copy_env") {
    const { ready, total } = countReadyEnvEntries(project);
    return `${ready}/${total} variables ready`;
  }
  return undefined;
}

function stepIsLinked(
  stepId: StepId,
  flags: {
    repoLinked: boolean;
    hasGoogleOAuth: boolean;
    supabaseProjectLinked: boolean;
    supabaseAuthLinked: boolean;
    emailServiceLinked: boolean;
    paymentsLinked: boolean;
  }
): boolean {
  switch (stepId) {
    case "repo":
      return flags.repoLinked;
    case "google_oauth":
      return flags.hasGoogleOAuth;
    case "supabase_project":
      return flags.supabaseProjectLinked;
    case "supabase_auth":
      return flags.supabaseAuthLinked;
    case "email":
      return flags.emailServiceLinked;
    case "payments":
      return flags.paymentsLinked;
    default:
      return false;
  }
}

export function SetupGuideView({ project, setProgress, onProjectUpdated }: SetupGuideViewProps) {
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

  const [activeStepId, setActiveStepId] = useState<StepId>(() => steps[0]?.id ?? "repo");
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

  const linkFlags = useMemo(
    () => ({
      repoLinked,
      hasGoogleOAuth,
      supabaseProjectLinked,
      supabaseAuthLinked,
      emailServiceLinked,
      paymentsLinked,
    }),
    [
      repoLinked,
      hasGoogleOAuth,
      supabaseProjectLinked,
      supabaseAuthLinked,
      emailServiceLinked,
      paymentsLinked,
    ]
  );

  useEffect(() => {
    if (!steps.some((s) => s.id === activeStepId)) {
      setActiveStepId(steps[0]?.id ?? "repo");
    }
  }, [steps, activeStepId]);

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
        console.error("[SetupGuideView] failed to save progress:", error);
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
      console.error("[SetupGuideView] failed to reset step:", error);
      throw error instanceof Error ? error : new Error("Could not reset step");
    }
  };

  const toggleStepComplete = (id: StepId) => {
    if (stepIsLinked(id, linkFlags)) return;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void persistSteps(next);
      return next;
    });
  };

  const navItems: SetupStepNavItem[] = useMemo(
    () =>
      steps.map((step, idx) => {
        const linked = stepIsLinked(step.id, linkFlags);
        const isCompleted = completedSteps.has(step.id) || linked;
        return {
          step,
          idx,
          isCompleted,
          isLocked: linked,
        };
      }),
    [steps, completedSteps, linkFlags]
  );

  const itemsById = useMemo(() => {
    const map = new Map<StepId, SetupStepNavItem>();
    for (const item of navItems) {
      map.set(item.step.id, item);
    }
    return map;
  }, [navItems]);

  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const activeStep = steps[activeIndex >= 0 ? activeIndex : 0];
  const activeNav = navItems[activeIndex >= 0 ? activeIndex : 0];

  const renderExtraContent = (stepId: StepId) => {
    switch (stepId) {
      case "repo":
        return (
          <GitHubRepoSetupActions
            project={project}
            githubConnected={githubConnected}
            integrationsLoading={integrationsLoading}
            onProjectUpdated={onProjectUpdated}
          />
        );
      case "supabase_project":
        return (
          <SupabaseProjectSetupActions
            project={project}
            supabaseConnected={supabaseConnected}
            integrationsLoading={integrationsLoading}
            onProjectUpdated={onProjectUpdated}
          />
        );
      case "google_oauth":
        return <GoogleOAuthSetupActions project={project} onProjectUpdated={onProjectUpdated} />;
      case "supabase_auth":
        return (
          <SupabaseAuthSetupActions
            project={project}
            supabaseConnected={supabaseConnected}
            integrationsLoading={integrationsLoading}
            onProjectUpdated={onProjectUpdated}
          />
        );
      case "email":
        return (
          <ResendEmailSetupActions
            project={project}
            resendConnected={resendConnected}
            integrationsLoading={integrationsLoading}
            onProjectUpdated={onProjectUpdated}
          />
        );
      case "payments":
        return (
          <PaddleSetupActions
            project={project}
            paddleConnected={paddleConnected}
            ngrokConnected={ngrokConnected}
            integrationsLoading={integrationsLoading}
            onProjectUpdated={onProjectUpdated}
          />
        );
      case "copy_env":
        return <CopyEnvSetupActions project={project} />;
      default:
        return undefined;
    }
  };

  if (!activeStep || !activeNav) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)] lg:items-start">
      <SetupStepNav
        groups={SETUP_STEP_GROUPS}
        itemsById={itemsById}
        activeStepId={activeStepId}
        onSelect={setActiveStepId}
      />
      <SetupStepDetail
        step={activeStep}
        idx={activeNav.idx}
        isCompleted={activeNav.isCompleted}
        isLocked={activeNav.isLocked}
        summary={stepSummary(activeStep.id, project)}
        onToggleComplete={toggleStepComplete}
        canReset={canResetSetupStep(activeStep.id, project)}
        onReset={resetStep}
        extraContent={renderExtraContent(activeStep.id)}
      />
    </div>
  );
}
