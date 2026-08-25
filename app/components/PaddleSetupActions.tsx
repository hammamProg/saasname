"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, Loader2, Plug, RefreshCw } from "lucide-react";
import apiClient from "@/libs/api";
import { formatPlanBillingSummary, getEffectivePaddlePlans } from "@/libs/paddle-plans";
import { inferPaddleEnvFromClientToken } from "@/libs/paddle-setup-plans";
import type { Project } from "@/libs/projects";
import {
  buildPaddleWebhookUrl,
  isLocalWebhookBase,
} from "@/libs/paddle-webhook-url";
import { CopyEnvButton } from "./CopyEnvButton";
import { CopyField } from "./CopyField";
import { PaddlePlanEditor } from "./PaddlePlanEditor";

type WebhookMode = "ngrok" | "custom";

type NgrokTunnel = {
  id: string;
  publicUrl: string;
  label: string;
  proto?: string;
};

type Props = {
  project: Project;
  paddleConnected: boolean;
  ngrokConnected: boolean;
  integrationsLoading: boolean;
  onProjectUpdated: (project: Project) => void;
};

export function PaddleSetupActions({
  project,
  paddleConnected,
  ngrokConnected,
  integrationsLoading,
  onProjectUpdated,
}: Props) {
  const [webhookMode, setWebhookMode] = useState<WebhookMode>(
    ngrokConnected ? "ngrok" : "custom"
  );
  const [customBaseUrl, setCustomBaseUrl] = useState(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""
  );
  const [selectedTunnelId, setSelectedTunnelId] = useState("");
  const [tunnels, setTunnels] = useState<NgrokTunnel[]>([]);
  const [tunnelsLoading, setTunnelsLoading] = useState(false);
  const [tunnelsError, setTunnelsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provisioned = Boolean(project.paddle_provisioned);
  const paddleEnv =
    project.paddle_client_token != null
      ? inferPaddleEnvFromClientToken(project.paddle_client_token)
      : "sandbox";

  const effectivePlans = useMemo(
    () => getEffectivePaddlePlans(project.paddle_plans),
    [project.paddle_plans]
  );

  const planSummary = effectivePlans.map((plan) => formatPlanBillingSummary(plan)).join(" · ");

  const provisionedPlans = useMemo(
    () => getEffectivePaddlePlans(project.paddle_plans),
    [project.paddle_plans]
  );

  const selectedTunnel = tunnels.find((t) => t.id === selectedTunnelId);
  const webhookBaseUrl =
    webhookMode === "ngrok"
      ? (selectedTunnel?.publicUrl ?? "")
      : customBaseUrl.trim();

  const webhookPreviewUrl = webhookBaseUrl
    ? buildPaddleWebhookUrl(webhookBaseUrl)
    : "";

  const webhookBaseInvalid =
    Boolean(webhookBaseUrl) && isLocalWebhookBase(webhookBaseUrl);

  const canProvision =
    paddleConnected &&
    Boolean(webhookBaseUrl) &&
    !webhookBaseInvalid &&
    (webhookMode !== "ngrok" || Boolean(selectedTunnelId));

  async function loadTunnels() {
    setTunnelsLoading(true);
    setTunnelsError(null);
    try {
      const response = await fetch("/api/integrations/ngrok/tunnels");
      const data = (await response.json()) as {
        tunnels?: NgrokTunnel[];
        error?: string;
      };
      if (!response.ok) {
        setTunnelsError(data.error ?? "Could not load ngrok tunnels");
        setTunnels([]);
        return;
      }
      const next = data.tunnels ?? [];
      setTunnels(next);
      if (next.length === 1) {
        setSelectedTunnelId(next[0].id);
      } else if (!next.some((t) => t.id === selectedTunnelId)) {
        setSelectedTunnelId("");
      }
    } catch {
      setTunnelsError("Could not load ngrok tunnels");
      setTunnels([]);
    } finally {
      setTunnelsLoading(false);
    }
  }

  useEffect(() => {
    if (webhookMode === "ngrok" && ngrokConnected && !provisioned) {
      void loadTunnels();
    }
  }, [webhookMode, ngrokConnected, provisioned]);

  async function provisionPaddle() {
    setBusy(true);
    setError(null);
    try {
      const plans = getEffectivePaddlePlans(project.paddle_plans).map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        priceUsd: plan.priceUsd,
        envKey: plan.envKey,
        priceId: null,
        billingCycle: plan.billingCycle,
        trial: plan.trial,
      }));
      const res = await apiClient.post<{ data: Project }>(
        `/projects/${project.id}/paddle/provision`,
        { webhook_base_url: webhookBaseUrl, paddle_plans: plans }
      );
      onProjectUpdated(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set up Paddle billing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 space-y-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Paddle billing</p>
        <p className="mt-1 text-sm text-slate-600">
          Creates subscription products with your configured billing periods and optional trials
          ({planSummary}), plus a checkout client token and webhook destination via your connected Paddle account.
        </p>
      </div>

      {!provisioned && (
        <PaddlePlanEditor project={project} onProjectUpdated={onProjectUpdated} />
      )}

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {provisioned ? "1" : "2"} · Connect Paddle
        </p>
        {integrationsLoading ? (
          <p className="text-sm text-slate-500">Checking integration status…</p>
        ) : paddleConnected ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <Check size={14} />
            Paddle connected via Nango
          </p>
        ) : (
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Plug size={16} />
            Connect Paddle
          </Link>
        )}
      </section>

      {!provisioned && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            3 · Webhook destination
          </p>
          <p className="text-sm text-slate-600">
            Paddle must reach a public HTTPS URL. Use an ngrok tunnel for local dev, or your deployed
            site URL in production.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWebhookMode("ngrok")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                webhookMode === "ngrok"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              ngrok tunnel
            </button>
            <button
              type="button"
              onClick={() => setWebhookMode("custom")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                webhookMode === "custom"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Custom URL
            </button>
          </div>

          {webhookMode === "ngrok" ? (
            <div className="space-y-3">
              {integrationsLoading ? (
                <p className="text-sm text-slate-500">Checking ngrok status…</p>
              ) : ngrokConnected ? (
                <>
                  <div className="flex items-end gap-2">
                    <label className="block flex-1 text-sm">
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Active tunnel
                      </span>
                      <select
                        value={selectedTunnelId}
                        onChange={(e) => setSelectedTunnelId(e.target.value)}
                        disabled={tunnelsLoading || tunnels.length === 0}
                        className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                      >
                        <option value="">
                          {tunnelsLoading
                            ? "Loading tunnels…"
                            : tunnels.length === 0
                              ? "No tunnels found — run ngrok http 3000"
                              : "Select a tunnel"}
                        </option>
                        {tunnels.map((tunnel) => (
                          <option key={tunnel.id} value={tunnel.id}>
                            {tunnel.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void loadTunnels()}
                      disabled={tunnelsLoading}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                    >
                      <RefreshCw size={14} className={tunnelsLoading ? "animate-spin" : ""} />
                      Refresh
                    </button>
                  </div>
                  {tunnelsError && <p className="text-sm text-red-600">{tunnelsError}</p>}
                  {!tunnelsLoading && tunnels.length === 0 && !tunnelsError && (
                    <p className="text-xs text-slate-500">
                      Start a tunnel with <code className="rounded bg-slate-200 px-1">ngrok http 3000</code>,
                      then click Refresh.
                    </p>
                  )}
                </>
              ) : (
                <Link
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plug size={16} />
                  Connect ngrok
                </Link>
              )}
            </div>
          ) : (
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Public site URL
              </span>
              <input
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder="https://your-app.vercel.app"
              />
            </label>
          )}

          {webhookBaseInvalid && (
            <p className="text-sm text-red-600">
              localhost cannot receive Paddle webhooks. Use an ngrok tunnel or your deployed site URL.
            </p>
          )}

          {webhookPreviewUrl && !webhookBaseInvalid && (
            <p className="text-xs text-slate-500">
              Webhook URL preview:{" "}
              <span className="font-mono text-slate-700">{webhookPreviewUrl}</span>
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {provisioned ? "2" : "4"} · {provisioned ? "Env vars" : "Create catalog & webhook"}
        </p>
        {provisioned ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <Check size={14} />
              Paddle billing configured
            </p>
            <CopyField
              label="NEXT_PUBLIC_PADDLE_ENV"
              value={paddleEnv}
              hint="Add to .env.local"
            />
            <CopyField
              label="NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"
              value={project.paddle_client_token ?? ""}
              secret
            />
            <CopyField label="PADDLE_API_KEY" value={project.paddle_api_key ?? ""} secret />
            <CopyField
              label="PADDLE_WEBHOOK_SECRET"
              value={project.paddle_webhook_secret ?? ""}
              secret
            />
            {provisionedPlans.map((plan) => (
              <div key={plan.id} className="space-y-1">
                <CopyField label={plan.envKey} value={plan.priceId ?? ""} />
                <p className="text-xs text-slate-500">{formatPlanBillingSummary(plan)}</p>
              </div>
            ))}
            <CopyEnvButton
              env={paddleEnv}
              clientToken={project.paddle_client_token}
              apiKey={project.paddle_api_key}
              webhookSecret={project.paddle_webhook_secret}
              plans={provisionedPlans}
            />
            {project.paddle_webhook_url && (
              <CopyField
                label="Webhook URL (Paddle destination)"
                value={project.paddle_webhook_url}
                hint="Set Checkout → Default payment link to your site URL in Paddle if checkout fails locally."
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || integrationsLoading || !canProvision}
            onClick={() => void provisionPaddle()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            {busy ? "Creating Paddle resources…" : "Set up Paddle billing"}
          </button>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
