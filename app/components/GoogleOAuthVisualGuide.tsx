"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  buildGoogleOAuthGuideSections,
  buildGoogleOAuthUrls,
} from "@/libs/google-oauth-setup-instructions";
import type { GoogleOAuthGuideStep, GoogleOAuthUrls } from "@/libs/google-oauth-guide-types";
import type { Project } from "@/libs/projects";
import config from "@/config";
import { CopyField } from "./CopyField";
import { GoogleOAuthGuideWizard } from "./GoogleOAuthGuideWizard";

type Props = {
  project: Project;
};

function urlHintsForStep(
  step: GoogleOAuthGuideStep,
  urls: GoogleOAuthUrls,
  hasProjectRef: boolean
) {
  if (step.id === "origins") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <CopyField label="JavaScript origin (localhost)" value={urls.localhostOrigin} />
        <CopyField label="JavaScript origin (Supabase)" value={urls.supabaseOrigin} />
      </div>
    );
  }

  if (step.id === "redirects") {
    return (
      <CopyField
        label="Redirect URI"
        value={urls.callbackUrl}
        hint={hasProjectRef ? undefined : "Update after step 2 (Supabase project)."}
      />
    );
  }

  if (step.id === "app-info") {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Need policy URLs later? Generate text from{" "}
        <Link href={config.links.terms} className="font-medium text-primary hover:underline">
          Terms
        </Link>{" "}
        &{" "}
        <Link href={config.links.privacy} className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>{" "}
        prompts.
      </p>
    );
  }

  return null;
}

export function GoogleOAuthVisualGuide({ project }: Props) {
  const [showProduction, setShowProduction] = useState(false);

  const urls = useMemo(
    () => buildGoogleOAuthUrls(project.supabase_project_ref),
    [project.supabase_project_ref]
  );
  const sections = useMemo(() => buildGoogleOAuthGuideSections(urls), [urls]);
  const setupSteps = sections.find((s) => s.id === "setup")?.steps ?? [];
  const productionSteps = sections.find((s) => s.id === "production")?.steps ?? [];
  const hasProjectRef = Boolean(project.supabase_project_ref);

  function scrollToCredentials() {
    document.getElementById("google-oauth-save")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="space-y-4">
      <GoogleOAuthGuideWizard
        steps={setupSteps}
        title={sections[0]?.title}
        subtitle={sections[0]?.summary}
        onComplete={scrollToCredentials}
        completeLabel="Save credentials below"
        renderExtra={(step) => urlHintsForStep(step, urls, hasProjectRef)}
      />

      {!showProduction ? (
        <button
          type="button"
          onClick={() => setShowProduction(true)}
          className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/40 px-4 py-3 text-left text-sm text-amber-950 transition hover:bg-amber-50/70"
        >
          <span className="font-semibold">Going to production?</span>
          <span className="mt-0.5 block text-xs text-amber-900/80">
            Publish with Google, verify domain, configure Supabase URLs — 4 steps
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-amber-900/90">
            Localhost works now. Production shows a warning until Google verifies your app (usually
            a few days). Verify your domain in Google Search Console first.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <CopyField label="Supabase Site URL" value={urls.productionSiteUrl} />
            <CopyField label="Supabase Redirect URL" value={urls.productionRedirectUrl} />
            <CopyField label="Also add" value="http://localhost:3000/**" />
          </div>
          <GoogleOAuthGuideWizard
            steps={productionSteps}
            title="Production checklist"
            subtitle="Before launch — publish, verify, configure URLs."
            completeLabel="Done"
          />
          <button
            type="button"
            onClick={() => setShowProduction(false)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Hide production steps
          </button>
        </div>
      )}
    </div>
  );
}
