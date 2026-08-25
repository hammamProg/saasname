"use client";

import { useState } from "react";
import { Database, Users, ChevronDown } from "lucide-react";
import {
  normalizeSupabaseAuthSchemaApplied,
  normalizeSupabaseAuthSchemaOptions,
  sqlForSchemaOption,
  SUPABASE_AUTH_SCHEMA_OPTION_META,
  type SupabaseAuthSchemaOptionId,
  type SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";
import { cn } from "@/libs/cn";
import type { Project } from "@/libs/projects";

const OPTION_ICONS: Record<SupabaseAuthSchemaOptionId, typeof Database> = {
  leads: Database,
  profiles: Users,
};

type Props = {
  project: Project;
  options: SupabaseAuthSchemaOptions;
  disabled?: boolean;
  onChange: (options: SupabaseAuthSchemaOptions) => void;
};

export function SupabaseAuthSchemaOptions({
  project,
  options,
  disabled = false,
  onChange,
}: Props) {
  const [expanded, setExpanded] = useState<Partial<Record<SupabaseAuthSchemaOptionId, boolean>>>({
    leads: true,
    profiles: true,
  });
  const applied = normalizeSupabaseAuthSchemaApplied(project.supabase_auth_schema_applied);
  const saved = normalizeSupabaseAuthSchemaOptions(project.supabase_auth_schema_options);

  function toggle(id: SupabaseAuthSchemaOptionId) {
    if (disabled || applied[id]) return;
    onChange({ ...options, [id]: !options[id] });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Database schema options</p>
        <p className="mt-1 text-sm text-slate-600">
          Selected scripts run automatically on your Supabase project via the integration before
          auth is configured.
        </p>
      </div>

      <ul className="space-y-2">
        {(Object.keys(SUPABASE_AUTH_SCHEMA_OPTION_META) as SupabaseAuthSchemaOptionId[]).map(
          (id) => {
            const meta = SUPABASE_AUTH_SCHEMA_OPTION_META[id];
            const Icon = OPTION_ICONS[id];
            const isApplied = Boolean(applied[id]);
            const checked = options[id];
            const wasSaved = saved[id];

            return (
              <li key={id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    checked && !disabled
                      ? "border-primary/30 bg-primary-soft/40"
                      : "border-slate-200 bg-white",
                    (disabled || isApplied) && "cursor-default opacity-80"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={checked}
                    disabled={disabled || isApplied}
                    onChange={() => toggle(id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Icon size={16} className="text-primary" />
                      <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
                      {isApplied && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Applied
                        </span>
                      )}
                      {!isApplied && wasSaved && checked && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Selected
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                      {meta.description}
                    </span>
                    {checked && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-slate-900"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setExpanded((current) => ({ ...current, [id]: !current[id] }));
                          }}
                        >
                          <span>SQL run via Supabase integration</span>
                          <ChevronDown
                            size={14}
                            className={cn(
                              "shrink-0 transition-transform",
                              expanded[id] && "rotate-180"
                            )}
                          />
                        </button>
                        {expanded[id] !== false && (
                          <pre className="max-h-56 overflow-auto border-t border-slate-800 px-3 py-3 text-[11px] leading-relaxed text-emerald-300">
                            <code>{sqlForSchemaOption(id)}</code>
                          </pre>
                        )}
                      </div>
                    )}
                  </span>
                </label>
              </li>
            );
          }
        )}
      </ul>
    </div>
  );
}
