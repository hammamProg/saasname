"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";
import { PROJECT_DESCRIPTION_MAX, PROJECT_NAME_MAX } from "@/libs/projects";
import { ProjectImagePicker } from "./ProjectImagePicker";

export type ProjectFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  project?: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
};

export function ProjectFormDialog({
  open,
  mode,
  project,
  onClose,
  onSaved,
}: ProjectFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = mode === "edit";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setImageFile(null);
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setImageFile(null);
    }
    setError(null);
  }, [open, isEdit, project]);

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let saved: Project;

      if (isEdit && project) {
        const result = await apiClient.patch<{ data: Project }>(`/projects/${project.id}`, {
          name: name.trim(),
          description: description.trim() || null,
        });
        saved = result.data;
      } else {
        const result = await apiClient.post<{ data: Project }>("/projects", {
          name: name.trim(),
          description: description.trim() || null,
        });
        saved = result.data;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploaded = await apiClient.postForm<{ data: Project }>(
          `/projects/${saved.id}/image`,
          formData
        );
        saved = uploaded.data;
      }

      onSaved(saved);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEdit
            ? "Could not update project"
            : "Could not create project"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-4 backdrop:bg-brand-ink/50"
    >
      <div className="mx-auto flex min-h-full max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{isEdit ? "Edit project" : "New project"}</h2>
              <p className="mt-1 text-sm text-muted">
                {isEdit
                  ? "Update your app details or replace the logo."
                  : "The app name is used in git commands and setup steps."}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="rounded-lg p-2 text-muted hover:bg-surface"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <ProjectImagePicker
              file={imageFile}
              onFileChange={setImageFile}
              previewUrl={isEdit && !imageFile ? project?.image_url : null}
            />

            <div className="space-y-2">
              <label htmlFor="project-form-name" className="text-sm font-semibold">
                App name
              </label>
              <input
                id="project-form-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Acme Analytics"
                maxLength={PROJECT_NAME_MAX}
                required
                autoFocus={!isEdit}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="project-form-description" className="text-sm font-semibold">
                Description <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="project-form-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does your SaaS do?"
                maxLength={PROJECT_DESCRIPTION_MAX}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {isEdit ? "Saving…" : "Creating…"}
                  </>
                ) : isEdit ? (
                  <>
                    <Save size={16} />
                    Save changes
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
