"use client";

import { Check } from "lucide-react";
import { cn } from "@/libs/cn";
import type { GeneratedCandidate } from "@/libs/names/generate";

type CandidateListProps = {
  candidates: GeneratedCandidate[];
  /** Normalized names currently chosen for checking. */
  selected: Set<string>;
  onToggle: (normalizedName: string) => void;
};

export default function CandidateList({
  candidates,
  selected,
  onToggle,
}: CandidateListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {candidates.map((candidate) => {
        const isSelected = selected.has(candidate.normalizedName);

        return (
          <li key={candidate.normalizedName}>
            <button
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggle(candidate.normalizedName)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-5 text-left transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary-soft/40"
                  : "border-border bg-card hover:border-primary/25"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface"
                )}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold tracking-tight">
                  {candidate.name}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {candidate.rationale}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
