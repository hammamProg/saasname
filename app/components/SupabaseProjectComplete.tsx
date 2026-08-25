import { Check, ExternalLink } from "lucide-react";
import type { Project } from "@/libs/projects";
import { CopyField } from "./CopyField";

type Props = {
  project: Project;
};

export function SupabaseProjectComplete({ project }: Props) {
  return (
    <>
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 opacity-100"
      >
        <Check size={16} />
        Project &ldquo;{project.supabase_project_ref}&rdquo; linked
      </button>
      <div className="mt-3 space-y-2">
        <CopyField label="Project ref" value={project.supabase_project_ref ?? ""} />
        <p className="text-xs text-slate-500">
          API keys and auth are configured in step 4 (Supabase Auth).
        </p>
        <a
          href={`https://supabase.com/dashboard/project/${project.supabase_project_ref}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Open in Supabase <ExternalLink size={14} />
        </a>
      </div>
    </>
  );
}
