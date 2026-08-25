"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buildPaddleEnvFile, type ProjectPaddlePlan } from "@/libs/paddle-plans";

type Props = {
  env: "sandbox" | "production";
  clientToken: string | null;
  apiKey: string | null;
  webhookSecret: string | null;
  plans: ProjectPaddlePlan[];
};

export function CopyEnvButton({ env, clientToken, apiKey, webhookSecret, plans }: Props) {
  const [copied, setCopied] = useState(false);

  const envBlock = buildPaddleEnvFile({
    env,
    clientToken,
    apiKey,
    webhookSecret,
    plans,
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(envBlock);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
      {copied ? "Copied .env block" : "Copy full .env block"}
    </button>
  );
}
