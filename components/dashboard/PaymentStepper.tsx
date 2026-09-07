import { cn } from "@/libs/cn";
import { Check, CreditCard, Rocket, User } from "lucide-react";

type Step = {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "complete" | "current" | "upcoming";
};

type PaymentStepperProps = {
  phase: "idle" | "activating" | "success" | "pending";
  className?: string;
};

export default function PaymentStepper({ phase, className }: PaymentStepperProps) {
  const checkoutStep: Step["status"] =
    phase === "activating" || phase === "success" || phase === "pending" ? "complete" : "current";

  const activateStep: Step["status"] =
    phase === "activating"
      ? "current"
      : phase === "success" || phase === "pending"
        ? "complete"
        : "upcoming";

  const launchStep: Step["status"] = phase === "success" ? "current" : "upcoming";

  const steps: Step[] = [
    { id: "account", label: "Account", icon: <User size={14} />, status: "complete" },
    { id: "plan", label: "Choose plan", icon: <CreditCard size={14} />, status: checkoutStep },
    { id: "pay", label: "Checkout", icon: <CreditCard size={14} />, status: activateStep },
    { id: "launch", label: "Launchpad", icon: <Rocket size={14} />, status: launchStep },
  ];

  return (
    <ol className={cn("flex flex-wrap gap-2 sm:gap-3", className)}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            step.status === "complete" && "border-success/30 bg-success-soft text-success",
            step.status === "current" && "border-primary/30 bg-primary-soft text-primary",
            step.status === "upcoming" && "border-border bg-surface text-muted"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              step.status === "complete" && "bg-success text-white",
              step.status === "current" && "bg-primary text-white",
              step.status === "upcoming" && "bg-border text-muted"
            )}
          >
            {step.status === "complete" ? <Check size={12} strokeWidth={3} /> : step.icon}
          </span>
          {step.label}
          {index < steps.length - 1 && (
            <span className="hidden text-muted sm:inline" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
