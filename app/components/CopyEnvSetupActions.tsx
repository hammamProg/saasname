"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Project } from "@/libs/projects";
import {
  buildProjectEnvFile,
  countReadyEnvEntries,
} from "@/libs/project-env-file";
import { CopyField } from "./CopyField";

type Props = {
  project: Project;
};

export function CopyEnvSetupActions({ project }: Props) {
  const envFile = useMemo(() => buildProjectEnvFile(project), [project]);
  const counts = useMemo(() => countReadyEnvEntries(project), [project]);
  const [copiedFull, setCopiedFull] = useState(false);

  const entriesBySection = useMemo(() => {
    const map = new Map<string, (typeof envFile.entries)[number][]>();
    for (const entry of envFile.entries) {
      const list = map.get(entry.section) ?? [];
      list.push(entry);
      map.set(entry.section, list);
    }
    return map;
  }, [envFile.entries]);

  async function copyFullEnv() {
    await navigator.clipboard.writeText(envFile.content);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-border bg-surface/70 p-4">
        <p className="text-sm font-semibold text-foreground">
          {counts.ready}/{counts.total} variables ready
        </p>
        <p className="mt-1 text-xs text-muted">
          Values come from completed setup steps and ShipNow project settings.
        </p>
      </div>

      {envFile.missingSections.length > 0 ? (
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/30"
          role="alert"
        >
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Complete these sections first
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-amber-900/90 dark:text-amber-200/90">
            {envFile.missingSections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Full {project.slug}/.env.local
          </p>
          <button
            type="button"
            onClick={() => void copyFullEnv()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
          >
            {copiedFull ? (
              <Check size={14} className="text-primary" aria-hidden />
            ) : (
              <Copy size={14} aria-hidden />
            )}
            {copiedFull ? "Copied" : "Copy full .env.local"}
          </button>
        </div>
        <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-950/95 p-4 text-xs leading-relaxed text-slate-100">
          {envFile.content}
        </pre>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Copy by section</p>
        {Array.from(entriesBySection.entries()).map(([section, entries]) => (
          <div key={section} className="space-y-2">
            <p className="text-sm font-semibold text-foreground/90">{section}</p>
            <div className="space-y-2">
              {entries.map((entry) => (
                <CopyField
                  key={entry.key}
                  label={entry.key}
                  value={entry.value}
                  hint={entry.hint}
                  secret={entry.secret}
                  masked={entry.secret}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
