"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { StepId } from "@/app/types";
import { getResetStepWarning } from "@/libs/reset-step-messages";

type StepResetButtonProps = {
  stepId: StepId;
  stepTitle: string;
  onReset: (id: StepId) => void | Promise<void>;
};

export function StepResetButton({ stepId, stepTitle, onReset }: StepResetButtonProps) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isResetting) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isResetting]);

  const handleConfirm = async () => {
    setIsResetting(true);
    setError(null);
    try {
      await Promise.resolve(onReset(stepId));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset step");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      >
        <RotateCcw size={12} />
        Reset
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            disabled={isResetting}
            onClick={() => {
              if (!isResetting) setOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reset-step-title-${stepId}`}
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id={`reset-step-title-${stepId}`} className="text-lg font-semibold text-slate-900">
              Reset this step?
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-700">{stepTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {getResetStepWarning(stepId)}
            </p>
            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isResetting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isResetting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isResetting && <Loader2 size={14} className="animate-spin" />}
                Reset step
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
