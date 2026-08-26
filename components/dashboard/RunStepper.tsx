import { cn } from "@/libs/cn";

export type RunStep = "idea" | "generating" | "select" | "checking" | "done";

const FLOW: Record<"generate" | "check", RunStep[]> = {
  generate: ["idea", "generating", "select", "checking"],
  // Naming and shortlisting never run for a pasted name; showing them would
  // misstate where the user is.
  check: ["idea", "checking"],
};

const LABELS: Record<RunStep, string> = {
  idea: "Your idea",
  generating: "Naming your idea",
  select: "Choose what to check",
  checking: "Checking every source",
  done: "Done",
};

/**
 * A one-line header for the step that is currently on screen.
 *
 * Deliberately not a five-chip rail: the rail was on the page before anything
 * had started, competing with the form for attention and describing four steps
 * that had not happened. Each panel now states only where you are.
 */
export default function StepHeader({
  step,
  mode,
  className,
}: {
  step: RunStep;
  mode: "generate" | "check";
  className?: string;
}) {
  const flow = FLOW[mode];
  const index = flow.indexOf(step);

  if (index < 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold">{LABELS[step]}</p>
        <p className="text-xs font-medium tabular-nums text-muted">
          Step {index + 1} of {flow.length}
        </p>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {flow.map((id, position) => (
          <span
            key={id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              position < index
                ? "bg-verdict-clear/60"
                : position === index
                  ? "bg-primary"
                  : "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
