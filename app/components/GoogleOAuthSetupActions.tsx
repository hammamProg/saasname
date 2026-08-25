"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";
import { GoogleOAuthVisualGuide } from "./GoogleOAuthVisualGuide";

type Props = {
  project: Project;
  onProjectUpdated: (project: Project) => void;
};

export function GoogleOAuthSetupActions({ project, onProjectUpdated }: Props) {
  const [clientId, setClientId] = useState(project.google_oauth_client_id ?? "");
  const [oauthKey, setOauthKey] = useState(project.google_oauth_client_secret ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasCredentials = Boolean(project.google_oauth_client_id && project.google_oauth_client_secret);

  useEffect(() => {
    setClientId(project.google_oauth_client_id ?? "");
    setOauthKey(project.google_oauth_client_secret ?? "");
  }, [project.google_oauth_client_id, project.google_oauth_client_secret]);

  async function saveCredentials() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const completed = new Set(project.completed_steps ?? []);
      completed.add("google_oauth");
      const res = await apiClient.patch<{ data: Project }>(`/projects/${project.id}`, {
        google_oauth_client_id: clientId.trim(),
        google_oauth_client_secret: oauthKey.trim(),
        completed_steps: Array.from(completed),
      });
      onProjectUpdated(res.data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save credentials");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 space-y-5">
      {!project.supabase_project_ref && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Complete step 2 (Supabase Project) first — you need the project ref for callback URLs.
        </p>
      )}
      <GoogleOAuthVisualGuide project={project} />

      <div id="google-oauth-save" className="rounded-xl border border-brand-cyan/25 bg-brand-cyan/10 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Save credentials</p>
        <p className="text-xs text-slate-600">
          ShipNow stores these and applies them when you configure Supabase auth in step 4.
        </p>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Client ID</span>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            placeholder="xxxx.apps.googleusercontent.com"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Client Secret</span>
          <input
            type="password"
            value={oauthKey}
            onChange={(e) => setOauthKey(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            placeholder="GOCSPX-..."
          />
        </label>
        <button
          type="button"
          disabled={busy || !clientId.trim() || !oauthKey.trim()}
          onClick={() => void saveCredentials()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : hasCredentials ? (
            <>
              <Check size={16} />
              Update credentials
            </>
          ) : (
            <>
              <Save size={16} />
              Save credentials
            </>
          )}
        </button>
        {saved && <p className="text-sm text-emerald-700">Saved — ready for step 4.</p>}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
