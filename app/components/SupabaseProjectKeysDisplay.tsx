import type { Project } from "@/libs/projects";
import { CopyField } from "./CopyField";

type Props = {
  project: Project;
  title?: string;
};

export function SupabaseProjectKeysDisplay({ project, title }: Props) {
  if (!project.supabase_anon_key) return null;

  const supabaseUrl =
    project.supabase_project_url ??
    (project.supabase_project_ref
      ? `https://${project.supabase_project_ref}.supabase.co`
      : "");

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      {title && <p className="text-sm font-semibold text-emerald-950">{title}</p>}
      <p className="text-xs text-emerald-900/80">
        Copy these into your local <span className="font-mono">.env.local</span>.
      </p>
      <CopyField label="NEXT_PUBLIC_SUPABASE_URL" value={supabaseUrl} />
      <CopyField label="NEXT_PUBLIC_SUPABASE_ANON_KEY" value={project.supabase_anon_key} masked />
      {project.supabase_service_role_key && (
        <CopyField
          label="SUPABASE_SERVICE_ROLE_KEY"
          value={project.supabase_service_role_key}
          masked
          hint="Server-only — never expose in the browser."
        />
      )}
    </div>
  );
}
