"use client";

import { Fragment } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { Step, StepId } from "@/app/types";
import type { SetupStepGroup } from "@/libs/setup-step-groups";
import { cn } from "@/libs/cn";
import { ServiceLogo } from "./ServiceLogo";

export type SetupStepNavItem = {
  step: Step;
  idx: number;
  isCompleted: boolean;
  isLocked: boolean;
};

export type SetupStepNavGroup = SetupStepGroup;

type SetupStepNavProps = {
  groups: SetupStepNavGroup[];
  itemsById: Map<StepId, SetupStepNavItem>;
  activeStepId: StepId;
  onSelect: (id: StepId) => void;
};

function StepNavButton({
  item,
  active,
  onSelect,
}: {
  item: SetupStepNavItem;
  active: boolean;
  onSelect: (id: StepId) => void;
}) {
  const { step, idx, isCompleted, isLocked } = item;
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(step.id)}
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex min-w-[10.5rem] shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors lg:min-w-0 lg:w-full",
        isCompleted
          ? active
            ? "border-emerald-500 bg-emerald-50/60 shadow-sm"
            : "border-emerald-400/80 bg-emerald-50/40"
          : active
            ? "border-primary/40 bg-primary-soft/50 shadow-sm"
            : "border-transparent bg-surface/60 hover:border-border hover:bg-surface"
      )}
    >
      <span className="relative shrink-0">
        {step.logoUrl ? (
          <ServiceLogo
            src={step.logoUrl}
            name={step.badge ?? step.title}
            size={32}
            connected={isCompleted ? true : isLocked ? true : false}
            className="rounded-lg"
          />
        ) : (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border",
              isCompleted || isLocked
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-border bg-card text-muted"
            )}
          >
            <Icon size={16} aria-hidden />
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5">
          {isCompleted ? (
            <CheckCircle2 size={12} className="text-primary" aria-hidden />
          ) : (
            <Circle size={12} className="text-muted/60" aria-hidden />
          )}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-muted">Step {idx + 1}</span>
        <span
          className={cn(
            "block truncate text-sm font-semibold",
            active ? "text-foreground" : "text-foreground/80"
          )}
        >
          {step.title.replace(/^\d+\.\s*/, "")}
        </span>
      </span>
    </button>
  );
}

export function SetupStepNav({ groups, itemsById, activeStepId, onSelect }: SetupStepNavProps) {
  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:pb-0 lg:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden lg:[&::-webkit-scrollbar]:block"
      aria-label="Setup steps"
    >
      {groups.map((group) => (
        <Fragment key={group.id}>
          {group.dividerBefore ? (
            <div
              role="separator"
              className="my-1 hidden h-px w-full shrink-0 basis-full border-t border-border lg:block"
            />
          ) : null}

          {group.label ? (
            <p className="hidden shrink-0 basis-full px-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted lg:block">
              {group.label}
            </p>
          ) : null}

          {group.stepIds.map((stepId) => {
            const item = itemsById.get(stepId);
            if (!item) return null;
            return (
              <StepNavButton
                key={stepId}
                item={item}
                active={stepId === activeStepId}
                onSelect={onSelect}
              />
            );
          })}

          {group.dividerAfter ? (
            <div
              role="separator"
              className="my-1 hidden h-px w-full shrink-0 basis-full border-t border-border lg:block"
            />
          ) : null}
        </Fragment>
      ))}
    </nav>
  );
}
