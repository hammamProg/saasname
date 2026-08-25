"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Rocket,
  Trash2,
} from "lucide-react";
import type { Project } from "@/libs/projects";
import { cn } from "@/libs/cn";
import { ProjectAvatar } from "./ProjectAvatar";
import { ProjectProgressRing } from "./ProjectProgressRing";

import { SETUP_TOTAL_STEPS } from "@/libs/setup-step-groups";

type ProjectListProps = {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
};

export function ProjectList({ projects, onEdit, onDelete }: ProjectListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (projects.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const completed = project.completed_steps?.length ?? 0;
        const progress = Math.round((completed / SETUP_TOTAL_STEPS) * 100);
        const setupHref = `/dashboard/shipnow?project=${project.id}`;
        const subtitle = project.description?.trim() || project.slug;
        const menuOpen = openMenuId === project.id;

        return (
          <li key={project.id}>
            <article className="group relative flex h-full flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
              {/* Header: logo + name */}
              <div className="flex items-start gap-3">
                <ProjectAvatar project={project} size="md" className="rounded-2xl" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground">
                        {project.name}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
                    </div>

                    <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                      <button
                        type="button"
                        aria-label="Project actions"
                        aria-expanded={menuOpen}
                        onClick={() => setOpenMenuId(menuOpen ? null : project.id)}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 data-[open=true]:opacity-100"
                        data-open={menuOpen}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                          <Link
                            href={setupHref}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Rocket size={15} />
                            Open setup
                          </Link>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                            onClick={() => {
                              setOpenMenuId(null);
                              onEdit(project);
                            }}
                          >
                            <Pencil size={15} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onDelete(project);
                            }}
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics row — reference layout */}
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {completed}
                    <span className="text-lg font-semibold text-muted">/{SETUP_TOTAL_STEPS}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">Steps completed</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-2">
                    <ProjectProgressRing value={progress} size={36} />
                    <span className="min-w-[2ch] text-lg font-bold tabular-nums text-foreground">
                      {progress}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Setup</p>
                </div>
              </div>

              <Link
                href={setupHref}
                className={cn(
                  "mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary-soft/40"
                )}
              >
                Continue setup
                <ArrowRight size={16} className="text-primary" />
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
