"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { Step, StepId } from "@/app/types";
import { cn } from "@/libs/cn";
import { ServiceLogo } from "./ServiceLogo";
import { SETUP_SERVICE_LOGOS } from "@/app/lib/serviceBrands";
import { StepResetButton } from "./StepResetButton";

function CodePreview({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = commands.join("\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative mt-4 overflow-hidden rounded-lg bg-brand-navy">
      <div className="flex items-center justify-between border-b border-white/10 bg-brand-navy/80 px-4 py-2">
        <span className="font-mono text-xs text-white/50">terminal</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="text-xs text-white/50 hover:text-white"
        >
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      <div className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed text-white/85">
        {commands.map((cmd, cmdIdx) => (
          <div key={cmdIdx} className="flex">
            <span className="mr-4 select-none text-white/30">
              {cmd.startsWith("#") ? " " : "$"}
            </span>
            <span>{cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type SetupStepDetailProps = {
  step: Step;
  idx: number;
  isCompleted: boolean;
  isLocked: boolean;
  summary?: string;
  onToggleComplete: (id: StepId) => void;
  onReset?: (id: StepId) => void | Promise<void>;
  canReset?: boolean;
  extraContent?: React.ReactNode;
};

export function SetupStepDetail({
  step,
  idx,
  isCompleted,
  isLocked,
  summary,
  onToggleComplete,
  onReset,
  canReset = false,
  extraContent,
}: SetupStepDetailProps) {
  const badgeLogo = step.badge ? SETUP_SERVICE_LOGOS[step.badge] : step.logoUrl;
  const StepIcon = step.icon;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        isCompleted ? "border-emerald-400" : "border-border"
      )}
    >
      <header className="flex items-start gap-3 border-b border-border/80 px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={() => onToggleComplete(step.id)}
          disabled={isLocked}
          className="mt-1 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed"
          aria-label={isLocked ? "Step completed" : isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {isCompleted ? (
            <CheckCircle2 size={22} className="text-primary" />
          ) : (
            <Circle size={22} className="text-muted hover:text-primary" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Step {idx + 1}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ServiceLogo
              src={badgeLogo ?? step.logoUrl}
              name={step.badge ?? step.title}
              size={36}
              connected={isCompleted}
            />
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{step.title}</h2>
            {step.badge && (
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {step.badge}
              </span>
            )}
            {isCompleted && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Done
              </span>
            )}
          </div>
          {(summary || step.description) && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{summary ?? step.description}</p>
          )}
        </div>

        {canReset && onReset && (
          <StepResetButton stepId={step.id} stepTitle={step.title} onReset={onReset} />
        )}
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-5">
        {extraContent}

        {step.commands && step.commands.length > 0 && (
          <div>
            <CodePreview commands={step.commands} />
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-border bg-surface/80 p-4 sm:p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <StepIcon size={14} className="text-primary" />
            What to do
          </h3>
          {step.instructions.split("\n").map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/85">
              {line}
            </p>
          ))}
        </div>

        {step.links && step.links.length > 0 && !isLocked && (
          <div className="flex flex-wrap gap-2">
            {step.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target={link.url.startsWith("/") ? undefined : "_blank"}
                rel={link.url.startsWith("/") ? undefined : "noopener noreferrer"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary-soft/30"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
