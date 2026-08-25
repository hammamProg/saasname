"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyFieldProps = {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  secret?: boolean;
  masked?: boolean;
};

export function CopyField({ label, value, hint, mono = true, secret = false, masked = false }: CopyFieldProps) {
  const isMasked = secret || masked;
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!isMasked);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = revealed ? value : "••••••••••••••••";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-1 break-all text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>
            {displayValue}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          {isMasked && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {revealed ? "Hide" : "Show"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            title="Copy"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
