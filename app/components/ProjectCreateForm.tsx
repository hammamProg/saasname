"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";
import { PROJECT_DESCRIPTION_MAX, PROJECT_NAME_MAX } from "@/libs/projects";

type ProjectCreateFormProps = {
  onCreated: (project: Project) => void;
  compact?: boolean;
};

export function ProjectCreateForm({ onCreated, compact = false }: ProjectCreateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await apiClient.post<{ data: Project }>("/projects", {
        name,
        description,
      });
      onCreated(result.data);
      setName("");
      setDescription("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="project-name" className="text-sm font-semibold text-foreground">
          App name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Acme Analytics"
          maxLength={PROJECT_NAME_MAX}
          required
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="project-description" className="text-sm font-semibold text-foreground">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What does your SaaS do?"
          maxLength={PROJECT_DESCRIPTION_MAX}
          rows={compact ? 2 : 3}
          className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="btn-primary w-full py-2.5 text-sm disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Plus size={16} />
            Create project
          </>
        )}
      </button>
    </form>
  );
}
