"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Project } from "@/libs/projects";
import {
  fetchProjectsCached,
  getCachedProjects,
} from "@/libs/dashboard-data-cache";
import {
  readLastShipNowProjectId,
  rememberShipNowProjectId,
} from "@/libs/shipnow-project-session";
import { ProjectAvatar } from "./ProjectAvatar";
import { ProjectProgressRing } from "./ProjectProgressRing";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { SetupGuideView } from "./SetupGuideView";

function ShipNowLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

function ShipNowWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectParam = searchParams.get("project");

  const cachedProjects = getCachedProjects();
  const [projects, setProjects] = useState<Project[]>(() => cachedProjects ?? []);
  const [isLoading, setIsLoading] = useState(() => cachedProjects == null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (getCachedProjects() == null) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const list = await fetchProjectsCached();
        if (cancelled) {
          return;
        }

        setProjects(list);

        if (list.length === 0) {
          router.replace("/dashboard/projects");
          return;
        }

        const hasValidParam = projectParam && list.some((p) => p.id === projectParam);
        if (!hasValidParam) {
          const lastId = readLastShipNowProjectId();
          const fallback =
            lastId && list.some((project) => project.id === lastId) ? lastId : list[0].id;
          router.replace(`/dashboard/shipnow?project=${fallback}`);
        } else if (projectParam) {
          rememberShipNowProjectId(projectParam);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load projects");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [projectParam, router]);

  useEffect(() => {
    if (projectParam) {
      rememberShipNowProjectId(projectParam);
    }
  }, [projectParam]);

  const activeProject = useMemo(() => {
    if (!projectParam) {
      return null;
    }
    return projects.find((project) => project.id === projectParam) ?? null;
  }, [projects, projectParam]);

  const handleProjectUpdated = useCallback((updated: Project) => {
    setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));
  }, []);

  if (isLoading && !activeProject) {
    return <ShipNowLoader />;
  }

  if (!activeProject) {
    return <ShipNowLoader />;
  }

  const hasMultipleProjects = projects.length > 1;

  return (
    <div className="relative mx-auto max-w-6xl space-y-6">
      <header className="rounded-xl border border-border/80 bg-card/90 px-3 py-2.5 shadow-sm sm:px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Projects</span>
          </Link>

          <div className="h-5 w-px shrink-0 bg-border/80" aria-hidden />

          {hasMultipleProjects ? (
            <ProjectSwitcher projects={projects} activeProjectId={activeProject.id} />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ProjectAvatar project={activeProject} size="sm" className="h-7 w-7 rounded-md" />
              <h1 className="truncate text-sm font-semibold text-foreground">{activeProject.name}</h1>
            </div>
          )}

          <div
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-surface px-2 py-1"
            title="Setup progress"
          >
            <ProjectProgressRing value={progress} size={24} />
            <span className="text-xs font-semibold tabular-nums text-foreground">{progress}%</span>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <SetupGuideView
        key={activeProject.id}
        project={activeProject}
        setProgress={setProgress}
        onProjectUpdated={handleProjectUpdated}
      />
    </div>
  );
}

export function LaunchpadWorkspace() {
  return (
    <Suspense fallback={<ShipNowLoader />}>
      <ShipNowWorkspaceContent />
    </Suspense>
  );
}
