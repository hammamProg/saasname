"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import apiClient from "@/libs/api";
import {
  getEffectivePaddlePlans,
  PADDLE_BILLING_FREQUENCY_MAX,
  PADDLE_BILLING_FREQUENCY_MIN,
  PADDLE_PLAN_DESCRIPTION_MAX,
  PADDLE_PLAN_NAME_MAX,
  PADDLE_PLANS_MAX,
  PADDLE_PRICE_USD_MAX,
  PADDLE_PRICE_USD_MIN,
  PADDLE_TRIAL_FREQUENCY_MAX,
  PADDLE_TRIAL_FREQUENCY_MIN,
  planEnvKeyForName,
  type PaddleBillingInterval,
  type PaddleTrialKind,
  type ProjectPaddlePlan,
} from "@/libs/paddle-plans";
import type { Project } from "@/libs/projects";

type TrialKindOption = "none" | PaddleTrialKind;

type EditablePlan = {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
  billingFrequency: string;
  billingInterval: PaddleBillingInterval;
  trialKind: TrialKindOption;
  trialFrequency: string;
  trialInterval: PaddleBillingInterval;
  trialPriceUsd: string;
};

const INTERVAL_OPTIONS: PaddleBillingInterval[] = ["day", "week", "month", "year"];

const TRIAL_KIND_OPTIONS: { value: TrialKindOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "free", label: "Free trial" },
  { value: "paid", label: "Paid trial" },
  { value: "cardless", label: "Cardless trial" },
];

type Props = {
  project: Project;
  onProjectUpdated: (project: Project) => void;
};

function toEditable(plan: ProjectPaddlePlan): EditablePlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceUsd: String(plan.priceUsd),
    billingFrequency: String(plan.billingCycle.frequency),
    billingInterval: plan.billingCycle.interval,
    trialKind: plan.trial?.kind ?? "none",
    trialFrequency: String(plan.trial?.frequency ?? 7),
    trialInterval: plan.trial?.interval ?? "day",
    trialPriceUsd: plan.trial?.priceUsd != null ? String(plan.trial.priceUsd) : "1",
  };
}

function defaultEditableRow(index: number): EditablePlan {
  return {
    id: nextPlanId(index),
    name: "",
    description: "",
    priceUsd: "79",
    billingFrequency: "1",
    billingInterval: "month",
    trialKind: "none",
    trialFrequency: "7",
    trialInterval: "day",
    trialPriceUsd: "1",
  };
}

function nextPlanId(index: number): string {
  return `plan-${Date.now()}-${index}`;
}

