import { Check, Loader2 } from "lucide-react";
import { cn } from "@/libs/cn";

export type RunStep = "idea" | "generating" | "select" | "checking" | "done";

const STEPS: Array<{ id: RunStep; label: string }> = [
  { id: "idea", label: "Your idea" },
  { id: "generating", label: "Naming" },
  { id: "select", label: "Shortlist" },
  { id: "checking", label: "Checking" },
  { id: "done", label: "Verdict" },
];

/** Direct checks skip naming and shortlisting entirely; showing steps that
 *  will never run would misrepresent where the user is. */
const DIRECT_STEPS: RunStep[] = ["idea", "checking", "done"];

export default function RunStepper({
  current,
  direct = false,
}: {
  current: RunStep;
  direct?: boolean;
}) {
  const steps = direct
    ? STEPS.filter((step) => DIRECT_STEPS.includes(step.id))
    : STEPS;
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                state === "active"
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : state === "done"
                    ? "border-verdict-clear/30 bg-verdict-clear/10 text-verdict-clear"
                    : "border-border bg-surface text-muted"
              )}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {state === "done" ? (
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                ) : state === "active" && current !== "done" ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <span className="text-[10px] tabular-nums">{index + 1}</span>
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </div>

            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px min-w-2 flex-1 transition-colors",
                  index < currentIndex ? "bg-verdict-clear/40" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
