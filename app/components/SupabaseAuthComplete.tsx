import { Check, ExternalLink } from "lucide-react";
import type { Project } from "@/libs/projects";
import {
  normalizeSupabaseAuthSchemaApplied,
  SUPABASE_AUTH_SCHEMA_OPTION_META,
  type SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";
import { CopyField } from "./CopyField";
import { SupabaseProjectKeysDisplay } from "./SupabaseProjectKeysDisplay";

type Props = {
  project: Project;
  callback: string;
  schemaOptions: SupabaseAuthSchemaOptions;
};

export function SupabaseAuthComplete({ project, callback, schemaOptions }: Props) {
  const applied = normalizeSupabaseAuthSchemaApplied(project.supabase_auth_schema_applied);

  return (
    <>
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 opacity-100"
      >
        <Check size={16} />
        Auth configured — copy keys to .env.local
      </button>
      <div className="mt-3 space-y-2">
        <SupabaseProjectKeysDisplay project={project} />
        <CopyField label="Google Callback URL" value={callback} />
        {project.google_oauth_client_id && (
          <CopyField label="Client ID" value={project.google_oauth_client_id} />
        )}
        <CopyField label="Site URL" value={project.supabase_site_url ?? ""} />
        {(project.supabase_redirect_urls ?? []).map((url) => (
          <CopyField key={url} label="Redirect URL" value={url} />
        ))}
        {(schemaOptions.leads || schemaOptions.profiles) && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-900">
            <p className="font-semibold">Database schema applied</p>
            <ul className="mt-2 space-y-1 text-xs">
              {schemaOptions.leads && (
                <li>
                  {applied.leads ? "✓" : "○"} {SUPABASE_AUTH_SCHEMA_OPTION_META.leads.label}
                </li>
              )}
              {schemaOptions.profiles && (
                <li>
                  {applied.profiles ? "✓" : "○"} {SUPABASE_AUTH_SCHEMA_OPTION_META.profiles.label}
                </li>
              )}
            </ul>
          </div>
        )}
        <a
          href={`https://supabase.com/dashboard/project/${project.supabase_project_ref}/auth/providers`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Open Supabase Auth <ExternalLink size={14} />
        </a>
      </div>
    </>
  );
}