export function PaddlePlanEditor({ project, onProjectUpdated }: Props) {
  const effective = useMemo(
    () => getEffectivePaddlePlans(project.paddle_plans),
    [project.paddle_plans]
  );

  const [rows, setRows] = useState<EditablePlan[]>(() => effective.map(toEditable));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRows(getEffectivePaddlePlans(project.paddle_plans).map(toEditable));
  }, [project.id, project.paddle_plans]);

  function updateRow(index: number, patch: Partial<EditablePlan>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSaved(false);
  }

  function addRow() {
    if (rows.length >= PADDLE_PLANS_MAX) return;
    setRows((prev) => [...prev, defaultEditableRow(prev.length)]);
    setSaved(false);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function savePlans() {
    setBusy(true);
    setError(null);
    setSaved(false);

    const payload = rows.map((row, index) => {
      const name = row.name.trim();
      const description = row.description.trim();
      const priceUsd = Number.parseFloat(row.priceUsd);
      const billingFrequency = Number.parseInt(row.billingFrequency, 10);
      const trialFrequency = Number.parseInt(row.trialFrequency, 10);
      const trialPriceUsd = Number.parseFloat(row.trialPriceUsd);

      const trial =
        row.trialKind === "none"
          ? null
          : row.trialKind === "paid"
            ? {
                kind: "paid" as const,
                interval: row.trialInterval,
                frequency: trialFrequency,
                priceUsd: trialPriceUsd,
              }
            : {
                kind: row.trialKind,
                interval: row.trialInterval,
                frequency: trialFrequency,
              };

      return {
        id: row.id.trim() || `plan-${index + 1}`,
        name,
        description: description || undefined,
        priceUsd,
        envKey: planEnvKeyForName(name, index),
        priceId: null,
        billingCycle: {
          interval: row.billingInterval,
          frequency: billingFrequency,
        },
        trial,
      };
    });

    try {
      const res = await apiClient.patch<{ data: Project }>(`/projects/${project.id}`, {
        paddle_plans: payload,
      });
      onProjectUpdated(res.data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save billing plans");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Billing plans</p>
        <p className="mt-1 text-xs text-slate-600">
          Customize plan names, recurring billing periods, optional trials, and prices before
          provisioning Paddle (max {PADDLE_PLANS_MAX} plans).
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
          >
            <label className="block text-sm sm:col-span-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Name</span>
              <input
                value={row.name}
                maxLength={PADDLE_PLAN_NAME_MAX}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Starter"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Recurring price (USD)
              </span>
              <input
                type="number"
                min={PADDLE_PRICE_USD_MIN}
                max={PADDLE_PRICE_USD_MAX}
                step="0.01"
                value={row.priceUsd}
                onChange={(e) => updateRow(index, { priceUsd: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Description (optional)
              </span>
              <input
                value={row.description}
                maxLength={PADDLE_PLAN_DESCRIPTION_MAX}
                onChange={(e) => updateRow(index, { description: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
  
              placeholder="Short plan description"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Billing frequency
                </span>
                <input
                  type="number"
                  min={PADDLE_BILLING_FREQUENCY_MIN}
                  max={PADDLE_BILLING_FREQUENCY_MAX}
                  step="1"
                  value={row.billingFrequency}
                  onChange={(e) => updateRow(index, { billingFrequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Billing interval
                </span>
                <select
                  value={row.billingInterval}
                  onChange={(e) =>
                    updateRow(index, {
                      billingInterval: e.target.value as PaddleBillingInterval,
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {INTERVAL_OPTIONS.map((interval) => (
                    <option key={interval} value={interval}>
                      {interval}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm lg:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Trial</span>
                <select
                  value={row.trialKind}
                  onChange={(e) =>
                    updateRow(index, { trialKind: e.target.value as TrialKindOption })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {TRIAL_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {row.trialKind !== "none" && (
                <>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Trial frequency
                    </span>
                    <input
                      type="number"
                      min={PADDLE_TRIAL_FREQUENCY_MIN}
                      max={PADDLE_TRIAL_FREQUENCY_MAX}
                      step="1"
                      value={row.trialFrequency}
                      onChange={(e) => updateRow(index, { trialFrequency: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Trial interval
                    </span>
                    <select
                      value={row.trialInterval}
                      onChange={(e) =>
                        updateRow(index, {
                          trialInterval: e.target.value as PaddleBillingInterval,
                        })
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {INTERVAL_OPTIONS.map((interval) => (
                        <option key={interval} value={interval}>
                          {interval}
                        </option>
                      ))}
                    </select>
                  </label>
                  {row.trialKind === "paid" && (
                    <label className="block text-sm lg:col-span-4">
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Trial price (USD)
                      </span>
                      <input
                        type="number"
                        min={PADDLE_PRICE_USD_MIN}
                        max={PADDLE_PRICE_USD_MAX}
                        step="0.01"
                        value={row.trialPriceUsd}
                        onChange={(e) => updateRow(index, { trialPriceUsd: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
                      />
                    </label>
                  )}
                </>
              )}
            </div>

            {row.trialKind !== "none" && (
              <p className="text-xs text-slate-600">
                Free trials require a payment method on file with no upfront charge. Paid trials
                charge a reduced amount during the trial. Cardless trials grant access without
                collecting a card upfront (see Paddle recurring price trial_period docs).
              </p>
            )}

            <div className="flex items-end justify-end sm:col-span-4">
              <button
                type="button"
                disabled={rows.length <= 1}
                onClick={() => removeRow(index)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:opacity-40"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={rows.length >= PADDLE_PLANS_MAX}
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          <Plus size={14} />
          Add plan
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void savePlans()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save plans
        </button>
        {saved && <span className="text-sm text-emerald-700">Plans saved</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
