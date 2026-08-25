"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderGit2, Loader2, Plug } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";

type GitHubRepoSetupActionsProps = {
  project: Project;
  githubConnected: boolean;
  integrationsLoading: boolean;
  onProjectUpdated: (project: Project) => void;
};

export function GitHubRepoSetupActions({
  project,
  githubConnected,
  integrationsLoading,
  onProjectUpdated,
}: GitHubRepoSetupActionsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRepo = Boolean(project.github_repo_url);

  const handleCreateRepo = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await apiClient.post<{ data: Project; error?: string; code?: string }>(
        `/projects/${project.id}/github/create-repo`,
        {}
      );
      onProjectUpdated(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create GitHub repository");
    } finally {
      setIsCreating(false);
    }
  };

  if (hasRepo) {
    return (
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <FolderGit2 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">GitHub repository connected</p>
              <p className="mt-1 font-mono text-sm text-emerald-800">
                {project.github_repo_full_name ?? project.slug}
              </p>
              <p className="mt-1 text-xs text-emerald-700/80">
                Run the terminal commands below to clone ShipNow and push to this repo.
              </p>
            </div>
          </div>
          {project.github_repo_url && (
            <a
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:border-emerald-300"
            >
              Open on GitHub
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <FolderGit2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Create GitHub repository</p>
          <p className="mt-1 text-sm text-slate-600">
            Creates an empty repository named{" "}
            <span className="font-mono font-medium text-slate-800">{project.slug}</span> on your
            connected GitHub account.
          </p>
        </div>
      </div>

      {integrationsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" />
          Checking GitHub connection…
        </div>
      ) : !githubConnected ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p>Connect GitHub in Integrations before creating a repository.</p>
          <Link
            href="/dashboard/integrations"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-amber-950 hover:underline"
          >
            <Plug size={14} />
            Go to Integrations
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleCreateRepo()}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isCreating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating repository…
            </>
          ) : (
            <>
              <FolderGit2 size={16} />
              Create repository &ldquo;{project.slug}&rdquo;
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
