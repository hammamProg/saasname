"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon } from "lucide-react";
import type { GoogleOAuthGuideStep } from "@/libs/google-oauth-guide-types";
import { cn } from "@/libs/cn";

type Props = {
  steps: GoogleOAuthGuideStep[];
  title?: string;
  subtitle?: string;
  className?: string;
  onComplete?: () => void;
  completeLabel?: string;
  renderExtra?: (step: GoogleOAuthGuideStep) => React.ReactNode;
};

export function GoogleOAuthGuideWizard({
  steps,
  title,
  subtitle,
  className,
  onComplete,
  completeLabel = "Finish",
  renderExtra,
}: Props) {
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const current = steps[index];
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  if (!current) return null;

  const filename = current.image?.split("/").pop();

  return (
    <WizardSlide
      key={current.id}
      step={current}
      filename={filename}
      title={title}
      subtitle={subtitle}
      className={className}
      progress={progress}
      index={index}
      total={total}
      isFirst={isFirst}
      isLast={isLast}
      completeLabel={completeLabel}
      renderExtra={renderExtra}
      onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
      onNext={() => setIndex((i) => Math.min(total - 1, i + 1))}
      onComplete={onComplete}
    />
  );
}

type SlideProps = {
  step: GoogleOAuthGuideStep;
  filename?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  progress: number;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  completeLabel: string;
  renderExtra?: (step: GoogleOAuthGuideStep) => React.ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  onComplete?: () => void;
};

function WizardSlide({
  step,
  filename,
  title,
  subtitle,
  className,
  progress,
  index,
  total,
  isFirst,
  isLast,
  completeLabel,
  renderExtra,
  onPrevious,
  onNext,
  onComplete,
}: SlideProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 sm:p-5", className)}>
      {(title || subtitle) && (
        <div className="mb-4 space-y-1">
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>{progress}% complete</span>
          <span>
            {index + 1} / {total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">{step.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.caption}</p>
          </div>
          {step.link && (
            <a
              href={step.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {renderExtra?.(step)}

        {step.image ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            {imageError ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <ImageIcon size={32} className="text-slate-300" />
                <p className="text-xs font-medium text-slate-500">Screenshot placeholder</p>
                {filename && <p className="font-mono text-xs text-slate-400">{filename}</p>}
              </div>
            ) : (
              <Image
                src={step.image}
                alt={step.imageAlt ?? step.title}
                width={960}
                height={540}
                className="h-auto w-full object-cover object-top"
                sizes="(max-width: 768px) 100vw, 640px"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {completeLabel}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Next
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
