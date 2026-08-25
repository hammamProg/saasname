"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Database, Loader2, Plug } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";
import { SupabaseProjectComplete } from "./SupabaseProjectComplete";

type Props = {
  project: Project;
  supabaseConnected: boolean;
  integrationsLoading: boolean;
  onProjectUpdated: (project: Project) => void;
};

export function SupabaseProjectSetupActions({
  project,
  supabaseConnected,
  integrationsLoading,
  onProjectUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = Boolean(project.supabase_project_ref);

  async function createProject() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: Project }>(
        `/projects/${project.id}/supabase/create-project`,
        {}
      );
      onProjectUpdated(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create Supabase project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-brand-mint/25 bg-brand-mint/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Supabase project</p>
          <p className="mt-1 text-sm text-slate-600">
            Create your Supabase project and save the project ref — used in Google OAuth (step 3).
            API keys are fetched in step 4.
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
          {!isComplete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void createProject()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating project…
                </>
              ) : (
                <>
                  <Database size={16} />
                  Create Supabase project
                </>
              )}
            </button>
          )}

          {isComplete && <SupabaseProjectComplete project={project} />}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
