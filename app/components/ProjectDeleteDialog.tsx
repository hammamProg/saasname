"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";

type ProjectDeleteDialogProps = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onDeleted: (projectId: string) => void;
};

export function ProjectDeleteDialog({
  open,
  project,
  onClose,
  onDeleted,
}: ProjectDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  function handleClose() {
    if (isDeleting) return;
    onClose();
  }

  async function handleDelete() {
    if (!project) return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${project.id}`);
      onDeleted(project.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete project");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-4 backdrop:bg-brand-ink/50"
    >
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground">Delete project?</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="rounded-lg p-2 text-muted hover:bg-surface"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-muted">
            This permanently removes{" "}
            <span className="font-semibold text-foreground">{project?.name}</span> and its setup
            progress. Connected integrations and external resources are not deleted.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || !project}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
