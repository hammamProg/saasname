"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import type { Project } from "@/libs/projects";
import {
  fetchProjectsCached,
  getCachedProjects,
  invalidateProjectsCache,
} from "@/libs/dashboard-data-cache";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectList } from "./ProjectList";

function ProjectsLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

function ProjectsWorkspaceContent() {
  const [projects, setProjects] = useState<Project[]>(() => getCachedProjects() ?? []);
  const [isLoading, setIsLoading] = useState(() => getCachedProjects() == null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    if (getCachedProjects() == null) {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const data = await fetchProjectsCached();
      setProjects(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function handleProjectSaved(project: Project) {
    invalidateProjectsCache();
    setProjects((current) => {
      const exists = current.some((item) => item.id === project.id);
      if (exists) {
        return current.map((item) => (item.id === project.id ? project : item));
      }
      return [project, ...current];
    });
  }

  function handleProjectDeleted(projectId: string) {
    invalidateProjectsCache();
    setProjects((current) => current.filter((item) => item.id !== projectId));
  }

  if (isLoading) {
    return <ProjectsLoader />;
  }

  return (
    <div className="relative space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Projects</p>
          <h1 className="section-heading text-3xl font-extrabold">Your SaaS apps</h1>
          <p className="max-w-2xl text-muted">
            Manage your apps, track setup progress, and jump back into the ShipNow guide.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-primary shrink-0 px-5 py-2.5 text-sm"
        >
          <Plus size={16} />
          New project
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/80 p-12 text-center">
          <FolderKanban className="mx-auto text-muted" size={40} />
          <p className="mt-4 text-lg font-semibold text-foreground">No projects yet</p>
          <p className="mt-2 text-sm text-muted">
            Create your first app to start the ShipNow setup guide.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-primary mt-6 px-6 py-2.5 text-sm"
          >
            <Plus size={16} />
            New project
          </button>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          onEdit={setEditingProject}
          onDelete={setDeletingProject}
        />
      )}

      <ProjectFormDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={handleProjectSaved}
      />

      <ProjectFormDialog
        open={Boolean(editingProject)}
        mode="edit"
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSaved={handleProjectSaved}
      />

      <ProjectDeleteDialog
        open={Boolean(deletingProject)}
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onDeleted={handleProjectDeleted}
      />
    </div>
  );
}

export function ProjectsWorkspace() {
  return (
    <Suspense fallback={<ProjectsLoader />}>
      <ProjectsWorkspaceContent />
    </Suspense>
  );
}
