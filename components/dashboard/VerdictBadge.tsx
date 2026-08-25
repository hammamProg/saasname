import { AlertTriangle, CircleHelp, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/libs/cn";
import type { Verdict } from "@/libs/scoring/verdict";

/** `unknown` is deliberately not on the clear/contested/blocked colour scale.
 *  It renders in a flat neutral grey so a check that failed can never be
 *  mistaken at a glance for one that passed. */
const STYLES: Record<Verdict, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  clear: {
    label: "Looks clear",
    className: "border-verdict-clear/30 bg-verdict-clear/10 text-verdict-clear",
    Icon: ShieldCheck,
  },
  contested: {
    label: "Contested",
    className: "border-verdict-contested/30 bg-verdict-contested/10 text-verdict-contested",
    Icon: AlertTriangle,
  },
  blocked: {
    label: "Blocked",
    className: "border-verdict-blocked/30 bg-verdict-blocked/10 text-verdict-blocked",
    Icon: ShieldX,
  },
  unknown: {
    label: "Could not confirm",
    className: "border-border bg-surface text-verdict-unknown",
    Icon: CircleHelp,
  },
};

export default function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const { label, className, Icon } = STYLES[verdict];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className
      )}
    >
      <Icon size={size === "sm" ? 11 : 13} aria-hidden="true" />
      {label}
    </span>
  );
}
