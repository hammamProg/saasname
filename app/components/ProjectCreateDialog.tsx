"use client";

import type { Project } from "@/libs/projects";
import { ProjectFormDialog } from "./ProjectFormDialog";

type ProjectCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

/** @deprecated Use ProjectFormDialog */
export function ProjectCreateDialog({ open, onClose, onCreated }: ProjectCreateDialogProps) {
  return (
    <ProjectFormDialog open={open} mode="create" onClose={onClose} onSaved={onCreated} />
  );
}
