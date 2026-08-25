"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/libs/projects";
import { cn } from "@/libs/cn";
import { rememberShipNowProjectId } from "@/libs/shipnow-project-session";
import { ProjectAvatar } from "./ProjectAvatar";
import { ProjectProgressRing } from "./ProjectProgressRing";

import { SETUP_TOTAL_STEPS } from "@/libs/setup-step-groups";

export function projectSetupProgress(project: Project) {
  const completed = project.completed_steps?.length ?? 0;
  return Math.round((completed / SETUP_TOTAL_STEPS) * 100);
}

type ProjectSwitcherProps = {
  projects: Project[];
  activeProjectId: string;
  className?: string;
};

export function ProjectSwitcher({ projects, activeProjectId, className }: ProjectSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectProject(id: string) {
    if (id === activeProjectId || isPending) {
      return;
    }

    startTransition(() => {
      rememberShipNowProjectId(id);
      router.push(`/dashboard/shipnow?project=${id}`);
    });
  }

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Switch project"
      >
        {projects.map((project) => {
          const active = project.id === activeProjectId;
          const progress = projectSetupProgress(project);

          return (
            <button
              key={project.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={project.name}
              onClick={() => selectProject(project.id)}
              disabled={isPending && !active}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-left transition-colors",
                active
                  ? "border-primary/40 bg-primary-soft/50"
                  : "border-transparent bg-surface/80 hover:border-border hover:bg-surface",
                isPending && !active && "opacity-50"
              )}
            >
              <ProjectAvatar project={project} size="sm" className="h-7 w-7 rounded-md" />
              <span className="max-w-[8rem] truncate text-sm font-medium text-foreground">
                {project.name}
              </span>
              <ProjectProgressRing value={progress} size={22} className="opacity-80" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
