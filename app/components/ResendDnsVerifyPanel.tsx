"use client";

import type { ResendDnsRecord } from "@/libs/projects";
import { CopyField } from "./CopyField";

type Props = {
  domain: string;
  dnsRecords: ResendDnsRecord[];
  domainStatus?: string | null;
};

function recordLabel(record: ResendDnsRecord, index: number): string {
  const kind = record.record?.trim() || record.type;
  return kind ? `${kind} record` : `DNS record ${index + 1}`;
}

function statusTone(status?: string): string {
  const value = status?.toLowerCase() ?? "";
  if (value.includes("verified") || value === "valid") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (value.includes("fail") || value.includes("invalid")) {
    return "bg-red-100 text-red-800";
  }
  return "bg-amber-100 text-amber-900";
}

export function ResendDnsVerifyPanel({ domain, dnsRecords, domainStatus }: Props) {
  if (dnsRecords.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Resend did not return DNS records yet. Open the{" "}
        <a href="https://resend.com/domains" className="font-medium underline" target="_blank" rel="noopener noreferrer">
          Resend dashboard
        </a>{" "}
        to copy them for <span className="font-mono">{domain}</span>.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          Verify DNS — add {dnsRecords.length} record{dnsRecords.length === 1 ? "" : "s"} at your registrar
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Copy each record below into Dynadot (or your DNS provider) for{" "}
          <span className="font-mono text-slate-800">{domain}</span>, wait a few minutes for
          propagation, then click <strong>Verify DNS records</strong>.
        </p>
        {domainStatus && (
          <p className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
            <span className={statusTone(domainStatus)}>Domain status: {domainStatus}</span>
          </p>
        )}
      </div>

      <ol className="space-y-3">
        {dnsRecords.map((record, index) => (
          <li
            key={`${record.type}-${record.name}-${index}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-slate-900">{recordLabel(record, index)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {record.type}
              </span>
              {record.status && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(record.status)}`}>
                  {record.status}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <CopyField label="Host / Name" value={record.name} hint="Paste into the name/host field." />
              <CopyField
                label="Value / Content"
                value={record.value}
                hint={record.priority != null ? `Priority: ${record.priority}` : "Paste into the value/content field."}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
