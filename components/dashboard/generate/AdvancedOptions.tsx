"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { AndroidIcon, AppleIcon } from "@/components/icons/BrandIcons";
import { type TargetPlatform } from "@/libs/names/generate";
import { cn } from "@/libs/cn";

/** The surfaces a user picks from. `cross` is not offered directly -- it is
 *  what any multi-surface selection resolves to. */
export const PLATFORM_CHOICES = [
  { id: "web", label: "Web", Icon: Globe },
  { id: "ios", label: "iOS", Icon: AppleIcon },
  { id: "android", label: "Android", Icon: AndroidIcon },
] as const;

export type PlatformChoice = (typeof PLATFORM_CHOICES)[number]["id"];

/** Maps the checklist onto the single enum the API and the scoring weights
 *  speak. One surface keeps that surface's weighting; two or more resolve to
 *  `cross`, the balanced profile. Picking iOS + Android and getting `cross`
 *  counts web signals a little more heavily than strictly necessary -- it errs
 *  toward more evidence, never toward a false "clear". */
export function resolveTargetPlatform(
  selected: Set<PlatformChoice>
): TargetPlatform {
  if (selected.size === 1) {
    return [...selected][0] as TargetPlatform;
  }
  return "cross";
}

export function PlatformChecklist({
  selected,
  onToggle,
}: {
  selected: Set<PlatformChoice>;
  onToggle: (id: PlatformChoice) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">Where will it live?</legend>

      <div className="grid gap-2 sm:grid-cols-3" role="group">
        {PLATFORM_CHOICES.map((choice) => {
          const checked = selected.has(choice.id);

          return (
            <button
              key={choice.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onToggle(choice.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all",
                checked
                  ? "border-primary/50 bg-primary-soft text-primary shadow-sm"
                  : "border-border bg-surface text-muted hover:border-primary/25 hover:text-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors",
                  checked
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card"
                )}
              >
                {checked && <Check size={12} strokeWidth={3.5} />}
              </span>
              <choice.Icon size={16} className="shrink-0" />
              <span>{choice.label}</span>
            </button>
          );
        })}
      </div>

      {selected.size === 0 && (
        <p className="text-xs font-medium text-verdict-blocked">
          Pick at least one — it decides how much each source counts.
        </p>
      )}
    </fieldset>
  );
}

/** Collapses the platform choice out of the primary path.
 *
 *  It defaults to Web and most users never change it, so it earns a disclosure
 *  rather than a permanent slot above the submit button. `open` when nothing is
 *  selected, so the blocking validation message can never hide inside a
 *  collapsed section. */
export default function AdvancedOptions({
  selected,
  onToggle,
}: {
  selected: Set<PlatformChoice>;
  onToggle: (id: PlatformChoice) => void;
}) {
  return (
    <details open={selected.size === 0} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground">
        <ChevronDown
          size={15}
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
        />
        Advanced
      </summary>

      <div className="pt-4">
        <PlatformChecklist selected={selected} onToggle={onToggle} />
      </div>
    </details>
  );
}
