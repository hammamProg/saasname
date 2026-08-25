"use client";

import Link from "next/link";
import { Loader2, Plug } from "lucide-react";
import type { Project } from "@/libs/projects";
import { SupabaseAuthStepsPanel } from "./SupabaseAuthStepsPanel";

type Props = {
  project: Project;
  supabaseConnected: boolean;
  integrationsLoading: boolean;
  onProjectUpdated: (project: Project) => void;
};

export function SupabaseAuthSetupActions({
  project,
  supabaseConnected,
  integrationsLoading,
  onProjectUpdated,
}: Props) {
  const isComplete = Boolean(project.supabase_auth_configured && project.supabase_project_ref);
  const hasGoogleCredentials = Boolean(
    project.google_oauth_client_id && project.google_oauth_client_secret
  );

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-brand-mint/25 bg-brand-mint/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Supabase auth</p>
          <p className="mt-1 text-sm text-slate-600">
            Choose database schema options, then run all tasks at once or retry any step
            individually.
          </p>
        </div>
        {!integrationsLoading && !supabaseConnected && (
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Plug size={16} />
            Connect Supabase
          </Link>
        )}
      </div>

      {integrationsLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 size={14} className="animate-spin" />
          Checking connection…
        </div>
      )}

      {!integrationsLoading && supabaseConnected && (
        <>
          {!project.supabase_project_ref && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Complete step 2 (Supabase project) first.
            </p>
          )}

          {project.supabase_project_ref && !isComplete && !hasGoogleCredentials && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Complete step 3 (Google OAuth) and save your credentials first.
            </p>
          )}

          {project.supabase_project_ref && !isComplete && hasGoogleCredentials && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Using Google OAuth credentials from step 3 for project{" "}
              <span className="font-mono">{project.supabase_project_ref}</span>.
            </p>
          )}

          <SupabaseAuthStepsPanel
            project={project}
            hasGoogleCredentials={hasGoogleCredentials}
            onProjectUpdated={onProjectUpdated}
          />
        </>
      )}
    </div>
  );
}
