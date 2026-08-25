"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Mail, Plug, RefreshCw } from "lucide-react";
import apiClient from "@/libs/api";
import type { Project } from "@/libs/projects";
import {
  buildResendFromEmail,
  isValidEmail,
  isValidResendDomain,
  normalizeResendDomain,
  RESEND_REGIONS,
  type ResendRegion,
} from "@/libs/resend-domain";
import { CopyField } from "./CopyField";
import { ResendDnsVerifyPanel } from "./ResendDnsVerifyPanel";

type Props = {
  project: Project;
  resendConnected: boolean;
  integrationsLoading: boolean;
  onProjectUpdated: (project: Project) => void;
};

export function ResendEmailSetupActions({
  project,
  resendConnected,
  integrationsLoading,
  onProjectUpdated,
}: Props) {
  const [domain, setDomain] = useState(project.resend_domain ?? "");
  const [region, setRegion] = useState<ResendRegion>(
    (project.resend_region as ResendRegion) || "us-east-1"
  );
  const [fromName, setFromName] = useState(project.resend_from_name ?? project.name);
  const [supportEmail, setSupportEmail] = useState(project.resend_support_email ?? "");
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domainAdded = Boolean(project.resend_domain_added);
  const normalizedDomain = normalizeResendDomain(domain);
  const domainValid = isValidResendDomain(normalizedDomain);
  const fromNameValid = Boolean(fromName.trim());
  const supportEmailValid = isValidEmail(supportEmail);
  const fromEmailPreview = domainValid ? buildResendFromEmail(fromName, domain) : "";
  const canAddDomain =
    resendConnected && domainValid && fromNameValid && supportEmailValid && !domainAdded;
  const dnsRecords = project.resend_dns_records ?? [];
  const savedDomain = project.resend_domain ?? "";

  useEffect(() => {
    setDomain(project.resend_domain ?? "");
    setRegion((project.resend_region as ResendRegion) || "us-east-1");
    setFromName(project.resend_from_name ?? project.name);
    setSupportEmail(project.resend_support_email ?? "");
  }, [
    project.resend_domain,
    project.resend_region,
    project.resend_from_name,
    project.resend_support_email,
    project.name,
  ]);

  async function addDomain() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: Project }>(`/projects/${project.id}/resend/create-domain`, {
        domain: normalizedDomain,
        region,
        from_name: fromName.trim(),
        support_email: supportEmail.trim(),
      });
      onProjectUpdated(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add domain to Resend");
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain() {
    setVerifyBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: Project }>(`/projects/${project.id}/resend/verify-domain`, {});
      onProjectUpdated(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify domain");
    } finally {
      setVerifyBusy(false);
    }
  }

  return (
    <div className="mb-5 space-y-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Resend email service</p>
        <p className="mt-1 text-sm text-slate-600">
          Enter your sending subdomain, connect Resend, register the domain, then copy DNS records
          into your registrar and verify.
        </p>
      </div>
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          1 · Domain &amp; sender
        </p>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-slate-500">Sending domain</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={domainAdded}
              className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm disabled:bg-slate-100"
              placeholder="mail.yourdomain.com"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-slate-500">Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value as ResendRegion)}
            disabled={domainAdded}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-100">
              {RESEND_REGIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-slate-500">From display name</span>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)}
            disabled={domainAdded}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-100" />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-slate-500">Support email</span>
            <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)}
            disabled={domainAdded}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-100" />
          </label>
        {fromEmailPreview && (
          <CopyField label="RESEND_FROM_EMAIL preview" value={fromEmailPreview} hint="Use after verification." />
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2 · Connect Resend</p>
        {integrationsLoading ? (
          <p className="text-sm text-slate-500">Checking integration status…</p>
        ) : resendConnected ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <Check size={14} />
            Resend connected
          </p>
        ) : (
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Plug size={16} />
            Connect Resend
          </Link>
        )}
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3 · Register domain</p>
        {domainAdded ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <Check size={14} />
              Domain registered: {savedDomain}
            </p>
            {project.resend_from_name && savedDomain && (
              <CopyField
                label="RESEND_FROM_EMAIL"
                value={buildResendFromEmail(project.resend_from_name, savedDomain)}
                hint="Add to .env.local."
              />
            )}
            <ResendDnsVerifyPanel
              domain={savedDomain}
              dnsRecords={dnsRecords}
              domainStatus={project.resend_domain_status}
            />
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void verifyDomain()}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              {verifyBusy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Verify DNS records
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || !canAddDomain}
            onClick={() => void addDomain()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Add domain to Resend
          </button>
        )}
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
