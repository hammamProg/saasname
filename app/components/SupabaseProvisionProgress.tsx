import { Check, Loader2 } from "lucide-react";
import type { SupabaseProvisionStep } from "@/libs/composio-supabase-provision";

export type SetupProgressStepStatus = "pending" | "running" | "done" | "skipped" | "error";

export type SetupProgressStep = {
  id: string;
  label: string;
  status: SetupProgressStepStatus;
  detail?: string;
};

type Props = {
  steps: SetupProgressStep[];
  open: boolean;
  title?: string;
};

function statusIcon(status: SetupProgressStep["status"]) {
  if (status === "running") {
    return <Loader2 size={14} className="animate-spin text-primary" />;
  }
  if (status === "done" || status === "skipped") {
    return <Check size={14} className="text-emerald-600" />;
  }
  if (status === "error") {
    return <span className="text-xs font-bold text-red-600">!</span>;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />;
}

export function SupabaseProvisionProgress({
  steps,
  open,
  title = "Provisioning",
}: Props) {
  if (!open) return null;

  const visible = steps.filter((step) => step.id !== "done");

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <ul className="space-y-2">
        {visible.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              {statusIcon(step.status)}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={
                  step.status === "error"
                    ? "font-medium text-red-700"
                    : step.status === "running"
                      ? "font-medium text-slate-900"
                      : "text-slate-700"
                }
              >
                {step.label}
              </p>
              {step.detail && (
                <p
                  className={
                    step.status === "error"
                      ? "mt-0.5 text-xs text-red-600"
                      : "mt-0.5 text-xs text-slate-500"
                  }
                >
                  {step.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SUPABASE_PROVISION_STEP_LABELS = [
  "Verify Supabase connection",
  "Resolve organization",
  "Check existing project",
  "Create Supabase project",
  "Wait for project to be ready",
  "Fetch API keys",
  "Configure Email + Google auth",
] as const;

export function initialProvisionSteps(): SupabaseProvisionStep[] {
  return [
    { id: "verify", label: "Verify Supabase connection", status: "pending" },
    { id: "resolve_org", label: "Resolve organization", status: "pending" },
    { id: "check_remote", label: "Check existing project", status: "pending" },
    { id: "create", label: "Create Supabase project", status: "pending" },
    { id: "provision", label: "Wait for project to be ready", status: "pending" },
    { id: "keys", label: "Fetch API keys", status: "pending" },
    { id: "auth", label: "Configure Email + Google auth", status: "pending" },
    { id: "done", label: "Complete", status: "pending" },
  ];
}

export function runningProvisionSteps(): SupabaseProvisionStep[] {
  const steps = initialProvisionSteps();
  steps[0] = { ...steps[0], status: "running" };
  return steps;
}
